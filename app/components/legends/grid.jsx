var React   = require('react');
var d3      = require('d3');


var root, size = 0;
var LegendGrid = React.createClass({

  getDefaultProps: function () {
    return {
      steps: 5
    };
  },

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    root = d3.select(React.findDOMNode(this.refs.legend));

  },

  componentWillUnmount: function() {
  },

  componentDidUpdate: function() {
    size = Math.min(Math.floor((root.node().offsetWidth - 2) / this.props.steps), Math.floor((root.node().offsetHeight - 2) / this.props.steps));
    this.renderGrid(size);
  },

  renderGrid: function(size) {
    if (!root) return [];

    var blocks = d3.select(React.findDOMNode(this.refs.blocks));
    blocks.selectAll('.grid-item').remove();

    var xValues = this.props.xValues,
        yValues = this.props.yValues,
        steps = this.props.steps;

    for (var i=0;i<steps;i++){
      for (var j=0;j<steps;j++){
        blocks.append('rect')
          .attr('class', 'grid-item')
          .style({
            fill: yValues[i],
            'fill-opacity': xValues[j]
          })
          .attr('width', size)
          .attr('height', size)
          .attr('x', j*size)
          .attr('y', i*size);
      }
    }

    var labels = d3.select(React.findDOMNode(this.refs.labels));
    labels.selectAll('.label-item').remove();

    var wh = size * this.props.steps + 2;

    var yMax = this.props.axisLabels.yMax || '';
    var yMin = this.props.axisLabels.yMin || '';
    var xMax = this.props.axisLabels.xMax || '';
    var xMin = this.props.axisLabels.xMin || '';
    var yLabel = this.props.labels.y;
    var xLabel = this.props.labels.x;

    labels.append('text')
      .attr('class', 'label-item')
      .attr('x', wh + 3)
      .attr('y', wh)
      .attr('dy', '-2')
      .text(yMin)

    labels.append('text')
      .attr('class', 'label-item')
      .attr('x', wh + 3)
      .attr('y', 0)
      .attr('dy', '8')
      .text(yMax)

    labels.append('text')
      .attr('class', 'label-item')
      .attr('x', 0)
      .attr('y', wh)
      .attr('dy', '10')
      .text(xMax)

    labels.append('text')
      .attr('class', 'label-item')
      .attr('dy', '10')
      .attr('dx', '-2')
      .attr('text-anchor', 'end')
      .attr('x', wh)
      .attr('y', wh)
      .text(xMin)

    labels.append('text')
      .attr('class', 'label-item')
      .attr('dy', '-7')
      .attr('text-anchor', 'middle')
      .attr('x', wh/2)
      .attr('y', 0)
      .text(xLabel)

    labels.append('text')
      .attr('class', 'label-item')
      .attr('text-anchor', 'middle')
      .attr('x', 0)
      .attr('y', 0)
      .attr('transform', "rotate(-90,0,0) translate(-40, -7)")
      .text(yLabel);

  },

  render: function() {
    var wh = size * this.props.steps;
    return (
        <div className="component legend grid" ref="legend">
          <svg ref="svg" width={wh + 2} height={wh + 2}>
          <g ref="grid" transform="translate(1,1)">
            <g ref="blocks"></g>
            <g ref="labels"></g>
          </g>
          </svg>
        </div>
    );

  }

});

module.exports = LegendGrid;