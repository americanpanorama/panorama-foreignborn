/** @jsx React.DOM */
var React   = require('react');
var d3      = require('d3');
var topojson   = require('topojson');
require("d3-geo-projection")(d3);



var countyLookup = {};
var countryLookup = {};
var projections = {};

var color2 = d3.scale.sqrt()
  .range(["#eee", "#000"])
  .domain([0,100000]);
var color = d3.scale.ordinal()
  .range(["#4d9221", "#c51b7d"]);
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


function createProjections(projectionParams) {
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
  var data = geographyData.country_data;

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

    sorted = data.slice(0).sort(function(a,b) { return a.year - b.year; });

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

function update(index) {

  var year = counties_nested[index].key;
      d3.select("#year-output").text(year);
      var yeardate = new Date("Aug 15 " + year);
      svg.selectAll(".county").remove();
      var county_nodes = counties_nested[index].values
        .filter(function(d) {
           if (d.values < 1) return false;
           if (d.county) return true;
           if (!(d.key in countyLookup)) {
            return false;
          }
          var county = countyLookup[d.key].filter(function(p) {
            return (p.properties.start_date < yeardate) && (p.properties.end_date >= yeardate);
          });
          if (county.length == 0) {
            return false;
          }
          d.type = "county";
          d.county = county[0];
          return true;
        })
        .map(function(d) {
          var point = projections['usa'](d.county.geometry.coordinates);
          return {
            type: "county",
            county: d.county,
            key: d.key,
            x: point[0],
            x0: point[0],
            y: point[1],
            y0: point[1],
            r: radius(d.values),
            value: d.values
          }
        });
      var country_nodes = countries_nested[index].values
        .filter(function(d) {
           if (d.values < 1) return false;
           if (d.country) return true;
           if (!(d.key in countryLookup)) {
            return false;
           }
           d.country = countryLookup[d.key];
           if (!(d.country.lat)) {
            return false;
           }
           return true;
        })
        .map(function(d) {
          //console.log(d);
          var point;
          if (d.country.continent == 'Europe') point = projections['europe']([d.country.long,d.country.lat]);
          else if (d.country.continent == 'Africa') point = projections['africa']([d.country.long,d.country.lat]);
          else if (d.country.continent == 'Asia') point = projections['asia']([d.country.long,d.country.lat]);
          else if (d.country.continent == 'Oceania') point = projections['oceania']([d.country.long,d.country.lat]);
          else if (d.country.continent == 'South America') point = projections['southamerica']([d.country.long,d.country.lat]);
          else if (d.country.continent == 'North America') {
            if (d.country.name == 'Canada' || d.country.name == 'French Canada')
              point = projections['canada']([d.country.long,d.country.lat]);
            else
              point = projections['centralamerica']([d.country.long,d.country.lat]);
          } else point = projections['nullisland']([d.country.long,d.country.lat]);
          return {
            type: "country",
            country: d.country,
            key: d.key,
            x: point[0]+0.0001*Math.random(),
            x0: point[0],
            y: point[1]+0.0001*Math.random(),
            y0: point[1],
            r: radius(d.values),
            value: d.values
          }
        });
      var nodes = county_nodes
        .filter(function (d) {
          return d.value > 200;
        })
        .concat(country_nodes);
      force
        .nodes(nodes)
        .on("tick", tick)
        .start();
      var node = svg.selectAll(".county")
        .data(nodes, function(d) { return d.key; })
        .enter().append("circle")
        .attr("class", "county")
        .style("fill", function(d) { return color(d.type); })
        .attr("r", function(d) { return d.r; })
        .on("mouseenter", function(d) {
          var subset = sorted.filter(function(p) {
              return d.key == p["nhgis_join"];
            }).filter(function(p) {
              var county = countyLookup[p["nhgis_join"]];
              var country = countryLookup[p.category];
              // checking for missing geometries
              if (!("x" in county)) return false;
              if (!("x" in country)) return false;
              return true;
            });
          svg.selectAll(".link")
            .data(subset)
            .enter().append("path")
            .attr("class", "link")
            .style("opacity", function(p) {
              return d3.min([Math.sqrt(p.count/1000000),1]);
            })
            .attr("d", function(p) {
              var county = countyLookup[p["nhgis_join"]];
              var country = countryLookup[p.category];
              return path({
                type: "LineString",
                coordinates: [
                  projections['usa'].invert([country.x, country.y]),
                  projections['usa'].invert([county.x, county.y])
                ]
              });
            });
        })
        .on("mouseout", function(d) {
          svg.selectAll(".link").remove();
        });
      function tick(e) {
        node.each(gravity(e.alpha * .35))
            .each(collide(.02))
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .each(function(d) {
              if (d.type == "county") {
                countyLookup[d.key].x = d.x;
                countyLookup[d.key].y = d.y;
              }
              if (d.type == "country") {
                countryLookup[d.key].x = d.x;
                countryLookup[d.key].y = d.y;
              }
            });
      };
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


  componentDidMount: function() {
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
    if (Object.keys(this.props.geography).length && !hasData) {
      console.log(this.props.geography)
      hasData = true;

      createProjections(this.props.geography['projection_params']);
      drawWorld(this.props.geography['world_shapes']);
      processData(this.props.geography);

      update(2);
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