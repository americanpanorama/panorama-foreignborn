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

  svg.selectAll('circle').remove();
  svg.selectAll('text').remove();

  var circle = svg.selectAll('circle')
    .data(data);

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

      // should be the smallest radius on bottom
      if (i === 0) y -= 4;

      return y;
    });

}
var LegendNestedCircles = React.createClass({

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    supported();
    root = d3.select(React.findDOMNode(this.refs.legend));
    svg = root.append('svg')
      .attr('width', root.node().offsetWidth)
      .attr('height', '90');
  },

  componentWillUnmount: function() {

  },

  componentDidUpdate: function() {
    if (this.props.values && this.props.values.length) {
      update(this.props.values);
    }
  },

  render: function() {

    return (
        <div className="component legend nested-circle" ref="legend">

        </div>
    );

  }

});

module.exports = LegendNestedCircles;