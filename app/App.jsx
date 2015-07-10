/** @jsx React.DOM */

// NPM Modules
var React = require('react');

// Actions
var Actions = require('./actions/app');

// Stores
var GeographyStore = require('./stores/geography.js');

// Components
var DisjointedWorldLayout = require('./components/DisjointedWorldLayout.jsx');

var App = React.createClass({
  getInitialState: function () {
    return {
      geographyData: {},
    };
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    Actions.getInitialData({});
    GeographyStore.addChangeListener(this.onChange);
  },

  componentWillUnmount: function() {

  },

  componentDidUpdate: function() {

  },

  // Better control of all the state requests
  // Also easier to debug
  centralStateSetter: function(obj) {
    if (obj.caller) {
      // Handle store data changes
      // Faster to assign data to state, than putting function into component properties
      switch(obj.caller) {
        case "GeographyStore":
          this.setState({'geographyData': GeographyStore.getData()});
        break;
      }
    } else {
      var out = {};
      for (var k in obj) {
        if (this.state[k] !== obj[k] || k === 'dimensions') {
          out[k] = obj[k];
        }
      }

      if(Object.keys(out).length)this.setState(out);
    }

  },

  onChange: function(e) {
    this.centralStateSetter(e);
  },

  render: function() {
    return (
      <div className='container full-height'>
        <header className="header">
          <h1>Foreign-Born Population</h1>
        </header>
        <section className="row">
          <div className="columns eight">
            <DisjointedWorldLayout geography={this.state.geographyData}/>
          </div>
          <div className="columns four stacked">
            <div id="bar-chart" className="component">Bar chart</div>
            <div id="population-readout" className="component">Totals</div>
            <div id="search-bar" className="component">Search</div>
            <div id="loupe" className="component">Loupe</div>
          </div>
        </section>
        <section className="row">
          <div className="columns eight">
            <div id="population-scale" className="component">Scale</div>
            <div id="color-key" className="component">Key</div>
            <div id="time-slider" className="component">Slider</div>
          </div>
          <div className="columns four">
            <div id="about-time-period">About time period</div>
          </div>
        </section>
      </div>
    );
  }

});

module.exports = App;