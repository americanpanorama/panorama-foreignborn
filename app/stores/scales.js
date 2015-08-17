/**
*
* Compute scales for Foreign Born
*
**/

var opacity = d3.scale.threshold()
  .domain([0.1, 1, 5, 10, 20, 50])
  .range([0.04, 0.2, 0.36, 0.52, 0.68, 0.84, 1]);

var colors = d3.scale.threshold()
  .domain([0.05, 0.1, 0.20, 0.30, 0.4])
  .range(["#318cb4","#3190a8","#2e949b","#28988f","#1f9b83","#0d9f76"]);

var radius = d3.scale.sqrt()
  .domain([500000, 1000000, 1500000, 2000000])
  .range([12, 24, 36, 48]);

function round(n) {
  if (n < 10) {
    return Math.round(n);
  } else if (n < 100) {
    n = Math.round(n/10)*10;
  } else if (n < 1000) {
    n = Math.round(n/100)*100;
  } else if (n < 10000) {
    n = Math.round(n/1000)*1000;
  } else if (n < 100000) {
    n = Math.round(n/10000)*10000;
  } else if (n < 1000000) {
    n = Math.round(n/100000)*100000;
  } else if (n < 10000000) {
    n = Math.round(n/1000000)*1000000;
  } else if (n < 100000000) {
    n = Math.round(n/10000000)*10000000;
  }

  return n;
}

function getRadiusLabel(num) {
  if (n < 1000) return '';
  if (n >= 1000 && n < 1000000) return 'thousand';
  if (n >= 1000000 && n < 1000000000) return 'million';
  return '';
}

function pluralize(val, singular, plural) {
   if (val === 1) return singular;
   return plural;
}

var format = d3.format('s');


var Scales = {};
Scales.opacity = opacity;
Scales.colors = colors;
Scales.radius = radius;

Scales.getValuesForGridKey = function() {
  return {
    xvals: [0.04, 0.2, 0.35, 0.5, 0.7, 1].reverse(),
    yvals: Array.prototype.slice.call(colors.range()).reverse(), // shallow copy to avoid reversing original array
    axis: {
      xMin: '0',
      xMax: '50+',
      yMin: '0%',
      yMax: '40%'
    },
    labels: {
      x: "people per sq/mi",
      y: "foreign-born"
    }
  }
}

Scales.getRadiusForLegend = function() {
  var domain = radius.domain().slice(0);
  var labels = ['500 thousand people', '1 million people', '1.5 million people', '2 million people'];
  var out = [];
  domain.forEach(function(d,i){
    var v = radius(d);
    out.push({
      r: v,
      value: d,
      label: labels[i]
    });
  });
  return out;
}

Scales.getLegendForCounty = function(scale){
  var domain = scale.domain().slice(0);
  var out = [];


  domain.forEach(function(d,i){
    var n = d;
    var v = Math.max(scale(n),1);
    var l = format(n) +  ' ' + pluralize(n,'person','people');
    //format(n) + getRadiusLabel(n) + ' ' + pluralize(n,'people','person');

    out.push({
      r: v,
      value: n,
      label: l
    });
  });

  return out;
};

Scales.makeCountyRadiusScale = function(data) {
  var rad =  radius.copy();

  if (!data.length) return rad;

  var max = d3.max(data, function(d){
    return d.count;
  });



  if (max < 20) {
    var range = rad.range().slice(0);
    return rad.domain([1,max]).range([range[0], range[3]])
  }

  var len = round(max / 5);

  console.log("MAX: ", max, len)

  rad.domain([len * 1, len * 2, len * 3, len * 4]);

  return rad;
}

module.exports = Scales;