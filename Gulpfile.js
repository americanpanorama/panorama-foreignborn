var gulp             = require('gulp'),
    source           = require('vinyl-source-stream'), // Used to stream bundle for further handling
    browserify       = require('browserify'),
    watchify         = require('watchify'),
    reactify         = require('reactify'),
    gulpif           = require('gulp-if'),
    uglify           = require('gulp-uglify'),
    streamify        = require('gulp-streamify'),
    notify           = require('gulp-notify'),
    concat           = require('gulp-concat'),
    cssmin           = require('gulp-cssmin'),
    gutil            = require('gulp-util'),
    shell            = require('gulp-shell'),
    glob             = require('glob'),
    livereload       = require('gulp-livereload'),
    jasminePhantomJs = require('gulp-jasmine2-phantomjs'),
    copy             = require("gulp-copy"),
    rimraf           = require("rimraf"),
    connect          = require("gulp-connect"),
    sass             = require("gulp-sass");

// External dependencies you do not want to rebundle while developing,
// but include in your application deployment
var dependencies = [
  'react',
  'react-addons',
  'flux-react'
];

function browserifyTask(options) {

  // Our app bundler
  var appBundler = browserify({
    entries: [options.src],     // Only need initial file, browserify finds the rest
    transform: [reactify],      // We want to convert JSX to normal javascript
    debug: options.development, // Gives us sourcemapping
    cache: {}, packageCache: {}, fullPaths: options.development // Requirement of watchify
  });

  // We set our dependencies as externals on our app bundler when developing.
  // You might consider doing this for production also and load two javascript
  // files (main.js and vendors.js), as vendors.js will probably not change and
  // takes full advantage of caching
  appBundler.external(options.development ? dependencies : []);


  // The rebundle process
function rebundle() {
    var start = Date.now();
    console.log('Building APP bundle');
    appBundler.bundle()
      .on('error', gutil.log)
      .pipe(source('main.js'))
      .pipe(gulpif(!options.development, streamify(uglify())))
      .pipe(gulp.dest(options.dest))
      .pipe(gulpif(options.development, livereload()))
      .pipe(notify(function () {
        console.log('APP bundle built in ' + (Date.now() - start) + 'ms');
      }));
  };

  // Fire up Watchify when developing
  if (options.development) {
    appBundler = watchify(appBundler);
    appBundler.on('update', rebundle);
  }

  rebundle();

  // We create a separate bundle for our dependencies as they
  // should not rebundle on file changes. This only happens when
  // we develop. When deploying the dependencies will be included
  // in the application bundle
  if (options.development) {

    var testFiles = glob.sync('./specs/**/*-spec.js');
    var testBundler = browserify({
      entries: testFiles,
      debug: true, // Gives us sourcemapping
      transform: [reactify],
      cache: {}, packageCache: {}, fullPaths: true // Requirement of watchify
    });

    testBundler.external(dependencies);

    var rebundleTests = function () {
      var start = Date.now();
      console.log('Building TEST bundle');
      testBundler.bundle()
      .on('error', gutil.log)
        .pipe(source('specs.js'))
        .pipe(gulp.dest(options.dest))
        .pipe(livereload())
        .pipe(notify(function () {
          console.log('TEST bundle built in ' + (Date.now() - start) + 'ms');
        }));
    };

    testBundler = watchify(testBundler);
    testBundler.on('update', rebundleTests);
    //rebundleTests();

    // Remove react-addons when deploying, as it is only for
    // testing
    if (!options.development) {
      dependencies.splice(dependencies.indexOf('react-addons'), 1);
    }

    var vendorsBundler = browserify({
      debug: true,
      require: dependencies
    });

    // Run the vendor bundle
    var start = new Date();
    console.log('Building VENDORS bundle');
    vendorsBundler.bundle()
      .on('error', gutil.log)
      .pipe(source('vendors.js'))
      .pipe(gulpif(!options.development, streamify(uglify())))
      .pipe(gulp.dest(options.dest))
      .pipe(notify(function () {
        console.log('VENDORS bundle built in ' + (Date.now() - start) + 'ms');
      }));

  }

}

function cssTask(options) {
    if (options.development) {
      var run = function () {
        var start = new Date();
        console.log('Building CSS bundle');
        gulp.src(options.src)
          .pipe(sass())
          .pipe(gulp.dest(options.dest))
          .pipe(notify(function () {
            console.log('CSS bundle built in ' + (Date.now() - start) + 'ms');
          }));
      };
      run();
      gulp.watch(options.src, run);
    } else {
      gulp.src(options.src)
        .pipe(sass())
        .pipe(cssmin())
        .pipe(gulp.dest(options.dest));
    }
}

function copyTask(options) {
  return gulp.src(options.src)
        .pipe(copy(options.dest, {"prefix":1}));
}

function webserverTask(options) {
  return connect.server({
    root: './build/',
    livereload: false,
    port: 8888
  });
}

function staticFolder() {
  return gulp.src("static/**")
  .pipe(copy("build/"));
}

// Starts our development workflow
gulp.task('default', function () {

  rimraf("./build/**", function() {

    copyTask({
      "src"  : "./app/**/*.html",
      "dest" : "./build"
    });

    browserifyTask({
      "development" : true,
      "src"         : './app/main.jsx',
      "dest"        : './build'
    });

    cssTask({
      "development" : true,
      "src"         : './sass/**/*.scss',
      "dest"        : './build'
    });

    webserverTask();

    staticFolder();

  });

});

gulp.task('dist', function () {

  browserifyTask({
    development: false,
    src: './app/main.js',
    dest: './dist'
  });

  cssTask({
    development: false,
    src: './sass/**/*.scss',
    dest: './dist'
  });

});

gulp.task('test', function () {
    return gulp.src('./build/testrunner-phantomjs.html').pipe(jasminePhantomJs());
});