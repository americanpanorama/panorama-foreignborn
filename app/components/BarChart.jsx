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

      // Make sure spotlight effect propagates
      this.forceRepaint(React.findDOMNode(this.refs.wrapper));
    },

    forceRepaint: function(element) {
      var disp = element.style.display;
      element.style.display = 'none';
      var trick = element.offsetHeight;
      element.style.display = disp;
    },

    barClick: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var elm = e.target;
      var btn = null;
      var ct = 0;
      while (!btn && ct < 10) {
        if (d3.select(elm).classed('chartRow')) {
          btn = elm;
        }
        ct++;
        elm = elm.parentNode
      }

      if (btn) {
        var val = btn.getAttribute('data-value');
        if (typeof this.props.onBarClickHandler === 'function') this.props.onBarClickHandler({country: val});
      }
    },

    renderBars: function() {
      var that = this;

      if (this.props.errorMsg) {
        return (<div className="error">{this.props.errorMsg}</div>);
      }

      if (!data.length) return;

      return data.map(function(row, i) {
        return (
          <Bar width={xScale(row.count)}
                country={row.country}
                count={numberFormatter(row.count)}
                selected={that.props.spotlight === row.country}
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

      var contained = (rows.offsetHeight < wrapper.offsetHeight) ? true : false;

      upBtn.disabled = (pos === 0 || contained);
      dwnBtn.disabled = (pos === bottom || contained);

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
      var spotlight = (this.props.spotlight) ? ' spotlight' : '';

      return (
        <div className={"bar-chart-container component" + spotlight}>
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
            count: 0,
            selected: false
        }
    },

    shouldComponentUpdate: function(nextProps) {
      return true;
    },

    render: function() {
        var selectedClass = (this.props.selected) ? ' selected' : '';
        return (
          <div className={"chartRow" + selectedClass} data-value={this.props.country}>
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