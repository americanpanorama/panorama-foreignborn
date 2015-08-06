/** @jsx React.DOM */
var React   = require('react');
var d3      = require('d3');
var topojson   = require('topojson');

require("d3-geo-projection")(d3);

var width = 960,
    height = 450,
    padding = 0;

var mapContainer, svg, background, lines, counties_nested, countries_nested, sorted;
var canvas, context, canvasPath;
var loupe, loupeSVG, loupeGroup, loupeHeight, loupeWidth;
var selectedCounty;
var countyLookup = {};
var countryLookup = {};
var projections = {};
var worldDirty = true;
var decade;
var countryNodes = {};
var hasData = false;
var clickCallback;


var countryLocations = {};

var colorTable = ["#f6eff7","#d0d1e6","#a6bddb","#67a9cf","#3690c0","#02818a","#016450"];
// based on count
var colorScale = d3.scale.quantile()
  .range(colorTable);

function color(val) {
  return colorScale(val);
}

// based on density
// [0.1, 0.3, 0.5, 0.7, 0.9, 1]
var opacity = d3.scale.sqrt()
  .range([0.1, 0.3, 0.9, 1])
  .domain([0.01, 1, 100, 7000])
  .clamp(true);


var radius = d3.scale.sqrt()
  .range([1,45]);

var projectionParams = {
  asia: {
    centerCoords: [110,20],
    translate: [130, 110],
    scale: 100
  },
  oceania: {
    centerCoords: [150,-30],
    translate: [100, 300],
    scale: 100
  },
  southamerica: {
    centerCoords: [-70,-30],
    translate: [400, 300],
    scale: 100
  },
  centralamerica: {
    centerCoords: [-100,20],
    translate: [250, 300],
    scale: 100
  },
  usa: {
    centerCoords: [-100,35],
    translate: [320, 110],
    scale: 300
  },
  canada: {
    centerCoords: [-100,50],
    translate: [500, 75],
    scale: 100
  },
  africa: {
    centerCoords: [20,0],
    translate: [600, 300],
    scale: 100
  },
  europe: {
    centerCoords: [20,50],
    translate: [600, 100],
    scale: 100
  },
  nullisland: {
    centerCoords: [0,0],
    translate: [700, 100],
    scale: 100
  }
};


function createProjections() {
  //projectionParams.usa.translate = [width/2, height/2];
  // Create a bunch of projections for different continents
  d3.keys(projectionParams).forEach(function(key) {
    var params = projectionParams[key];
    if (key == 'usa') {
      projections[key] = d3.geo.albersUsa()
        .translate(params.translate)
        .scale(params.scale);
    } else {
      projections[key] = d3.geo.azimuthalEqualArea()
        .rotate([-params.centerCoords[0],-params.centerCoords[1]])  //negative numbers to rotate correctly
        .translate(params.translate)
        .scale(params.scale);
    }
  });
}

// ALSO SEE: https://gist.githubusercontent.com/nrabinowitz/1756257/raw/9e31098d064e036b0378a3e16876a4450a854917/fitProjection.js
// AS WELL AS: http://bl.ocks.org/mbostock/4699541
function fitIn(projection, data, size, country) {
  projection
    .scale(1)
    .translate([0, 0]);

  if (country) {
    try {
      projection.centerCoords = projectionParams[country].centerCoords;
    } catch(e) { console.log("ERROR: No centerCoords for -->", country)}
  }

  var path = d3.geo.path().projection(projection);

  var left = Infinity,
      bottom = -Infinity,
      right = -Infinity,
      top = Infinity;

  data.forEach(function(feature) {
    var b = path.bounds(feature);
    left = Math.min(left, b[0][0]);
    top = Math.min(top, b[0][1]);
    right = Math.max(right, b[1][0]);
    bottom = Math.max(bottom, b[1][1]);
  });

  var bounds = [[left,top],[right,bottom]],
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = .9 / Math.max(dx / size[0], dy / size[1]),
        translate = [size[0] / 2 - scale * x, size[1] / 2 - scale * y];

  return [scale, translate];
}

