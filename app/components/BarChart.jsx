/** @jsx React.DOM */
var React   = require('react');
var d3      = require('d3');

var data;
var xScale = d3.scale.linear()
  .range([0,100]);

var numberFormatter = d3.format(',0');

var BarChart = React.createClass({
    getDefaultProps: function() {
        return {
          width: 500,
          height: 500
        }
    },

    componentDidMount: function() {
      this.checkBounds();
      React.findDOMNode(this.refs.wrapper).onscroll = this.checkBounds;
    },

    shouldComponentUpdate: function(nextProps) {
      return true;
    },

    componentDidUpdate: function() {
      this.checkBounds();
    },

    barClick: function(e) {
      var val = e.target.textContent;
      if (typeof this.props.onBarClickHandler === 'function') this.props.onBarClickHandler({country: val});
    },

    renderBars: function() {
      var that = this;
      if (!data.length) return;

      return data.map(function(row, i) {
        return (
          <Bar width={xScale(row.count)}
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

      // sort
      data.sort(function(a,b) {
        return b.count - a.count;
      });

      xScale.domain([0, d3.max(data, function(d){ return d.count; })]);

    },

    checkBounds: function() {
      var wrapper = React.findDOMNode(this.refs.wrapper);
      var rows = React.findDOMNode(this.refs.rows);
      var upBtn = React.findDOMNode(this.refs.scrollupBtn);
      var dwnBtn = React.findDOMNode(this.refs.scrolldownBtn);

      var pos = wrapper.scrollTop;
      var bottom = rows.offsetHeight - wrapper.offsetHeight;

      upBtn.disabled = (pos === 0);
      dwnBtn.disabled = (pos === bottom);

    },

    scrollContent: function(dir) {
      var elm = React.findDOMNode(this.refs.wrapper);
      var amt = elm.offsetHeight * .5;
      var move = dir * amt;
      elm.scrollTop += move;
      this.checkBounds();
    },

    scrollUp: function() {
      this.scrollContent(-1);
    },

    scrollDown: function() {
      this.scrollContent(1)
    },

    render: function() {
      this.prepData();
      var height = this.props.height - (32 + 32 + 20);

      return (
        <div className="bar-chart-container component">
          <button className="bar-chart-scrollbtn up" onClick={this.scrollUp} ref='scrollupBtn'><span>︿</span></button>
          <div className="bar-chart-scrollable-area" style={{height: height + 'px'}}>
            <div className="bar-chart-rows-wrapper" ref="wrapper">
              <div className="bar-chart-rows" ref="rows" onClick={this.barClick}>
                {this.renderBars()}
              </div>
            </div>
          </div>
          <button className="bar-chart-scrollbtn down" onClick={this.scrollDown} ref='scrolldownBtn'><span>﹀</span></button>
        </div>
      );
    }
});

module.exports = BarChart;


var Bar = React.createClass({
    getDefaultProps: function() {
        return {
            width: 0,
            country: '',
            count: 0
        }
    },

    shouldComponentUpdate: function(nextProps) {
      return true;
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