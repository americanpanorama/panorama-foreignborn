/** @jsx React.DOM */
var React   = require('react');
var d3      = require('d3');
var topojson   = require('topojson');

require("d3-geo-projection")(d3);

var width = 960,
    height = 450,
    padding = 0;

var mapParentContainer, mapContainer, svg, background, countiesGroup, countriesGroup, lines, counties_nested, countries_nested, sorted;
var selectedCounty, selectedCountry;
var countyLookup = {};
var countryLookup = {};
var worldDirty = true;
var decade;
var countryNodes = {};
var hasData = false;
var clickCallback;

var countryLocations = {};

var color;
var opacity;
var minRadius = 2.5;


var radius;

var nullisland = {
  centerCoords: [0,0],
  translate: [700, 100],
  scale: 100
}

var worldrects = {
    asia: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      features: {},
      centerCoords: [110,20],
      translate: [130, 110],
      scale: 100
    },
    oceania: {
      x: 40,
      y: 0,
      width: 0,
      height: 0,
      features: {},
      centerCoords: [150,-30],
      translate: [100, 300],
      scale: 100
    },
    europe: {
      x: 0,
      dx: 0,
      y: 0,
      width: 0,
      height: 0,
      features: {},
      centerCoords: [20,50],
      translate: [600, 100],
      scale: 100
    },
    africa: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      features: {},
      centerCoords: [20,0],
      translate: [600, 300],
      scale: 100
    },
    canada: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      features: {},
      centerCoords: [-100,50],
      translate: [500, 75],
      scale: 100
    },
    southamerica: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      features: {},
      centerCoords: [-70,-30],
      translate: [400, 300],
      scale: 100
    },
    centralamerica: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      features: {},
      centerCoords: [-100,20],
      translate: [250, 300],
      scale: 100
    },
    usa: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      features: {},
      centerCoords: [-100,35],
      translate: [320, 110],
      scale: 300
    }
  }


function createProjections() {
  // Create a bunch of projections for different continents
  d3.keys(worldrects).forEach(function(key) {
    var params = worldrects[key];
    if (key == 'usa') {
      worldrects[key].projection = d3.geo.albersUsa()
        .translate(params.translate)
        .scale(params.scale);
    } else {
      worldrects[key].projection = d3.geo.azimuthalEqualArea()
        .rotate([-params.centerCoords[0],-params.centerCoords[1]])  //negative numbers to rotate correctly
        .translate(params.translate)
        .scale(params.scale);
    }
    worldrects[key].path = d3.geo.path().projection(worldrects[key].projection);
  });
}

// ALSO SEE: https://gist.githubusercontent.com/nrabinowitz/1756257/raw/9e31098d064e036b0378a3e16876a4450a854917/fitProjection.js
// AS WELL AS: http://bl.ocks.org/mbostock/4699541
function fitIn(projection, obj, key) {
  projection
    .scale(1)
    .translate([0, 0]);

  var multiplier = 1;
  if (key) {
    try {
      var c = worldrects[key].centerCoords;
      if (c) {
        projection.rotate([-c[0],-c[1]])
      }
    } catch(e) { console.log("ERROR: No centerCoords for -->", key)}
  }

  var path = d3.geo.path().projection(projection);
  var size = [obj.width, obj.height];

  var left = Infinity,
      bottom = -Infinity,
      right = -Infinity,
      top = Infinity;

  var bounds = path.bounds(obj.features);

  var dx = bounds[1][0] - bounds[0][0],
    dy = bounds[1][1] - bounds[0][1],
    x = (bounds[0][0] + bounds[1][0]) / 2,
    y = (bounds[0][1] + bounds[1][1]) / 2,
    scale = multiplier / Math.max(dx / size[0], dy / size[1]),
    translate = [size[0] / 2 - scale * x, size[1] / 2 - scale * y];

  translate[0] += obj.x;
  translate[1] += obj.y;

  return [scale, translate];
}