function drawWorld(world) {
  var worldFeatures = topojson.feature(world, world.objects.countries).features;


  // Auto Position countries based on view box
  // TODO: Basically needs more attention and simplification
  var worldGroups = {
    'usa':[],
    'asia': [],
    'africa': [],
    'europe': [],
    'southamerica': [],
    'centralamerica': [],
    'oceania': [],
    'canada': []
  };

  worldFeatures.forEach(function(d) {
    if (d.id == 'USB' || d.id == 'USK' || d.id == 'USH') worldGroups.usa.push(d);
    else if (d.properties.continent == 'Asia') worldGroups.asia.push(d);
    else if (d.properties.continent == 'Africa') worldGroups.africa.push(d);
    else if (d.properties.continent == 'Europe') worldGroups.europe.push(d);
    else if (d.properties.continent == 'South America') worldGroups.southamerica.push(d);
    else if (d.properties.subregion == 'Central America') worldGroups.centralamerica.push(d);
    else if (d.properties.continent == 'Oceania') worldGroups.oceania.push(d);
    else if (d.id == 'CAN')worldGroups.canada.push(d);
  });

  var center = [width/2, height/2];
  var sizeUSA = [(width * .5)/2, (height * .5)/2];
  var sizeCorners = [(width * .25)/2, (height * .5)/2];
  var sizeMiddle = [(width * .25)/2, (height * .25)/2];

  var usa = fitIn(d3.geo.albersUsa(), worldGroups.usa, [sizeUSA[0]*2, sizeUSA[1]*2], 'usa');
  var asia = fitIn(d3.geo.azimuthalEqualArea(), worldGroups.asia, [sizeCorners[0]*2, sizeCorners[1]*2], 'asia');
  var europe = fitIn(d3.geo.azimuthalEqualArea(), worldGroups.europe, [sizeCorners[0]*2, sizeCorners[1]*2], 'europe');
  var africa = fitIn(d3.geo.azimuthalEqualArea(), worldGroups.africa, [sizeCorners[0]*2, sizeCorners[1]*2], 'africa');
  var oceania = fitIn(d3.geo.azimuthalEqualArea(), worldGroups.oceania, [sizeCorners[0]*2, sizeCorners[1]*2], 'oceania');
  var southamerica = fitIn(d3.geo.azimuthalEqualArea(), worldGroups.southamerica, [sizeMiddle[0]*2, sizeMiddle[1]*2], 'southamerica');
  var centralamerica = fitIn(d3.geo.azimuthalEqualArea(), worldGroups.centralamerica, [sizeMiddle[0]*2, sizeMiddle[1]*2], 'centralamerica');
  var canada = fitIn(d3.geo.azimuthalEqualArea(), worldGroups.canada, [sizeMiddle[0]*2, sizeMiddle[1]*2], 'canada');

  projectionParams.asia.scale = asia[0];
  projectionParams.asia.translate = sizeCorners;

  projectionParams.oceania.scale = oceania[0];
  projectionParams.oceania.translate = [sizeCorners[0], height-sizeCorners[1]];

  projectionParams.europe.scale = europe[0];
  projectionParams.europe.translate = [width-sizeCorners[0], sizeCorners[1]];

  projectionParams.africa.scale = africa[0];
  projectionParams.africa.translate = [width-sizeCorners[0], height-sizeCorners[1]];

  projectionParams.southamerica.scale = southamerica[0];
  projectionParams.southamerica.translate = [center[0] + sizeMiddle[0], height - sizeMiddle[1]];

  projectionParams.centralamerica.scale = centralamerica[0];
  projectionParams.centralamerica.translate = [center[0] - sizeMiddle[0], height - sizeMiddle[1]];

  projectionParams.canada.scale = canada[0];
  projectionParams.canada.translate = [center[0] , sizeCorners[1]];

  projectionParams.usa.scale = usa[0];
  projectionParams.usa.translate = center;

  // Update and create projections to use
  // for drawing countries
  createProjections();


  background.selectAll(".land")
    .data(worldFeatures)
  .enter().append("path")
    .attr("class", "land")
    .attr("d", function(d) {

      if (d.id == 'USB' || d.id == 'USK' || d.id == 'USH') return d3.geo.path().projection(projections['usa'])(d);
      else if (d.properties.continent == 'Asia') return d3.geo.path().projection(projections['asia'])(d);
      else if (d.properties.continent == 'Africa') return d3.geo.path().projection(projections['africa'])(d);
      else if (d.properties.continent == 'Europe') return d3.geo.path().projection(projections['europe'])(d);
      else if (d.properties.continent == 'South America') return d3.geo.path().projection(projections['southamerica'])(d);
      else if (d.properties.subregion == 'Central America') return d3.geo.path().projection(projections['centralamerica'])(d);
      else if (d.properties.continent == 'Oceania') return d3.geo.path().projection(projections['oceania'])(d);
      else if (d.id == 'CAN') return d3.geo.path().projection(projections['canada'])(d);
      else return "";
    });
}

