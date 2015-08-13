/** @jsx React.DOM */
var React   = require('react');
var d3      = require('d3');
var topojson   = require('topojson');

require("d3-geo-projection")(d3);

var width = 960,
    height = 450,
    padding = 0;

var mapContainer, svg, background, countiesGroup, countriesGroup, lines, counties_nested, countries_nested, sorted;
var selectedCounty, selectedCountry;
var countyLookup = {};
var countryLookup = {};
var projections = {};
var worldDirty = true;
var decade;
var countryNodes = {};
var hasData = false;
var clickCallback;

var countryLocations = {};

var color;
var opacity;


var radius;

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
    .attr("class", function(d){
      if (d.id == 'USB' || d.id == 'USK' || d.id == 'USH') return "land usa";
      return "land"
    })
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
  var that = this;
  var t = +new Date();

  var counties = countiesGroup.selectAll(".county")
    .data(data, function(d){ return d.properties.id; });

  counties.enter().append('path')
    .attr('class', 'county')
    .attr('d', function(d,i){
      return d3.geo.path().projection(projections['usa'])(d.geometry);
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
      var r = Math.max(radius(ct),1);

      elm.style('display', display)
        .attr('r', r);
  });
}

function resetCountries() {
  countriesGroup.selectAll(".country")
    .style('display', 'block')
    .attr('r', function(d){
      return Math.max(radius(d.value),1);
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

    min = Math.min(d.count, min);
    max = Math.max(d.count, max);

    return {
      country: d.country,
      key: d.country,
      x: point[0]+0.0001*Math.random(),
      x0: point[0],
      y: point[1]+0.0001*Math.random(),
      y0: point[1],
      r: Math.max(radius(d.count),1),
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
    .attr("r", function(d) { return Math.max(radius(d.value), 1); })
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .classed('selected', function(d){ return d.selected; })
    .on('click', null);

  node.exit().remove();

  if (selected) moveCountryToTop();

  node.on('click',clickCallback);

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

    background = svg.append("g");
    countiesGroup = svg.append("g");
    countriesGroup = svg.append("g");
  },

  componentWillUnmount: function() {
  },

  componentDidUpdate: function() {
    var props = this.props;

    if (props.radiusScale) radius = props.radiusScale;
    if (props.colorScale) color = props.colorScale;
    if (props.opacityScale) opacity = props.opacityScale;

    if (props.world && props.world.arcs && worldDirty) {
      worldDirty = false;
      drawWorld(props.world);
    }

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