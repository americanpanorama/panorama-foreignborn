/** @jsx React.DOM */

require('es6-promise').polyfill();

// NPM Modules
var React = require('react');

// Actions
var Actions = require('./actions/app');

// Stores
var GeographyStore = require('./stores/geography.js');

// Components
var DisjointedWorldLayout = require('./components/DisjointedWorldLayout.jsx');
var BarChart = require('./components/BarChart.jsx');
var Timeline = require('./components/Timeline.jsx');

var App = React.createClass({
  getInitialState: function () {
    return {
      geographyData: GeographyStore.getData(),
      decade: 1910
    };
  },

  componentWillMount: function() {

  },

  componentDidMount: function() {
    Actions.getInitialData({decade: this.state.decade});
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

  decadeUpdate: function() {
    var val = this.refs.inp.getDOMNode().value;
    if (val && this.state.decade !== val) {
      this.centralStateSetter({'decade': val});
    }
    //<input ref="inp" type="range" min="1850" max="2010" step="10" onChange={this.decadeUpdate}/>
    //console.log(this.refs.inp.getDOMNode().value)
  },

  render: function() {
    return (
      <div className='container full-height'>
        <header className="header">
          <h1>Foreign-Born Population</h1>
        </header>
        <section className="row">
          <div className="columns eight">
            <DisjointedWorldLayout decade={this.state.decade} countries={this.state.geographyData.countryByYear[this.state.decade] || []} counties={this.state.geographyData.countyByYear[this.state.decade] || []} world={this.state.geographyData.world}/>
          </div>
          <div className="columns four stacked">
            <BarChart width={300} height={400} title={this.state.decade + " Foreign Born"} rows={this.state.geographyData.countryByYear[this.state.decade] || []}/>
            <div id="population-readout" className="component">Totals</div>
            <div id="search-bar" className="component">Search</div>
            <div id="loupe" className="component">Loupe</div>
          </div>
        </section>
        <section className="row">
          <div className="columns eight">
            <div id="population-scale" className="component columns two">Scale</div>
            <div id="color-key" className="component columns two">Key</div>
            <Timeline startDate={new Date('1/1/1850')} endDate={new Date('12/31/2010')} />
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