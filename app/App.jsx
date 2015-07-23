/** @jsx React.DOM */

require('es6-promise').polyfill();

// NPM Modules
var React = require('react');
var Typeahead = require('react-typeahead').Typeahead;

// Constants
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
var LegendNestedCircles = require('./components/legends/nested-circles.jsx');
var LegendGrid = require('./components/legends/grid.jsx');


var decadeBounds = [1850,2010];
var initialDecade = 1850;
var numberFormatter = d3.format('0,');


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
    var count = d3.sum(this.state.geographyData.country, function(d){ return d.count; });
    var legendValues = GeographyStore.getCountryScaleData();

    var countiesNames = this.state.geographyData.countyGeo.map(function(d){
      return d.properties.name + ", " + d.properties.state;
    })

    return (
      <div className='container full-height'>
        <header className="header">
          <h1>Foreign-Born Population</h1>
        </header>
        <section className="row">
          <div className="columns nine">
            <DisjointedWorldLayout
              decade={this.state.decade}
              countries={this.state.geographyData.country || []}
              counties={this.state.geographyData.countyGeo || []}
              world={this.state.geographyData.world}
            />
          </div>
          <div className="columns three stacked">
            <BarChart width={300} height={400} title={this.state.decade + " Foreign Born"} rows={this.state.geographyData.country || []}/>
            <div id="population-totals">
              <h3>Total Foreign-Born</h3>
              <p><span className="decade">{this.state.decade}</span><span className="total">{numberFormatter(count)}</span></p>
            </div>
            <div id="search-bar" className="component">
              <Typeahead
                options={countiesNames}
                maxVisible={5}
                placeholder="Search by county name"
              />
            </div>
            <div id="loupe" className="component">Loupe</div>
          </div>
        </section>
        <section className="row">
          <div className="columns eight">
            <div className="row">
              <div id="population-scale" className="columns two">
                <LegendNestedCircles values={legendValues}/>
              </div>
              <div id="color-key" className="columns two">
                <LegendGrid/>
              </div>
              <div id="timeline-container" className="columns eight">
                <Timeline decade={this.state.decade} startDate={new Date('1/1/1850')} endDate={new Date('12/31/2010')} onSliderChange={this.decadeUpdate} />
              </div>
            </div>
          </div>
          <div className="columns four">
            <div id="about-time-period" className="row">
                <h3 className="columns three "><span>About the {this.state.decade}'s</span></h3>
                <p className="columns nine">
                  A county is a political and geographic subdivision of a state, usually assigned some governmental authority. The term "county" is used in 48 of the 50 U.S. states. The exceptions are Louisiana and Alaska.
                </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

});

module.exports = App;