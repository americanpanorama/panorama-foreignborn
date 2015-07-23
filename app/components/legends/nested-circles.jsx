var React   = require('react');
var d3      = require('d3');

var root,svg;

function update(data) {
  if (!svg) return;

  var circle = svg.selectAll('circle')
    .data(data);

  var max = d3.max(data, function(d){
    return d.r;
  });
  data.sort(function(a,b){
    return a.r -b.r;
  })
  circle.enter().append('circle')
    .attr('r', function(d){
      return d.r;
    })
    .attr('cx', function(d){
      return max;
    })
    .attr('cy', function(d){
      return 90 - d.r;
    })

}
var LegendNestedCircles = React.createClass({

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    root = d3.select(React.findDOMNode(this.refs.legend));
    svg = root.append('svg')
      .attr('width', root.node().offsetWidth)
      .attr('height', '90');

  },

  componentWillUnmount: function() {
  },

  componentDidUpdate: function() {
    console.log(this.props.values);
    if (this.props.values && this.props.values.length) {
      update(this.props.values);
    }
  },

  render: function() {

    return (
        <div className="component legend" ref="legend">

        </div>
    );

  }

});

module.exports = LegendNestedCircles;