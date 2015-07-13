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
  .range([0.5,5])
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
function processData(geographyData) {
  var country_points = geographyData.country_points;
  var counties = geographyData.us_counties;
  //var data = geographyData.country_data;

  country_points.forEach(function(d) {
    countryLookup[d.category_id] = d;
  });

  d3.nest()
    .key(function(d) { return d.properties["nhgis_join"]; })
    .entries(counties.features)
    .forEach(function(d) {
      countyLookup[d.key] = d.values;
      d.values.forEach(function(p) {
        p.properties.start_date = new Date(p.properties.start_date);
        p.properties.end_date = new Date(p.properties.end_date);
      });
    });

    //sorted = data.slice(0).sort(function(a,b) { return a.year - b.year; });

    /*
    counties_nested = d3.nest()
      .key(function(d) { return d.year; })
      .key(function(d) { return d.nhgis_join; })
      .rollup(function(leaves) { return d3.sum(leaves, function(d) { return d.count; }); })
      .entries(sorted);

    countries_nested = d3.nest()
      .key(function(d) { return d.year; })
      .key(function(d) { return d.category; })
      .rollup(function(leaves) { return d3.sum(leaves, function(d) { return d.count; }); })
      .entries(sorted);
    */

   console.log(countyLookup)
}

function drawWorld(world) {
  background.selectAll(".country")
    .data(topojson.feature(world, world.objects.countries).features)
  .enter().insert("path", ".graticule")
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
    })
}

function drawCountries(countries) {


  var nodes = countries.map(function(d) {
      //console.log(d);
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
        point = projections['nullisland'](lnglat);
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


      force
        .nodes(nodes)
        .on("tick", tick)
        .start();


      svg.selectAll(".country").remove();

      var node = svg.selectAll(".country")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "country")
        .style("fill", function(d) { return "green"; })
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

    /*
    if (Object.keys(this.props.geography).length && !hasData) {
      console.log(this.props.geography)
      hasData = true;

      drawWorld(this.props.geography['world_shapes']);
      processData(this.props.geography);
      drawCounties(this.props.geography['us_counties']);

      //update(2);
    }
    */
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