function drawCounties(data) {
  //console.log(data[1])
  //svg.selectAll(".county").remove();
  var that = this;
  var t = +new Date();
  var counties = svg.selectAll(".county")
    .data(data, function(d){ return d.properties.id; });

  var values = [];
  var densities = [];
  var maxCount = d3.max(data, function(d){
    values.push(d.properties.count);
    return d.properties.count;
  })
  var maxDensity = d3.max(data, function(d){
    if (densities.indexOf(d.properties.density) < 0) densities.push(d.properties.density);
    return d.properties.density;
  })


  var q = d3.scale.quantile()
    .range([0,1,2,3,4,5,6])
    .domain(values);

  var qd = d3.scale.quantile()
    .range([0,1,2])
    .domain(densities);

  colorScale.domain(q.quantiles());

  var op = qd.quantiles();
  opacity.domain([0.01, 1, op[0], op[1]]);

  //console.log('MM: ', maxCount, maxDensity, qd.quantiles());

  counties.enter().append('path')
    .attr('class', 'county')
    .attr('d', function(d,i){
      return d3.geo.path().projection(projections['usa'])(d.geometry);
    })
    .style('fill', function(d) {
      return color(d.properties.count);
    })
    .style('stroke', function(d) {
      return color(d.properties.count);
    })
    .style("opacity", function(d) {
      return opacity(d.properties.density);
    })
    .on('click', function(d){
      clickCallback(d);
    });

  counties.exit().remove();


  if(selectedCounty) drawLoupe(data);

  var elapsed = +new Date() - t;
  console.log("Elapsed SVG: ", (elapsed/1000));
}


function drawCountiesCanvas(data) {
  var t = +new Date();

  context.clearRect(0, 0, width, height);

  canvasPath = d3.geo.path()
    .projection(projections['usa'])
    .context(context);

  data.forEach(function(d){
    context.beginPath();
    var c = color(d.properties.count),
        a = opacity(d.properties.density);
    context.globalAlpha = a;
    context.fillStyle = c;
    canvasPath(d.geometry);
    context.fill();
    context.closePath();

  });

  var elapsed = +new Date() - t;
  console.log("Elapsed Canvas: ", (elapsed/1000));

}
//this.props.countriesForCounties
//
function drawCountryConnections(countries) {
  d3.select('.lines').remove();

  if (!countries.length) return resetCountries();

  var filtered = svg.selectAll(".county").filter(function(d){
    return d.properties.nhgis_join === selectedCounty;
  });

  if (filtered[0][0]) {
    var lines = svg.append("g")
      .attr('class', 'lines');
    lines.selectAll('path').remove();

    var line = d3.svg.line()
      .x(function(d) { return d[0]; })
      .y(function(d) { return d[1]; })
      .tension(0.5)
      .interpolate("cardinal");

    var pathData = d3.select(filtered[0][0]).datum();
    var start = d3.geo.path().projection(projections['usa']).centroid(pathData);

    countries.forEach(function(d){

      var end = countryLocations[decade][d.country];

      if (!end) {
        console.warn('Could not find location for (%s)', d.country);
        return;
      }

      lines.append('path')
        .attr('class', 'arc-line')
        .attr('d', function(){
          var dx = end[0] - start[0],
              dy = end[1] - start[1],
              dr = Math.sqrt(dx * dx + dy * dy);

          return "M" + start[0] + "," + start[1] + "A" + dr + "," + dr + " 0 0,1 " + end[0] + "," + end[1];
        });

    });

    filterCountries(countries);

  } else {
    resetCountries();
  }
}

