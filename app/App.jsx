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
var LayoutStore = require('./stores/layout.js').initialize();

// Components
var DisjointedWorldLayout = require('./components/DisjointedWorldLayout.jsx');
var BarChart = require('./components/BarChart.jsx');
var Timeline = require('./components/Timeline.jsx');
var LegendNestedCircles = require('./components/legends/nested-circles.jsx');
var LegendGrid = require('./components/legends/grid.jsx');
var Loupe = require('./components/Loupe.jsx');

// Misc libraries
var hashManager = require('./lib/hashManager.js');

// Misc variables & functions
var decadeBounds = [1850,2010];
var numberFormatter = d3.format('0,');

var clearMe = 0;

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

// Set Layout
LayoutStore.block({
  key: 'bottom-row',
  height: 100,
  measure: ['height']
});

LayoutStore.block({
  key: 'map',
  height: 'flex',
  dependsOn: ['bottom-row'],
  measure: ['height']
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

    // Layout
    LayoutStore.force();
    //console.log('Width: ', LayoutStore.get())

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
        Actions.getDataForDecade(val, GeographyStore.getBackFill(val), this.state.county)
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

  closeSelectedPlace: function() {
    if (this.state.county) {
      hashManager.mergeHash({county: null});
      hashManager.updateHash(true);
      this.toggleCountyClass(false);
      this.centralStateSetter({county: null});

    } else if (this.state.country) {

      hashManager.mergeHash({country: null});
      hashManager.updateHash(true);
      this.toggleCountyClass(false);
      this.centralStateSetter({country: null});
    }

  },

  onSearchChange: function(result, evt) {
    evt.preventDefault();
    evt.stopPropagation();
    var parts = result.split(',');
    if (!parts.length === 2) {
      return console.warn('Search result missing parts.', parts);
    }
    clearMe = 1;

    var cty = parts[0].replace(/(^\s+|\s+$)/g, ''),
        state = parts[1].replace(/(^\s+|\s+$)/g, '');

    var filtered = this.state.geographyData.countyGeo.filter(function(d){
      return d.properties.name == cty && d.properties.state == state;
    });

    if (filtered.length) {

      hashManager.mergeHash({county: filtered[0].properties.nhgis_join, country: null});
      hashManager.updateHash(true);
      this.toggleCountyClass(true);

      if(GeographyStore.countyLoaded(filtered[0].properties.nhgis_join)) {
        this.centralStateSetter({county: filtered[0].properties.nhgis_join, country:null});
      } else {
        Actions.getSelectedCounty(filtered[0].properties.nhgis_join);
      }
    }

  },

  render: function() {
    var that = this;

    // calculate layout heights
    var windowPadding = 10;
    var windowHeight = window.innerHeight;
    windowHeight = Math.max(windowHeight, 670);
    windowHeight -= windowPadding * 2;

    var headerHeight = 48;
    var bottomHeight = 100;
    var middleHeight = windowHeight - bottomHeight;
    var mapHeight = middleHeight - headerHeight;

    var popTotalHeight = 99;
    var searchHeight = 55;
    var loupHeight = 184;
    var barchartCountyClose = 30;

    var barChartHeight = middleHeight - (popTotalHeight + searchHeight + 20);

    if (this.state.county) {
      barChartHeight -= (loupHeight + barchartCountyClose);
    } else if (this.state.country) {
      barChartHeight -= barchartCountyClose;
    }

    // Misc calculations
    // TODO: Find a better home for these

    var countiesNames = this.state.geographyData.countyGeo.map(function(d){
      return d.properties.name + ", " + d.properties.state;
    });

    var countryOverlay = GeographyStore.getCountryPercents('all');
    var secondaryOverlay = [];
    if (this.state.county) {
      secondaryOverlay = GeographyStore.getCountyPercents(this.state.county);
    } else if (this.state.country) {
      secondaryOverlay = GeographyStore.getSelectedCountry(this.state.country);
    }

    var countriesForCounties = (this.state.county) ? GeographyStore.getCountriesForCounties(this.state.county, this.state.decade) : [];

    var legendValues;

    if (countriesForCounties.length) {
      legendValues = GeographyStore.getCountryScaleData(countriesForCounties)
    } else {
      legendValues = GeographyStore.getCountryScaleData();
    }

    var yDomainMax = d3.max(this.state.geographyData.countyGeo, function(d){
      return d.properties.density;
    });
    var yDomain = [0, GeographyStore.round(yDomainMax)];
    //

    var countiesFiltered = [];
    if (this.state.county) {
       countiesFiltered = this.state.geographyData.countyGeo.filter(function(d){
        return d.properties.nhgis_join === that.state.county;
      });
    }

    var count = 0;
    var percent = '';
    var t;
    if (countriesForCounties.length) {
      count = d3.sum(countriesForCounties, function(d){ return d.count; });

      t = countriesForCounties[0].place_total;
      percent = d3.format('%')(count/t);

    } else if (this.state.country) {
      t = secondaryOverlay.filter(function(d){
        return d.year == that.state.decade;
      });
      if (t.length) {
        count = t[0].count;
        percent = d3.format('%')(t[0].pct);
      }

    } else {
      count = d3.sum(this.state.geographyData.country, function(d){ return d.count; });
      t = countryOverlay.filter(function(d){
        return d.date.getFullYear() === that.state.decade;
      });

      if (t.length) {
        percent = d3.format('%')(t[0].pct);
      }
    }


    var placeName = (countiesFiltered.length) ? countiesFiltered[0].properties.name + ', ' + countiesFiltered[0].properties.state : '';
    var placeNameShort = (countiesFiltered.length) ? countiesFiltered[0].properties.name : '';
    var placeHolder = (placeName.length) ? placeName : "Search by county name";

    if (this.state.country) {
      placeName = this.state.country;
      placeNameShort = this.state.country;
    }

    var bardata = this.state.geographyData.country || [];
    if (countriesForCounties.length) bardata = countriesForCounties;

    // Work around to clear input value of the search input
    var shouldClearInput = false;
    if(clearMe === 1) {
      shouldClearInput = true;
    }
    clearMe = 0;

    // render DOM-ish
    return (
      <div className='container full-height' style={{paddingTop: windowPadding + 'px'}}>
        <section className="row">
          <div className="columns nine" style={{height: middleHeight + 'px'}}>
            <header className="header">
              <div className="table">
                <div className="td">
                  <span className="decorative-decade">1810</span><h1>Foreign-Born<br/>Population</h1><span className="decorative-decade">2010</span>
                </div>
                <p className="tagline">A Nation of Overlapping Diasporas</p>
              </div>
            </header>
            <div style={{height: mapHeight + 'px'}}>
              <DisjointedWorldLayout
                onClickHandler={this.handleMapClick}
                decade={this.state.decade}
                selectedCounty={this.state.county}
                selectedCountry={this.state.country}
                countriesForCounties={countriesForCounties}
                countries={this.state.geographyData.country || []}
                counties={this.state.geographyData.countyGeo || []}
                world={this.state.geographyData.world}
              />
            </div>
          </div>
          <div className="columns three stacked" style={{height: middleHeight + 'px'}}>
            <div id="bar-chart">
              <h3>{this.state.decade + " Foreign Born"}</h3>
              {placeName &&
              <div id="barchart-county-close"><button onClick={this.closeSelectedPlace} className='link'>{placeName}<span className="close">[<span className="close-x">×</span>]</span></button></div>
              }
              <BarChart onBarClickHandler={this.handleMapClick} width={300} spotlight={this.state.country} height={barChartHeight} rows={bardata}/>
            </div>

            <div id="population-totals">
              <h3>Total Foreign-Born</h3>
              <p><span className="decade">{this.state.decade}</span><span className="total">{numberFormatter(count)}</span><span className="percent">{percent}</span></p>
            </div>

            <div id="search-bar" className="component">
              <div id="typeahead-container">
                <Typeahead
                  options={countiesNames}
                  maxVisible={5}
                  clearInputValue={shouldClearInput}
                  placeholder={placeHolder}
                  onOptionSelected={this.onSearchChange}
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
            <Loupe filterOn={this.state.county} data={this.state.geographyData.countyGeo || []}/>
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
                    <LegendGrid yDomain={yDomain} yFormatter={d3.format('s')}/>
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
                    <Timeline overlay={countryOverlay} secondaryOverlay={secondaryOverlay} decade={this.state.decade} startDate={new Date('1/1/1850')} endDate={new Date('12/31/2010')} onSliderChange={this.decadeUpdate} />
                    <div className="timeline-legend left">Total Foreign-Born</div>
                    <div className="timeline-legend right">{placeNameShort} Foreign-Born</div>
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