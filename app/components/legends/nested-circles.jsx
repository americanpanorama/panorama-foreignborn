var React   = require('react');
var d3      = require('d3');

var root,svg;


function supported() {
  // test for mix-blend-mode
  if('CSS' in window && 'supports' in window.CSS) {
      var support = window.CSS.supports('mix-blend-mode','soft-light');
          support = support?'mix-blend-mode':'no-mix-blend-mode';
          d3.select('body').classed(support, true);
  }
}

function update(data) {
  if (!svg) return;

  var max = d3.max(data, function(d){
    return d.r;
  });

  svg.attr('height', max * 2);
  svg.attr('width', (max * 2) + 130);

  svg.selectAll('circle').remove();
  svg.selectAll('text').remove();

  var circle = svg.selectAll('circle')
    .data(data.sort(function (a, b) {
      return b.r - a.r; 
    }));

  circle.enter().append('circle')
    .attr('r', function(d){
      return d.r;
    })
    .attr('cx', function(d){
      return max;
    })
    .attr('cy', function(d){
      return (max * 2) - d.r;
    });

  var text = svg.selectAll('text')
    .data(data);

  text.enter().append('text')
    .text(function(d){ return d.label;})
    .attr('x', (max * 2) + 10)
    .attr('dy', '0.8em')
    .attr('y', function(d,i){
      var y = (max * 2) - (d.r * 2);

      return y;
    });

}
var drawn = false;
var LegendNestedCircles = React.createClass({

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  testEquality: function(a,b) {
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; ++i) {
      if (a[i].r !== b[i].r) return false;
    }
    return true;
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.testEquality(nextProps.values, this.props.values);
  },

  componentDidMount: function() {
    supported();
    root = d3.select(React.findDOMNode(this.refs.legend));
    svg = d3.select(React.findDOMNode(this.refs.svg));
  },

  componentWillUnmount: function() {

  },

  componentDidUpdate: function() {
    if (this.props.values && this.props.values.length) {
      drawn = true;
      update(this.props.values);
    }
  },

  render: function() {

    return (
        <div className="component legend nested-circle" ref="legend">
          <svg ref="svg"></svg>
        </div>
    );

  }

});

module.exports = LegendNestedCircles;