function filterCountries(filterBy) {
  setRadiusDomain(filterBy);

  svg.selectAll(".country").each(function(d){
      var country = d.country;
      var elm = d3.select(this);
      var display = 'none';
      var ct = 1;

      filterBy.forEach(function(x){
        if (x.country === d.country) {
          display = 'block';
          ct = x.count;
        }
      });

      var r = Math.max(radius(ct),1);
      elm.style('display', display)
        .attr('r', r);
  });
}

function resetCountries() {
  var nodes = countryNodes[decade];
  radius.domain([nodes.min, nodes.max]);
  svg.selectAll(".country")
    .style('display', 'block')
    .attr('r', function(d){
      return d.r;
    });
}


function drawLoupe(data) {
  var filtered = data.filter(function(d){
    return d.properties.nhgis_join === selectedCounty;
  });

  if (!filtered.length) {
    console.warn("Could not join!");
    return;
  }

  var w = loupeWidth,
      h = loupeHeight;

  var lprojection = d3.geo.albersUsa()
    .scale(1)
    .translate([0,0]);

  var lpath = d3.geo.path()
    .projection(lprojection);


  var bounds = lpath.bounds(filtered[0]),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        s = .9 / Math.max(dx / w, dy / h),
        t = [w / 2 - s * x, h / 2 - s * y];


  var scaleMod = s * .20;
  var zoom = d3.behavior.zoom()
    .translate(t)
    .scale(s)
    .scaleExtent([s-scaleMod, s+scaleMod])
    .on("zoom", zoomed);

  function zoomed() {
    if (!loupeGroup) return;
    loupeGroup.selectAll('path').style("stroke-width", 1 / d3.event.scale);
    loupeGroup.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
  }

  var counties = loupeGroup.selectAll(".county")
    .data(data, function(d){ return d.properties.id; });

  counties.enter().append('path')
    .attr('class', 'county')
    .attr('d', function(d){
      return lpath(d.geometry);
    })
    .style('fill', function(d,i) {
      return color(d.properties.count);
    })
    .style('stroke', function(d) {
      return '#000'
    })
    .style('stroke-width', function(d) {
      return '1';
    })
    .style("opacity", function(d) {
      return opacity(d.properties.density);
    })
    .on('click', function(d){
      clickCallback(d);
    })

  counties.exit().remove();

  loupeSVG
    .call(zoom) // delete this line to disable free zooming
    .call(zoom.event);

}

function setRadiusDomain(arr) {
  if (!arr.length) return;

  var min = Infinity,
      max = -Infinity;

  arr.forEach(function(d,i){
    min = Math.min(d.count, min);
    max = Math.max(d.count, max);
  });

  if (min === Infinity || max === -Infinity) {
    console.warn('Funky min/max going on! (%s, %s)', min, max);
  }

  radius.domain([min, max]);
}

