var React   = require('react');
var d3      = require('d3');


var root;
var size = 10;
var steps = 7;

var colors = ["#f6eff7","#d0d1e6","#a6bddb","#67a9cf","#3690c0","#02818a","#016450"].reverse();
var opacity = [0.15, 0.3, 0.45, 0.6, 0.75, .9, 1].reverse();

var LegendGrid = React.createClass({

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    root = d3.select(React.findDOMNode(this.refs.legend));
    size = Math.min(Math.floor(root.node().offsetWidth / steps), Math.floor(root.node().offsetHeight / steps));
  },

  componentWillUnmount: function() {
  },

  componentDidUpdate: function() {
    if (this.props.values && this.props.values.length) {
    }
  },

  renderGrid: function() {
    var items = []
    for (var i=0;i<steps;i++){
      for (var j=0;j<steps;j++){
        var k = "grid-" + i + "-" + j;
        var style = {
          width: size + 'px',
          height: size + 'px',
          top: (i*size) + 'px',
          left: (j*size) + 'px',
          background: colors[j],
          opacity: opacity[i]
        }
        items.push((<div key={k} className="grid-item" style={style}></div>));

      }
    }
    return items;
  },

  render: function() {
    var yMax = this.props.yDomain[1] || '';
    if(this.props.yFormatter) yMax = this.props.yFormatter(yMax);

    return (
        <div className="component legend grid" ref="legend">
          {this.renderGrid()}
          <div className="x axis top">100%</div>
          <div className="x axis bottom">0%</div>
          <div className="y axis left">{yMax}+</div>
          <div className="y axis right">0</div>
        </div>
    );

  }

});

module.exports = LegendGrid;