function parseWorldGeometry(world, key) {
  if ('coordinates' in worldrects[key].features && worldrects[key].features.coordinates.length) return worldrects[key].features;

  switch(key) {
    case 'asia':
      return topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return d.properties.continent == 'Asia'; }));
    break;

    case 'oceania':
      return topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return d.properties.continent == 'Oceania'; }))
    break;

    case 'europe':
      return topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return d.properties.continent == 'Europe'; }));
    break;

    case 'africa':
      return topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return d.properties.continent == 'Africa'; }))
    break;

    case 'canada':
      return topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return d.id == 'CAN'; }))
    break;

    case 'southamerica':
      return topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return d.properties.continent == 'South America'; }));
    break;

    case 'centralamerica':
      return topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return d.properties.subregion == 'Central America'; }))
    break;

    case 'usa':
      return topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return (d.id == 'USB' || d.id == 'USK' || d.id == 'USH'); }));
    break;

    default:
      return {type: "MultiPolygon", coordinates: []};
    break;
  }
}


function drawWorld(world) {
  // Auto Position countries based on view box
  // TODO: Basically needs more attention and simplification

  // basic grid dimensions
  var center = [width/2, height/2];
  var sizeUSA = [(width * .5)/2, (height * .5)/2];
  var sizeCorners = [(width * .25)/2, (height * .5)/2];
  var sizeMiddle = [(width * .25)/2, (height * .25)/2];

  // building blocks
  var rects = worldrects;

  var rectsArr = [];
  for (var rect in rects) {
    rects[rect].features = parseWorldGeometry(world, rect);

    // Tinker with x, y, width and height to adjust layout
    switch (rect) {
      case 'asia':
        rects[rect].x = 0;
        rects[rect].y = 0;
        rects[rect].width = sizeCorners[0] * 2;
        rects[rect].height = sizeCorners[1] * 2;
      break;
      case 'oceania':
        rects[rect].x = 40;
        rects[rect].y = height-(sizeCorners[1]*2);
        rects[rect].width = (sizeCorners[0] * 2) * 1.2;
        rects[rect].height = sizeCorners[1] * 2;
      break;
      case 'europe':
        rects[rect].x = (width-((sizeCorners[0]*2) * 1.6) - 10);
        rects[rect].dx = -10;
        rects[rect].y = (sizeCorners[1] * 2) - ((sizeCorners[1] * 2) * 1.3);
        rects[rect].width = (sizeCorners[0] * 2) * 1.6;
        rects[rect].height = (sizeCorners[1] * 2) * 1.4;
      break;
      case 'africa':
        rects[rect].x = (width-(sizeCorners[0]*2)-15);
        rects[rect].y = height-(sizeCorners[1]*2);
        rects[rect].width = sizeCorners[0] * 2;
        rects[rect].height = sizeCorners[1] * 2;
      break;
      case 'canada':
        rects[rect].x = center[0] - sizeMiddle[0];
        rects[rect].y = 0;
        rects[rect].width = sizeMiddle[0] * 2;
        rects[rect].height = sizeMiddle[1] * 2;
      break;
      case 'southamerica':
        rects[rect].x = center[0];
        rects[rect].y = (height - ((sizeMiddle[1]*2) * 1.15) );
        rects[rect].width = sizeMiddle[0] * 2;
        rects[rect].height = ((sizeMiddle[1] * 2) * 1.15);
      break;
      case 'centralamerica':
        rects[rect].x = sizeCorners[0] * 2;
        rects[rect].y = height - ((sizeMiddle[1]*2));
        rects[rect].width = sizeMiddle[0] * 2;
        rects[rect].height = (sizeMiddle[1] * 2) * .7;
      break;
      case 'usa':
        rects[rect].x = sizeCorners[0] * 2;
        rects[rect].y = (sizeMiddle[1] * 2) - 10;
        rects[rect].width = sizeUSA[0] * 2;
        rects[rect].height = sizeUSA[1] * 2;
      break;
      default:
        break;
    }

    rects[rect].key = rect;
    rectsArr.push(rects[rect]);

    var st;
    if (rect === 'usa') {
      st = fitIn(d3.geo.albersUsa(), rects[rect], rect)
    } else {
      st = fitIn(d3.geo.azimuthalEqualArea(), rects[rect], rect)
    }

    rects[rect].scale = st[0];
    rects[rect].translate = st[1];
  }

  // show layout grid
  var showGrid = 0;
  if (showGrid) {
    d3.select('.disjointed-world-layout').selectAll('.layout-assist-on').remove();

    d3.select('.disjointed-world-layout').classed('layout-assist-on', true)
    var grid = svg.append('g');
    grid.selectAll('.layout-assist-box')
      .data(rectsArr)
      .enter()
        .append('rect')
        .attr('class', 'layout-assist-box')
        .attr('x', function(d){ return d.x; })
        .attr('y', function(d){ return d.y; })
        .attr('width', function(d){ return d.width; })
        .attr('height', function(d){ return d.height; });
  }

  // Update and create projections to use
  // for drawing countries
  createProjections();

  // finally draw
  background.selectAll(".land").remove();

  background.selectAll(".land")
    .data(rectsArr)
  .enter().append("path")
    .attr("class", function(d){
      if (d.key === 'usa') return "land usa";
      return "land"
    })
    .attr("d", function(d) {
      return worldrects[d.key].path(d.features);
    });
}

