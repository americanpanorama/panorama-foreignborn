/** @jsx React.DOM */
var React   = require('react');
var d3      = require('d3');

var xScale, yScale, data;
var margin = {top: 2, right: 4, bottom: 20, left: 150};

function getSVGDimesions(w,h) {
  return {
    width: w - margin.left - margin.right,
    height: h - margin.top - margin.bottom
  };
}

function getSVGTranslateString() {
  return "translate(" + margin.left + ", " + margin.top + ")";
}

var numberFormatter = d3.format(',0');

var BarChart = React.createClass({
    getDefaultProps: function() {
        return {
          width: 500,
          height: 500
        }
    },

    shouldComponentUpdate: function(nextProps) {
      return true;
    },

    componentDidUpdate: function() {
    },

    renderBars: function() {
      var that = this;
      if (!data.length) return;

      return data.map(function(row, i) {
        var height = yScale.rangeBand(),
            y = yScale(row.country),
            width = xScale(row.count),
            x = 0;

        return (
          <Bar height={height}
                width={width}
                x={x}
                y={y}
                country={row.country}
                count={numberFormatter(row.count)}
                key={i} />
        )
      });
    },


    prepData: function() {
      var props = this.props;
      data = props.rows || [];

      if (!data.length) return;

      var dimensions = getSVGDimesions(this.props.width, this.props.height);

      // sort
      data.sort(function(a,b) {
        return b.count - a.count;
      });

      xScale = d3.scale.linear()
        .domain([0, d3.max(data, function(d){ return d.count; })])
        .range([0, 100]);

      yScale = d3.scale.ordinal()
        .domain(data.map(function(d){ return d.country; }))
        .rangeRoundBands([0, dimensions.height], 0.1);
    },

    renderSvg: function() {
      return (
        <div className="bar-chart-container component">
          <svg width={this.props.width}
                 height={this.props.height} >
            <g transform={getSVGTranslateString()}>
            <g>{this.renderBars()}</g>
            </g>
          </svg>
        </div>
      );
    },

    render: function() {
      this.prepData();

      return (
        <div className="bar-chart-container component">
          <h3>{this.props.title}</h3>
          <button className="bar-chart-scrollbtn up"><span>︿</span></button>
          <div className="bar-chart-rows-wrapper">
            <div className="bar-chart-rows">
              {this.renderBars()}
            </div>
          </div>
          <button className="bar-chart-scrollbtn down"><span>﹀</span></button>
        </div>
      );
    }
});

module.exports = BarChart;


var Bar = React.createClass({
    getDefaultProps: function() {
        return {
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            country: '',
            count: 0
        }
    },

    shouldComponentUpdate: function(nextProps) {
      return this.props.width !== nextProps.width;
    },

    renderSvg: function() {
      return (
        <g transform={"translate(-150," + this.props.y + ")"}>
        <text dy=".35em">{this.props.country}</text>
        <g transform={"translate(150,-" + this.props.height/2 + ")"}>
        <rect className="bar"
              height={this.props.height}
              width={this.props.width}
              x={0}
        >
        </rect>
        </g>
        </g>
      );
    },

    render: function() {
        return (
          <div className="chartRow">
            <div className="label">
              <span>{this.props.country}</span>
            </div>
            <div className="bar">
              <span style={{'width':this.props.width + '%'}}></span>
              <span className="value">{this.props.count}</span>
            </div>
          </div>
        );
    },
});