function generateCountryNodes(countries) {
  setRadiusDomain(countries);

  var nodes = countries.map(function(d) {
    var point,
        lnglat = [d.lng, d.lat];

    if (d.continent == 'Europe') point = projections['europe'](lnglat);
    else if (d.continent == 'Africa') point = projections['africa'](lnglat);
    else if (d.continent == 'Asia') point = projections['asia'](lnglat);
    else if (d.continent == 'Oceania') point = projections['oceania'](lnglat);
    else if (d.continent == 'South America') point = projections['southamerica'](lnglat);
    else if (d.continent == 'North America') {
      if (d.country== 'Canada' || d.country == 'French Canada') {
        point = projections['canada'](lnglat);
      } else {
        point = projections['centralamerica'](lnglat);
      }
    } else {
      // Null Island
      console.warn('Invalid country --> [continent: %s, country: %s, lat: %s, lng: %s]', d.continent, d.country, d.lat, d.lng)
      //point = projections['nullisland'](lnglat);
    }

    if (!point) return;

    return {
      country: d.country,
      key: d.country,
      x: point[0]+0.0001*Math.random(),
      x0: point[0],
      y: point[1]+0.0001*Math.random(),
      y0: point[1],
      r: radius(d.count),
      value: d.count
    }
  });

  runForce(nodes);

  return {
    min: radius.domain()[0],
    max: radius.domain()[1],
    nodes: nodes
  }

}

function runForce(nodes) {
  var iterations = 10;
  var alpha = 0.099;
  var multipler = 0.99;

  var force = d3.layout.force()
      .charge(0)
      .gravity(0)
      .size([width, height])
      .nodes(nodes);

  force.start();

  var g,k;
  while(iterations >= 0){
    g = alpha * .1;
    k = 0.5;

    // gravity
    nodes.forEach(function(node){
      node.x += (node.x0 - node.x) * g;
      node.y += (node.y0 - node.y) * g;
    });

    // collision
    nodes.forEach(function(node){
      var q = d3.geom.quadtree(nodes);

      var nr = node.r + padding,
          nx1 = node.x - nr,
          nx2 = node.x + nr,
          ny1 = node.y - nr,
          ny2 = node.y + nr;

      q.visit(function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== node)) {
          var x = node.x - quad.point.x,
              y = node.y - quad.point.y,
              l = x * x + y * y,
              r = nr + quad.point.r;
          if (l < r * r) {
            l = ((l = Math.sqrt(l)) - r) / l * k;
            node.x -= x *= l;
            node.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }

        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    });

    iterations--;
    alpha *= multipler
  }

  force.stop();
}

function drawCountries(countries) {
  if (!countryNodes[decade]) {
    countryNodes[decade] = generateCountryNodes(countries);

    countryLocations[decade] = {};
    countryNodes[decade].nodes.forEach(function(d){
      countryLocations[decade][d.country] = [d.x, d.y];
    });
  }

  var nodes = countryNodes[decade].nodes,
      min = countryNodes[decade].min,
      max = countryNodes[decade].max;

  // update radius scale
  radius.domain([min, max]);

  // prep layout
  runForce(nodes);

  svg.selectAll(".country").remove();

  var node = svg.selectAll(".country")
    .data(nodes);

  node.enter().append("circle")
    .attr("class", "country")
    .attr("r", function(d) { return d.r; })
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .on('click', null);

  node.exit().remove();

  node.on('click',clickCallback);

}

function setLoupeLayout() {
  loupeWidth = loupe.node().offsetWidth;

  loupeSVG.attr('width', loupeWidth)
      .attr('height', loupeHeight);

  loupe.select('.crosshair')
    .attr('transform', 'translate(' + (loupeWidth/2) + ', ' + (loupeHeight/2) + ')');

  loupe.select('.arrow.left')
    .attr('transform', 'translate(10, '+ (loupeHeight/2) + ')');

  loupe.select('.arrow.right')
    .attr('transform', 'translate(' + (loupeWidth-10) + ', ' + (loupeHeight/2) + ')');

  loupe.select('.arrow.top')
    .attr('transform', 'translate(' + (loupeWidth/2) + ', 10)');

  loupe.select('.arrow.bottom')
    .attr('transform', 'translate(' + (loupeWidth/2) + ', ' + (loupeHeight-10) + ')');


}