function drawCounties(data) {
  var that = this;
  var t = +new Date();

  var counties = countiesGroup.selectAll(".county")
    .data(data, function(d){ return d.properties.id; });

  counties.enter().append('path')
    .attr('class', 'county')
    .attr('d', function(d,i){
      return worldrects['usa'].path(d.geometry);
    })
    .style('fill', function(d) {
      return color(d.properties.fbPct);
    })
    .style('stroke', function(d) {
      return color(d.properties.fbPct);
    })
    .style("opacity", function(d) {
      return opacity(d.properties.density);
    })
    .on('click', function(d){
      clickCallback(d);
    });

  counties.exit().remove();

  var elapsed = +new Date() - t;
  console.log("Elapsed SVG: ", (elapsed/1000));
}

function drawCountryConnections(countries) {
  d3.select('.lines').remove();

  if (!countries.length) {
    if (selectedCounty) {
      return zeroOutCountries();
    } else {
      return resetCountries();
    }
  }

  var filtered = countiesGroup.selectAll(".county").filter(function(d){
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
    var start = worldrects['usa'].path.centroid(pathData);

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

function zeroOutCountries() {
  countriesGroup.selectAll(".country").each(function(d){
    d3.select(this)
      .attr('r',0);
  });
}

function filterCountries(filterBy) {
  countriesGroup.selectAll(".country").each(function(d){
      var country = d.country;
      var elm = d3.select(this);
      var display = 'none';
      var ct = 1;

      filterBy.forEach(function(x){
        if (x.country === country) {
          display = 'block';
          ct = x.count;
        }
      });

      // make sure radius is above 0
      var r = getCountryRadius(ct);

      elm.style('display', display)
        .attr('r', r);
  });
}

function getCountryRadius(val) {
  if (!val) return minRadius;
  return Math.max(radius(val), minRadius);
}

function resetCountries() {
  countriesGroup.selectAll(".country")
    .style('display', 'block')
    .attr('r', function(d){
      return getCountryRadius(d.value);
    });
}

function toggleCountries(selected) {
  var nodes = countryNodes[decade].nodes;
  nodes.forEach(function(d){
    d.selected = (d.country === selected) ? true : false;
  })

  countriesGroup.selectAll(".country")
  .classed('selected', false)
  .filter(function(d){
    return d.selected;
  })
  .classed('selected', function(d){
    return d.selected;
  });


  moveCountryToTop();

}

function moveCountryToTop() {
  countriesGroup.selectAll('.country')
    .sort(function(a,b){
      var as = a.selected,
          bs = b.selected;

      if (as || bs) return bs ? -1 : 1 ;
      return b.value - a.value;
    });
}

function generateCountryNodes(countries) {
  var min = Infinity,
      max = -Infinity;
  var nodes = countries.map(function(d) {
    var point,
        proj,
        lnglat = [d.lng, d.lat];

    if (d.continent == 'Europe') {
      proj = 'europe';
      point = worldrects['europe'].projection(lnglat);
    } else if (d.continent == 'Africa') {
      proj = 'africa';
      point = worldrects['africa'].projection(lnglat);
    } else if (d.continent == 'Asia') {
      proj = 'asia';
      point = worldrects['asia'].projection(lnglat);
    } else if (d.continent == 'Oceania') {
      proj = 'oceania';
      point = worldrects['oceania'].projection(lnglat);
    } else if (d.continent == 'South America') {
      proj = 'southamerica';
      point = worldrects['southamerica'].projection(lnglat);
    } else if (d.continent == 'North America') {
      if (d.country== 'Canada' || d.country == 'French Canada') {
        proj = 'canada';
        point = worldrects['canada'].projection(lnglat);
      } else {
        proj = 'centralamerica';
        point = worldrects['centralamerica'].projection(lnglat);
      }
    } else {
      // Null Island
      console.warn('Invalid country --> [continent: %s, country: %s, lat: %s, lng: %s]', d.continent, d.country, d.lat, d.lng)
      //point = projections['nullisland'](lnglat);
    }

    if (!point) return;

    min = Math.min(d.count, min);
    max = Math.max(d.count, max);

    return {
      country: d.country,
      key: d.country,
      proj: proj,
      lat: d.lat,
      lng: d.lng,
      x: point[0]+0.0001*Math.random(),
      y: point[1]+0.0001*Math.random(),
      r: getCountryRadius(d.count),
      value: d.count,
      selected: false
    }
  });

  // put smaller countries on top
  nodes.sort(function(a,b){
    return b.value - a.value;
  });

  nodes.forEach(function(d,i) {
    d.zIndex = i;
  });

  return {
    min: min,
    max: max,
    nodes: nodes
  }

}

function updateCountryNodes() {
  for(var decade in countryNodes) {
    var nodes = countryNodes[decade].nodes;
    nodes.forEach(function(d){
      var point = worldrects[d.proj].projection([d.lng, d.lat])
      d.x = point[0]+0.0001*Math.random();
      d.y = point[1]+0.0001*Math.random();

      countryLocations[decade][d.country] = [d.x, d.y];
    });
  }
}


function drawCountries(countries, selected) {
  if (!countryNodes[decade]) {
    countryNodes[decade] = generateCountryNodes(countries);

    countryLocations[decade] = {};
    countryNodes[decade].nodes.forEach(function(d){
      countryLocations[decade][d.country] = [d.x, d.y];
    });
  }

  console.log("=== DRAW Country ===")

  var nodes = countryNodes[decade].nodes,
      min = countryNodes[decade].min,
      max = countryNodes[decade].max;

  nodes.forEach(function(d){
    d.selected = (d.country === selected) ? true : false;
  })

  svg.selectAll(".country").remove();

  var node = countriesGroup.selectAll(".country")
    .data(nodes);

  node.enter().append("circle")
    .attr("class", "country")
    .attr("r", function(d) { return getCountryRadius(d.value); })
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .classed('selected', function(d){ return d.selected; })
    .on('click', null);

  node.exit().remove();

  if (selected) moveCountryToTop();

  node.on('click',clickCallback);

}

function updateLayout() {
  width = mapParentContainer.node().offsetWidth;
  height = mapParentContainer.node().offsetHeight;

  mapContainer
    .style("width", width + "px")
    .style("height", height + "px");

  svg
    .attr("width", width)
    .attr("height", height);
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
    mapParentContainer = d3.select(React.findDOMNode(this.refs.mapContainer));

    svg = mapContainer.append("svg");
    background = svg.append("g");
    countiesGroup = svg.append("g");
    countriesGroup = svg.append("g");

    updateLayout();
  },

  componentWillUnmount: function() {
  },

  componentDidUpdate: function() {
    var props = this.props;

    if (props.radiusScale) radius = props.radiusScale;
    if (props.colorScale) color = props.colorScale;
    if (props.opacityScale) opacity = props.opacityScale;

    if (props.redraw) {

      worldDirty = true;
      selectedCounty = null;
      decade = null;
      selectedCountry = null;

      svg.selectAll(".county").remove();
      updateLayout();
    }

    if (props.world && props.world.arcs && worldDirty) {
      worldDirty = false;
      drawWorld(props.world);
    }

    if (props.redraw) updateCountryNodes();

    //countriesForCounties
    var updateCounty = false;
    if (this.props.selectedCounty !== selectedCounty) {
      selectedCounty = this.props.selectedCounty;
      updateCounty = true;
    }


    if (decade !== this.props.decade) {
      if (props.countries && props.countries.length && props.counties && props.counties.length) {
        decade = this.props.decade;

        drawCountries(props.countries, props.selectedCountry);
        drawCounties(props.counties);
      }

    } else {

      if (props.selectedCountry !== selectedCountry) {
        selectedCountry = props.selectedCountry;
        toggleCountries(selectedCountry);
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