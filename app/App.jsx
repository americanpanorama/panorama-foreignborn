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
var numberFormatter = d3.format('0,');


var App = React.createClass({
  // These will act as defaults
  hashParams: {
    decade: {
      required: true,
      default: 1850,
      value: 1850,
      type: "Number"
    },
    county: {
      required: false,
      value: null
    },
    country: {
      required: false,
      value: null
    }
  },

  parseHash: function(hash) {
    var out = {};
    if (!hash) return out;

    if(hash.indexOf('#') === 0) {
      hash = hash.substr(1);
    }

    var that = this;
    var things = hash.split('&').map(function(d){return d.split('=');});

    things.forEach(function(thing){
      if (thing[0] in that.hashParams && thing[1] != '') {
        out[thing[0]] = thing[1];
      }
    });

    return out;
  },

  mergeHash: function(params) {
    for (var k in params) {
      if (k in this.hashParams) {
        var value = params[k];
        /*
        if (!value.length) value = null;
        if (!value && this.hashParams[k].required) value = this.hashParams[k].default;

        if (value && this.hashParams[k].type === "Number") value = +value;
        */
        this.hashParams[k].value = value;
      }
    }
  },

  updateHash: function(silent) {
    var out = [];

    for (var k in this.hashParams) {
      var v = this.hashParams[k].value;

      if (v !== null) {
        console.log(k,v)
        out.push(k + '=' + v);
      }
    }

    var hash = "#" + out.join('&');
    if (document.location.hash !== hash) document.location.replace(hash);
  },

  getInitialState: function () {
    var fromHash = this.parseHash(document.location.hash);
    this.mergeHash(fromHash);

    return {
      decade: this.hashParams.decade.value,
      geographyData: GeographyStore.getDataByDecade(this.hashParams.decade.value),
    };
  },

  componentWillMount: function() {
    GeographyStore.decade(this.state.decade);
    GeographyStore.decadeBounds(decadeBounds);
  },

  componentDidMount: function() {
    this.updateHash(true);
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
      this.mergeHash({decade: val});
      this.updateHash(true);

      if (GeographyStore.decadeLoaded(val)) {
        GeographyStore.decade(val);
        GeographyStore.emitChange(Constants.GET_DECADE_DATA, 'GeographyStore');
      } else {
        Actions.getDataForDecade(val, GeographyStore.getBackFill(val))
      }
    }
  },

  handleMapClick: function(obj) {
    if (obj.country) {
      this.mergeHash({country: obj.country, county: null});
      this.updateHash(true);
    } else {
      this.mergeHash({county: obj.properties.nhgis_join, country: null});
      this.updateHash(true);
    }

  },

  render: function() {
    var count = d3.sum(this.state.geographyData.country, function(d){ return d.count; });
    var legendValues = GeographyStore.getCountryScaleData();

    var countiesNames = this.state.geographyData.countyGeo.map(function(d){
      return d.properties.name + ", " + d.properties.state;
    });

    var countryOverlay = GeographyStore.getCountryPercents('all');

    return (
      <div className='container full-height'>
        <header className="header">
          <h1>Foreign-Born Population</h1>
        </header>
        <section className="row">
          <div className="columns nine">
            <DisjointedWorldLayout
              onClickHandler={this.handleMapClick}
              decade={this.state.decade}
              countries={this.state.geographyData.country || []}
              counties={this.state.geographyData.countyGeo || []}
              world={this.state.geographyData.world}
            />
          </div>
          <div className="columns three stacked">
            <BarChart onBarClickHandler={this.handleMapClick} width={300} height={400} title={this.state.decade + " Foreign Born"} rows={this.state.geographyData.country || []}/>
            <div id="population-totals">
              <h3>Total Foreign-Born</h3>
              <p><span className="decade">{this.state.decade}</span><span className="total">{numberFormatter(count)}</span></p>
            </div>
            <div id="search-bar" className="component">
              <div id="typeahead-container">
                <Typeahead
                  options={countiesNames}
                  maxVisible={5}
                  placeholder="Search by county name"
                />
              </div>
              <button>
                <svg xmlns="http://www.w3.org/2000/svg" width="14.6px" height="14.6px" viewBox="0 0 14.6 14.6" >
                  <path fill="#FFFFFF" d="M12.9,1.7c-2.2-2.2-5.8-2.2-8,0c-1.8,1.8-2.1,4.6-1,6.7l-3.4,3.4c-0.6,0.6-0.6,1.6,0,2.2l0.1,0.1
                  c0.6,0.6,1.6,0.6,2.2,0l3.4-3.4c2.2,1.2,4.9,0.8,6.7-1C15.1,7.5,15.1,3.9,12.9,1.7z M11.3,8C10,9.4,7.8,9.4,6.5,8
                  c-1.3-1.3-1.3-3.4,0-4.7s3.4-1.3,4.7,0C12.6,4.6,12.6,6.7,11.3,8z"/>
                </svg>
              </button>

            </div>
            <div id="loupe" className="component"></div>
          </div>
        </section>
        <section className="row">
          <div className="columns eight">
            <div className="row">
              <div className="columns five">
                <div id="legends-container" className="table">
                  <div className="td">
                    <LegendNestedCircles values={legendValues}/>
                  </div>
                  <div className="td">
                    <LegendGrid/>
                  </div>
                </div>
              </div>
              <div id="timeline-container" className="columns seven">
                <div className="wrapper">
                  <div className="title">
                    <h3>Population</h3>
                    <h3>Over Time</h3>
                  </div>
                  <div>
                    <Timeline overlay={countryOverlay} decade={this.state.decade} startDate={new Date('1/1/1850')} endDate={new Date('12/31/2010')} onSliderChange={this.decadeUpdate} />
                    <div className="timeline-legend left">Total Foreign-Born</div>
                    <div className="timeline-legend right">Swiss Foreign-Born</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="columns four">
            <div id="about-time-period" className="row">
                <div className="columns three title">
                  <h3>About</h3>
                  <p><span className="small">the</span> <span>{this.state.decade}'s</span></p>
                </div>
                <p className="columns nine description">
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