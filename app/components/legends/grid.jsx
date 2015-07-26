var React   = require('react');
var d3      = require('d3');


var root;
var size = 10;

var colors = ["#f6eff7","#d0d1e6","#a6bddb","#67a9cf","#3690c0","#02818a","#016450"].reverse();
var opacity = [0.1, 0.3, 0.5, 0.7, 0.9, 1].reverse();

var LegendGrid = React.createClass({

  getInitialState: function () {
    return {};
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    root = d3.select(React.findDOMNode(this.refs.legend));
    size = Math.min(Math.floor(root.node().offsetWidth / 6), Math.floor(80 / 6));

    root
      .style('width', (size * 6) + 'px')
      .style('height', '80px');


  },

  componentWillUnmount: function() {
  },

  componentDidUpdate: function() {
    console.log(this.props.values);
    if (this.props.values && this.props.values.length) {
    }
  },

  renderGrid: function() {


    var items = []
    for (var i=0;i<6;i++){
      for (var j=0;j<6;j++){
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

    return (
        <div className="component legend grid" ref="legend">
          {this.renderGrid()}
          <div className="x axis top">100%</div>
          <div className="x axis bottom">0%</div>
          <div className="y axis left">250+</div>
          <div className="y axis right">0</div>
        </div>
    );

  }

});

module.exports = LegendGrid;