/** @jsx React.DOM */

require('es6-promise').polyfill();

// NPM Modules
var React = require('react');

var Constants = require('./constants/Constants.js');

// Actions
var Actions = require('./actions/app');
var AppDispatcher = require("./dispatchers/app");

// Stores
var GeographyStore = require('./stores/geography.js');

// Components
var DisjointedWorldLayout = require('./components/DisjointedWorldLayout.jsx');
var BarChart = require('./components/BarChart.jsx');
var Timeline = require('./components/Timeline.jsx');


var decadeBounds = [1850,2010];
var initialDecade = 1850;


var App = React.createClass({
  getInitialState: function () {
    return {
      decade: initialDecade,
      geographyData: GeographyStore.getDataByDecade(initialDecade),
    };
  },

  componentWillMount: function() {
    GeographyStore.decade(initialDecade);
    GeographyStore.decadeBounds(decadeBounds);
  },

  componentDidMount: function() {
    Actions.getInitialData(this.state.decade, GeographyStore.getBackFill());
    GeographyStore.addChangeListener(this.onChange);
  },

  componentWillUnmount: function() {
    GeographyStore.removeChangeListener(this.onChange);
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
          if (obj.type === Constants.GET_DECADE_DATA) {

            this.setState({'decade': GeographyStore.decade(), 'geographyData': GeographyStore.getDataByDecade(GeographyStore.decade()) });
          } else {
            this.setState({'geographyData': GeographyStore.getDataByDecade(this.state.decade)});
          }

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

  decadeUpdate: function(val) {
    val = val.getFullYear();

    if (val && this.state.decade !== val) {
      if (GeographyStore.decadeLoaded(val)) {
        console.log("%s loaded.", val);
        GeographyStore.decade(val);
        GeographyStore.emitChange(Constants.GET_DECADE_DATA, 'GeographyStore');
      } else {
        //var backfill = GeographyStore.getBackFill(val);
        Actions.getDataForDecade(val, GeographyStore.getBackFill(val))
        //console.log(val, GeographyStore.getBackFill(val))
      }

      //this.centralStateSetter({'decade': val});
    }
  },

  render: function() {
    return (
      <div className='container full-height'>
        <header className="header">
          <h1>Foreign-Born Population</h1>
        </header>
        <section className="row">
          <div className="columns eight">
            <DisjointedWorldLayout
              decade={this.state.decade}
              countries={this.state.geographyData.country || []}
              counties={this.state.geographyData.countyGeo || []}
              world={this.state.geographyData.world}
            />
          </div>
          <div className="columns four stacked">
            <BarChart width={300} height={400} title={this.state.decade + " Foreign Born"} rows={this.state.geographyData.country || []}/>
            <div id="population-readout" className="component">Totals</div>
            <div id="search-bar" className="component">Search</div>
            <div id="loupe" className="component">Loupe</div>
          </div>
        </section>
        <section className="row">
          <div className="columns eight">
            <div id="population-scale" className="component columns two">Scale</div>
            <div id="color-key" className="component columns two">Key</div>
            <Timeline decade={this.state.decade} startDate={new Date('1/1/1850')} endDate={new Date('12/31/2010')} onSliderChange={this.decadeUpdate} />
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