var DisjointedWorldLayout = React.createClass({

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    createProjections();

    clickCallback = (typeof this.props.onClickHandler === 'function') ? this.props.onClickHandler : function(){};

    mapContainer = d3.select(React.findDOMNode(this.refs.map));
    var mapParentContainer = d3.select(React.findDOMNode(this.refs.mapContainer));

    width = mapParentContainer.node().offsetWidth;
    height = mapParentContainer.node().offsetHeight;

    mapContainer
      .style("width", width + "px")
      .style("height", height + "px");


    svg = mapContainer.append("svg")
        .attr("width", width)
        .attr("height", height);

    /*
    canvas = mapContainer.append("canvas")
      .attr("width", width)
      .attr("height", height)
      .style("position", "absolute")
      .style("top", "0")
      .style("left", "0");

    context = canvas.node().getContext("2d");
    */

    background = svg.append("g");

    if (this.props.loupeSelector) {
      loupe = d3.select(this.props.loupeSelector);
      loupeHeight = 160;
      loupeWidth = loupe.node().offsetWidth;

      loupeSVG = loupe.append('svg')
        .attr('class', 'loupe')
        .attr('width', loupeWidth)
        .attr('height', loupeHeight)
        .on("click", function() {
          if (d3.event.defaultPrevented) d3.event.stopPropagation();
        }, true)

      loupeGroup = loupeSVG.append('g');

      //

      var crosshair = loupeSVG
        .append('g')
        .attr('class', 'crosshair')
        .attr('transform', 'translate(' + (loupeWidth/2) + ', ' + (loupeHeight/2) + ')');

      crosshair.append('circle')
        .attr('class', 'outer')
        .attr('r', 16);

      crosshair.append('circle')
        .attr('class', 'inner')
        .attr('r', 4);

      crosshair.append('line')
        .attr('x1', 0)
        .attr('y1', -26)
        .attr('x2', 0)
        .attr('y2', 26);

      crosshair.append('line')
        .attr('x1', -26)
        .attr('y1', 0)
        .attr('x2', 26)
        .attr('y2', 0);

      //
      var arrows = loupeSVG.append('g').attr('class', 'arrows');
      //<polygon fill="#3D3D3D" points="1.6,11.6 10,3.2 18.4,11.6 20,10 11.6,1.6 10,0 8.4,1.6 0,10 "/>
      var left = arrows.append('path')
        .attr('class', 'arrow left')
        .attr('transform', 'translate(10, '+ (loupeHeight/2) + ')')
        .attr('d', 'M 15 -8 L 0 0 L 15 8');

      var right = arrows.append('path')
        .attr('class', 'arrow right')
        .attr('transform', 'translate(' + (loupeWidth-10) + ', ' + (loupeHeight/2) + ')')
        .attr('d', 'M -15 -8 L 0 0 L -15 8');

      var top = arrows.append('path')
        .attr('class', 'arrow top')
        .attr('transform', 'translate(' + (loupeWidth/2) + ', 10)')
        .attr('d', 'M -8 15 L 0 0 L 8 15');

      var bottom = arrows.append('path')
        .attr('class', 'arrow bottom')
        .attr('transform', 'translate(' + (loupeWidth/2) + ', ' + (loupeHeight-10) + ')')
        .attr('d', 'M -8 -15 L 0 0 L 8 -15');

    }

  },

  componentWillUnmount: function() {
  },

  componentDidUpdate: function() {
    var props = this.props;
    if (props.world && props.world.arcs && worldDirty) {
      worldDirty = false;
      drawWorld(props.world);
    }

    //countriesForCounties
    var updateCounty = false;
    if (this.props.selectedCounty !== selectedCounty) {
      selectedCounty = this.props.selectedCounty;

      setLoupeLayout();

      updateCounty = true;
    }


    if (decade !== this.props.decade) {
      if (props.countries && props.countries.length && props.counties && props.counties.length) {
        decade = this.props.decade;

        drawCountries(props.countries);
        if (svg) drawCounties(props.counties);
      }

    } else {

      if (this.props.selectedCounty && updateCounty) {
        drawLoupe(props.counties)
      }
    }

    if (this.props.countriesForCounties) {
      drawCountryConnections(this.props.countriesForCounties);
    }

  },

  render: function() {

    return (
        <div className="component disjointed-world-layout" ref="mapContainer">
          <div className="map" ref="map"></div>
        </div>
    );

  }

});

module.exports = DisjointedWorldLayout;