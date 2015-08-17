var React   = require('react');
var d3      = require('d3');

var config        = require("../../.env.json");
var CartoDBClient = require("cartodb-client");

var client = new CartoDBClient(config.cartodbAccountName);

/* Privates */
var QUERY = 'SELECT the_geom, gisjoin as nhgis_join FROM us_county_mapshaper_materialized WHERE year = {year} and ({bbox})';
var filterOn = null
var decade;
var projection, path, extent, queryProjection;
var lookup;
var width, height;
var halt = false;

var color = d3.scale.linear()
  .domain([0,1])
  .range(['#ffffff', '#ffffff']);

var opacity = d3.scale.linear()
  .domain([0,1])
  .range([0,1]);

var Loupe = React.createClass({
  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  updateLayout: function() {
    var svg = d3.select(React.findDOMNode(this.refs.svg));
    var crosshair = d3.select(React.findDOMNode(this.refs.crosshair));
    var arrowleft = d3.select(React.findDOMNode(this.refs.arrowleft));
    var arrowright = d3.select(React.findDOMNode(this.refs.arrowright));
    var arrowtop = d3.select(React.findDOMNode(this.refs.arrowtop));
    var arrowbottom = d3.select(React.findDOMNode(this.refs.arrowbottom));

    var w2 = width/2,
        h2 = height/2;

    svg.attr('width', width)
      .attr('height', height);

    crosshair
      .attr('transform', 'translate(' + w2 + ', ' + h2 + ')');

    arrowleft
      .attr('transform', 'translate(10, ' + h2 + ')');

    arrowright
      .attr('transform', 'translate(' + (width-10) + ', ' + h2 + ')');

    arrowtop
      .attr('transform', 'translate(' + w2 + ', 10)');

    arrowbottom
      .attr('transform', 'translate(' + w2 + ', ' + (height-10) + ')');

  },

  setDimensions: function() {
    var elm = React.findDOMNode(this.refs.loupe);
    width = this.props.width || elm.offsetWidth;
    height = this.props.height || elm.offsetHeight;

  },

  componentDidMount: function() {
    this.setDimensions();
    this.updateLayout();
  },

  componentWillUnmount: function() {

  },

  componentDidUpdate: function() {
    var that = this;
    if (this.props.colorScale) color = this.props.colorScale;
    if (this.props.opacityScale) opacity = this.props.opacityScale;



    if (this.props.data.length) {
      if ((this.props.filterOn && filterOn !== this.props.filterOn) || this.props.decade !== decade) {

        filterOn = this.props.filterOn;
        decade = this.props.decade;
        var loader = d3.select(React.findDOMNode(this.refs.loader));
        loader.classed('active', true);
        this.update();
      } else {
        if (this.props.redraw) {
          this.update();
        }
      }
    }
  },

  getScaleAndTranslate: function(path, feature) {
    var bounds = path.bounds(feature),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        s = .7 / Math.max(dx / width, dy / height),
        t = [width / 2 - s * x, height / 2 - s * y];

    return [s,t];
  },

  /**
   * Set projection and path
   * based on a geojson feature
   * @param object feature Geojson feature
   */
  setProjection: function(feature) {

    queryProjection = d3.geo.mercator()
      .scale(1)
      .translate([0,0]);

    projection = d3.geo.albersUsa()
      .scale(1)
      .translate([0,0]);

    path = d3.geo.path()
      .projection(projection);


    var st = this.getScaleAndTranslate(path, feature)
    projection.scale(st[0]).translate(st[1]);

    st = this.getScaleAndTranslate(d3.geo.path().projection(queryProjection), feature);
    queryProjection.scale(st[0]).translate(st[1]);

    var w2 = width/2,
        h2 = height/2,
        dblW = width*2,
        dblH = height*2;

    extent = [[w2 - dblW , h2 - dblH], [w2 + dblW , h2 + dblH]];

    //var centroid = path.centroid(filtered[0]);
  },

  load: function() {
    var that = this;
    var decade = this.props.decade;
    var leftTop = queryProjection.invert(extent[0]);
    var rightBottom = queryProjection.invert(extent[1]);
    var bbox = "ST_INTERSECTS(ST_MakeEnvelope("+([leftTop[0],rightBottom[1],rightBottom[0],leftTop[1]].join(','))+", 4326), the_geom)";
    var sql = QUERY.replace(/{year}/g, decade).replace(/{bbox}/g, bbox);

    var q = {
      key: 'hires',
      sql: sql,
      options: {"format":"GeoJSON"}
    };

    client.requestPromiseJSON(q)
    .then(function(rsp) {

      that.draw(rsp.response.features);

    }, function(error){
      console.log('err: ', err);
    });

  },

  pointInPolygon: function (point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    var xi, xj, i, intersect,
        x = point[0],
        y = point[1],
        inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      xi = vs[i][0],
      yi = vs[i][1],
      xj = vs[j][0],
      yj = vs[j][1],
      intersect = ((yi > y) != (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  _onChange: function(sel) {
    if (halt || sel == this.props.filterOn) return;

    if (typeof this.props.changeCallback === 'function') {
      halt = true;
      var loader = d3.select(React.findDOMNode(this.refs.loader));
      loader.classed('active', true);

      this.props.changeCallback({
        properties: {
          nhgis_join: sel
        }
      });
    }
  },

  draw: function(features) {
    halt = false;

    features = features.filter(function(d){
      return lookup.hasOwnProperty(d.properties.nhgis_join);
    });

    var that = this;
    var loader = d3.select(React.findDOMNode(this.refs.loader));
    var geo = d3.select(React.findDOMNode(this.refs.geo));
    var svg = d3.select(React.findDOMNode(this.refs.svg));
    var scaleMod = 1 * .20;
    var currentTranslate = [0,0];
    var zoom = d3.behavior.zoom()
      .translate(currentTranslate)
      .scale(1)
      .scaleExtent([1-scaleMod, 1+scaleMod])
      .on("zoom", zoomed)
      .on("zoomend", zoomEnd)
      .on("zoomstart", zoomStart);

    // turn of loader screen
    loader.classed('active', false);


    function zoomStart() {
      if (halt) return;
      if (!d3.event) return;
      if (d3.event.sourceEvent === null) return;
      svg.classed('zooming', true);
    }

    function zoomEnd() {
      svg.classed('zooming', false);

      if (halt) return;
      if (!d3.event) return;
      if (d3.event.sourceEvent === null) return;

      // get zoom behavior translation
      var t = zoom.translate();

      // check to see if this was a click
      if (t[0] === currentTranslate[0] && t[1] === currentTranslate[1]) return;
      currentTranslate = t;

      // get new lat,lng
      var pt = projection.invert([width/2 - t[0], height/2 - t[1]]);

      // check to see if point is in a polygon
      var selected;
      geo.selectAll('.county')
        .each(function(d){
          var inside = false;

          var cords = d.geometry.coordinates;
          if (d.geometry.type === 'MultiPolygon') {
            var f;
            cords.forEach(function(c){
              f = that.pointInPolygon(pt, c[0]);
              if (f) inside = true;
            });
          } else {
            inside = that.pointInPolygon(pt, cords);
          }

          if (inside) selected = d.properties.nhgis_join;
        });

      // if in polygon call change event
      if (selected) that._onChange(selected);
    }

    function zoomed() {
      if (halt) return;
      if (!d3.event) return;
      //geo.selectAll('path').style("stroke-width", 1 / d3.event.scale);
      geo.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    }

    // draw part
    geo.selectAll('.county').remove();

    var counties = geo.selectAll('.county')
      .data(features, function(d){ return d.properties.nhgis_join; });

    counties.enter().append('path')
      .attr('class', 'county')
      .attr('d', function(d){
        return path(d.geometry);
      })
      .style('fill', function(d,i) {
        return color(lookup[d.properties.nhgis_join].properties.fbPct);//color(d.properties.count);
      })
      .style("fill-opacity", function(d) {
        return opacity(lookup[d.properties.nhgis_join].properties.density);//opacity(d.properties.density);
      })
      .on('click', function(d){
        that._onChange(d.properties.nhgis_join);
      });

    svg.call(zoom)
      .call(zoom.event);

  },

  update: function() {
    this.setDimensions();
    this.updateLayout();

    var data = this.props.data;
    var selectedCounty = filterOn;
    lookup = {};

    // find the selected county
    var filtered = data.filter(function(d){
      lookup[d.properties.nhgis_join] = d;
      return d.properties.nhgis_join === selectedCounty;
    });

    if (!filtered.length) {
      console.warn("Could not find matching county.")
      var loader = d3.select(React.findDOMNode(this.refs.loader));
      var geo = d3.select(React.findDOMNode(this.refs.geo));
      loader.classed('active', false);
      geo.selectAll('.county').remove();
      filterOn = null;
      return;
    }


    this.setProjection(filtered[0]);
    this.load();
  },

  render: function() {

    var display = (this.props.filterOn) ? "block" : "none";
    var style = {
      'display' : display
    };

    return (
        <div id="loupe" className="component loupe" ref="loupe" style={style}>
          <div ref="loader" className="loupe-loading active"><div className="table"><span className="td">Loading...</span></div></div>
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