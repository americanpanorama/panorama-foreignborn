/** @jsx React.DOM */
var React   = require('react');
var d3      = require('d3');
var topojson   = require('topojson');
require("d3-geo-projection")(d3);



var countyLookup = {};
var countryLookup = {};
var projections = {};
var padding = 3;

var color = d3.scale.quantile()
  .range(["#f6eff7","#d0d1e6","#a6bddb","#67a9cf","#3690c0","#02818a","#016450"])
  .domain([0,10,100,1000,10000,50000,100000]);

var opacity = d3.scale.sqrt()
  .range([0.1, 0.3, 0.9, 1])
  .domain([0.01, 1, 100, 7000])
  .clamp(true);

var radius = d3.scale.sqrt()
  .range([1,20])
  .domain([200,1500000]);

var force = d3.layout.force()
    .charge(0)
    .gravity(0)
    .size([width, height]);

var width = 960,
    height = 450,
    padding = 0;

var mapContainer, svg, background, counties_nested, countries_nested, sorted;

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

function drawCounties(counties) {
  svg.selectAll(".county").remove();

  svg.selectAll(".county")
    .data(counties.features)
    .enter().append('path')
    .attr('class', 'county')
    .attr('d', function(d){
      return d3.geo.path().projection(projections['usa'])(d.geometry);
    })
    .style('fill', function(d) {
      return color(d.properties.density);
    })
    .style('stroke', function(d) {
      return color(d.properties.density);
    })
    .style("opacity", function(d) {
      return opacity(d.properties.density);
    });
}

function drawCountries(countries) {
  var min = Infinity,
      max = -Infinity;

  var nodes = countries.map(function(d) {
    var point,
      lnglat = [d.lng, d.lat];

    min = Math.min(d.value, min);
    max = Math.max(d.value, max);

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

  // update radius scale
  radius.domain([min, max]);

  // kick off force-layout
  force
    .nodes(nodes)
    .on("tick", tick)
    .start();

  svg.selectAll(".country").remove();

  var node = svg.selectAll(".country")
    .data(nodes)
    .enter().append("circle")
    .attr("class", "country")
    .attr("r", function(d) { return d.r; });

  function tick(e) {
    node.each(gravity(e.alpha * .1))
        .each(collide(.5))
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  }

  function gravity(k) {
    return function(d) {
      d.x += (d.x0 - d.x) * k;
      d.y += (d.y0 - d.y) * k;
    };
  }

  function collide(k) {
    var q = d3.geom.quadtree(nodes);
    return function(node) {
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
    };
  }
}

var hasData = false;
var DisjointedWorldLayout = React.createClass({

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    createProjections();

    width = React.findDOMNode(this.refs.mapContainer).offsetWidth;
    height = window.innerHeight - 200;

    mapContainer = d3.select(React.findDOMNode(this.refs.mapContainer))
      .style("width", width + "px")
      .style("height", height + "px");

    svg = d3.select(React.findDOMNode(this.refs.map)).append("svg")
        .attr("width", width)
        .attr("height", height);

    background = svg.append("g");
  },

  componentWillUnmount: function() {

  },

  componentDidUpdate: function() {
    var props = this.props;
    if (props.world && props.world.arcs) {
      drawWorld(props.world);
    }

    if (props.countries && props.countries.length) {
      drawCountries(props.countries);
    }

    if (props.counties && props.counties.features && props.counties.features.length) {

      // calc density of county
      props.counties.features.forEach(function(d){
        var p = d.properties;
        p.density = Math.round(p.count/p.area_sqmi);
      });

      drawCounties(props.counties);
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