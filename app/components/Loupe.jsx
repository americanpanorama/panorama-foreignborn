var React   = require('react');
var d3      = require('d3');

var config        = require("../../.env.json");
var CartoDBClient = require("cartodb-client");

var client = new CartoDBClient(config.cartodbAccountName);

var COUNTY_QUERY = 'SELECT ST_Collect(the_geom) as the_geom, SUM(count) as count,AVG(area_sqmi) as area_sqmi,nhgis_join FROM site_foreignborn_counties_prod_materialized WHERE start_n < {startN} and end_n >= {startN} and year = {year} and ({bbox}) group by nhgis_join';

var filterOn = null;
var Loupe = React.createClass({

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  updateLayout: function() {
    var loupe = d3.select(React.findDOMNode(this.refs.loupe));
    var svg = d3.select(React.findDOMNode(this.refs.svg));
    var crosshair = d3.select(React.findDOMNode(this.refs.crosshair));
    var arrowleft = d3.select(React.findDOMNode(this.refs.arrowleft));
    var arrowright = d3.select(React.findDOMNode(this.refs.arrowright));
    var arrowtop = d3.select(React.findDOMNode(this.refs.arrowtop));
    var arrowbottom = d3.select(React.findDOMNode(this.refs.arrowbottom));

    var w = loupe.node().offsetWidth,
        h = 160;
    svg.attr('width', w)
      .attr('height', h);

    crosshair
      .attr('transform', 'translate(' + w/2 + ', ' + h/2 + ')');

    arrowleft
      .attr('transform', 'translate(10, ' + (h/2) + ')');

    arrowright
      .attr('transform', 'translate(' + (w-10) + ', ' + (h/2) + ')');

    arrowtop
      .attr('transform', 'translate(' + (w/2) + ', 10)');

    arrowbottom
      .attr('transform', 'translate(' + (w/2) + ', ' + (h-10) + ')');

  },

  componentDidMount: function() {
    this.updateLayout();
  },

  componentWillUnmount: function() {
  },

  componentDidUpdate: function() {
    if (this.props.data.length) {
      if (this.props.filterOn && filterOn !== this.props.filterOn) {
        filterOn = this.props.filterOn;
        this.getIds();
      }
    }
  },

  getIds: function() {
    var data = this.props.data;
    var selectedCounty = filterOn;

    var filtered = data.filter(function(d){
      return d.properties.nhgis_join === selectedCounty;
    });

    if (!filtered.length) return;

    var geo = d3.select(React.findDOMNode(this.refs.geo));

    var svg = React.findDOMNode(this.refs.svg),
        w = svg.offsetWidth,
        h = svg.offsetHeight;

    var projection = d3.geo.albersUsa()
      .scale(1)
      .translate([0,0]);

    var path = d3.geo.path()
      .projection(projection);

    var bounds = path.bounds(filtered[0]),
          dx = bounds[1][0] - bounds[0][0],
          dy = bounds[1][1] - bounds[0][1],
          x = (bounds[0][0] + bounds[1][0]) / 2,
          y = (bounds[0][1] + bounds[1][1]) / 2,
          s = .9 / Math.max(dx / w, dy / h),
          t = [w / 2 - s * x, h / 2 - s * y];

    projection.scale(s).translate(t);
    var centroid = path.centroid(filtered[0]);

    var lt = [-w, -h],
        rb = [w*2, h*2];

    console.log('w/h: ', w,h);
    console.log('centroid: ', centroid);
    console.log('lt: ', projection.invert(lt));
    console.log('rb: ', projection.invert(rb));

    var pt1 = projection.invert(lt);
    var pt2 = projection.invert(rb);

    var decade = 1930;
    var start = decade * 10000 + 101;
    var end = (decade + 10) * 10000 + 101;
    var bbox = "ST_INTERSECTS(ST_MakeEnvelope("+([pt1[0],pt2[1],pt2[0],pt1[1]].join(','))+", 4326), the_geom)";
    var sql = COUNTY_QUERY.replace(/{startN}/g, start).replace(/{endN}/g, start).replace(/{year}/g, decade).replace(/{bbox}/g, bbox);

    var q = {
      key: 'hires',
      sql: sql,
      options: {"format":"GeoJSON"}
    };

    var lookup = {};
    data.forEach(function(d){
      lookup[d.properties.nhgis_join] = d;
    });


    client.requestPromiseJSON(q)
    .then(function(rsp) {

      var counties = geo.selectAll('.county')
        .data(rsp.response.features, function(d){ return d.properties.nhgis_join; });

      counties.enter().append('path')
        .attr('class', 'county')
        .attr('d', function(d){
          if (!d.properties.nhgis_join in lookup) {
            console.warn('loupe no lookup for ', d.properties.nhgis_join);
          }
          return path(d.geometry);
        })
        .style('fill', function(d,i) {
          return 'rgba(255,255,255,0.6)';//color(d.properties.count);
        })
        .style('stroke', function(d) {
          return '#000'
        })
        .style('stroke-width', function(d) {
          return '1';
        })
        .style("opacity", function(d) {
          return 1;//opacity(d.properties.density);
        })

    }, function(error){
      console.log('err: ', err);
    });

  },

  render: function() {

    return (
        <div id="loupe" className="component loupe" ref="loupe">
          <svg ref="svg">
            <g ref="geo"></g>
            <g className="crosshair" ref="crosshair">
              <circle className="outer" r="16"></circle>
              <circle className="inner" r="4"></circle>
              <line x1="0" y1="-26" x2="0" y2="26"></line>
              <line x1="-26" y1="0" x2="26" y2="0"></line>
            </g>
            <g className="arrows">
              <path className="arrow left" ref="arrowleft" d="M 15 -8 L 0 0 L 15 8"></path>
              <path className="arrow right" ref="arrowright" d="M -15 -8 L 0 0 L -15 8"></path>
              <path className="arrow top" ref="arrowtop" d="M -8 15 L 0 0 L 8 15"></path>
              <path className="arrow bottom" ref="arrowbottom" d="M -8 -15 L 0 0 L 8 -15"></path>
            </g>
          </svg>
        </div>
    );

  }

});

module.exports = Loupe;