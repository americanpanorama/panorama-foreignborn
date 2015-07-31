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

// Misc libraries
var hashManager = require('./lib/hashManager.js');

// Misc variables & functions
var decadeBounds = [1850,2010];
var numberFormatter = d3.format('0,');

// Set default hash state
hashManager.set({
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
});


var App = React.createClass({
  getInitialState: function () {
    // get hash state
    var fromHash = hashManager.parseHash(document.location.hash);
    var merged = hashManager.mergeHash(fromHash);

    return {
      decade: merged.decade.value,
      country: merged.country.value,
      county: merged.county.value,
      geographyData: GeographyStore.getDataByDecade(merged.decade.value),
    };
  },

  componentWillMount: function() {
    // Initialize Geography store
    GeographyStore.decade(this.state.decade);
    GeographyStore.county(this.state.county);
    GeographyStore.country(this.state.country);
    GeographyStore.decadeBounds(decadeBounds);

    this.toggleCountyClass(this.state.county);
  },

  componentDidMount: function() {
    // set the hash
    hashManager.updateHash(true);

    // get initial remote data
    Actions.getInitialData(this.state.decade, GeographyStore.getBackFill(), this.state.county, this.state.country);

    // set change listener for geography store
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
          } else if(obj.type === Constants.GET_COUNTY_BREAKDOWN_DATA) {
            this.setState({county: GeographyStore.county(), country:null});
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
      hashManager.mergeHash({decade: val});
      hashManager.updateHash(true);

      if (GeographyStore.decadeLoaded(val)) {
        GeographyStore.decade(val);
        GeographyStore.emitChange(Constants.GET_DECADE_DATA, 'GeographyStore');
      } else {
        Actions.getDataForDecade(val, GeographyStore.getBackFill(val))
      }
    }
  },

  toggleCountyClass: function(b) {
    d3.select('body').classed('has-county', b);
  },

  handleMapClick: function(obj) {
    if (obj.country) {
      hashManager.mergeHash({country: obj.country, county: null});
      hashManager.updateHash(true);
      this.toggleCountyClass(false);
      this.centralStateSetter({county: null, country:obj.country});
    } else {
      hashManager.mergeHash({county: obj.properties.nhgis_join, country: null});
      hashManager.updateHash(true);
      this.toggleCountyClass(true);

      if(GeographyStore.countyLoaded(obj.properties.nhgis_join)) {
        this.centralStateSetter({county: obj.properties.nhgis_join, country:null});
      } else {
        Actions.getSelectedCounty(obj.properties.nhgis_join);
      }
    }
  },

  render: function() {
    var that = this;
    var count = d3.sum(this.state.geographyData.country, function(d){ return d.count; });
    var legendValues = GeographyStore.getCountryScaleData();

    var countiesNames = this.state.geographyData.countyGeo.map(function(d){
      return d.properties.name + ", " + d.properties.state;
    });

    var countryOverlay = GeographyStore.getCountryPercents('all');
    var countyOverlay = (this.state.county) ? GeographyStore.getCountyPercents(this.state.county) : [];
    var countriesForCounties = (this.state.county) ? GeographyStore.getCountriesForCounties(this.state.county, this.state.decade) : [];

    var countiesFiltered = [];
    if (this.state.county) {
       countiesFiltered = this.state.geographyData.countyGeo.filter(function(d){
        return d.properties.nhgis_join === that.state.county;
      });
    }
    var legendName = (countiesFiltered.length) ? countiesFiltered[0].properties.name : '';
    var placeHolder = (legendName.length) ? legendName : "Search by county name";

    return (
      <div className='container full-height'>
        <header className="header">
          <h1>Foreign-Born Population</h1>
        </header>
        <section className="row">
          <div className="columns nine">
            <DisjointedWorldLayout
              onClickHandler={this.handleMapClick}
              loupeSelector='#loupe'
              decade={this.state.decade}
              selectedCounty={this.state.county}
              selectedCountry={this.state.country}
              countriesForCounties={countriesForCounties}
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
                  placeholder={placeHolder}
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
            <div id="loupe" className="component" ref="loupe"></div>
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
                    <Timeline overlay={countryOverlay} secondaryOverlay={countyOverlay} decade={this.state.decade} startDate={new Date('1/1/1850')} endDate={new Date('12/31/2010')} onSliderChange={this.decadeUpdate} />
                    <div className="timeline-legend left">Total Foreign-Born</div>
                    <div className="timeline-legend right">{legendName} Foreign-Born</div>
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