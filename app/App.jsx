/** @jsx React.DOM */

require('es6-promise').polyfill();

// NPM Modules
var React = require('react');
var Typeahead = require('react-typeahead').Typeahead;
var Modal = require('react-modal');

// Constants
var Constants = require('./constants/Constants.js');

// Actions
var Actions = require('./actions/app');
var AppDispatcher = require("./dispatchers/app");

// Stores
var GeographyStore = require('./stores/geography.js');
var LayoutStore = require('./stores/layout.js').initialize();
var Scales = require('./stores/scales.js');
var ForeignBornCopy = require('./stores/foreignbornCopy.js');
var Intro = require("./stores/introStore.js");

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
var percentFormatter = function(v){
  if (v === 0) return "";

  // above 1%
  if (v >= 0.01) return d3.format('.1%')(v);

  // convert
  v *= 100;
  if (v > 0.1) return d3.format('.1f')(v) + '%';
  if (v >= 0.01) return d3.format('.2f')(v) + '%';
  if (v < 0.01) return "< 0.01%";

}

var clearMe = 0;
var viewportDirty = false;
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

function debounce(fn, delay) {
  var timeout;
  return function() {
    clearTimeout(timeout);
    var that = this, args = arguments;
    timeout = setTimeout(function() {
      fn.apply(that, args);
    }, delay);
  };
}


var App = React.createClass({

  getDefaultProps: function() {
    return {
      valuesForGrid: Scales.getValuesForGridKey(),
      radiusScaleValuesForLegend: Scales.getRadiusForLegend(),
      radiusScale: Scales.radius,
      colorScale: Scales.colors,
      opacityScale: Scales.opacity
    }
  },

  getInitialState: function () {
    // get hash state
    var fromHash = hashManager.parseHash(document.location.hash);
    var merged = hashManager.mergeHash(fromHash);

    return {
      decade: merged.decade.value,
      country: merged.country.value,
      county: merged.county.value,
      geographyData: GeographyStore.getDataByDecade(merged.decade.value),
      about: false,
      width: window.innerWidth
    };
  },

  componentWillMount: function() {
    // Initialize Geography store
    GeographyStore.decade(this.state.decade);
    GeographyStore.county(this.state.county);
    GeographyStore.country(this.state.country);
    GeographyStore.decadeBounds(decadeBounds);

    // Layout
    LayoutStore.initialize();

    this.toggleCountyClass(this.state.county);
    this.toggleCountryClass(this.state.country);

    Modal.setAppElement(document.querySelector("body"));
  },

  componentDidMount: function() {
    // set the hash
    hashManager.updateHash(true);

    // get initial remote data
    Actions.getInitialData(this.state.decade, GeographyStore.getBackFill(), this.state.county, this.state.country);

    // set change listener for geography store
    GeographyStore.addChangeListener(this.onChange);
    LayoutStore.addChangeListener(this.onResize);


    Intro.init();
  },

  componentWillUnmount: function() {
    GeographyStore.removeChangeListener(this.onChange);
    Intro.destroy();
    LayoutStore.destroy();
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
          } else if(obj.type === Constants.GET_COUNTRY_BREAKDOWN_DATA) {
            this.setState({county: null, country:GeographyStore.country()});
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
        Actions.getDataForDecade(val, GeographyStore.getBackFill(val), this.state.county, this.state.country)
      }

    }
  },

  onResize: function(e) {
    var w = LayoutStore.get('window','width');
    console.log('Resize: ', w)
    if (w !== this.state.width) {
      viewportDirty = true;
      this.centralStateSetter({"width":w});
    }
  },

  openIntro: function(e) {
    if (this.state.showAbout) this.toggleAbout();
    Intro.open(e);
  },

  toggleAbout: function() {
    if (Intro.state) Intro.exit();
    console.log(this.state.about)
    this.centralStateSetter({"about":!this.state.about});
  },

  toggleCountyClass: function(b) {
    d3.select('body').classed('has-county', b);
  },

  toggleCountryClass: function(b) {
    d3.select('body').classed('has-country', b);
  },

  handleMapClick: function(obj) {
    if (obj.country) {
      hashManager.mergeHash({country: obj.country, county: null});
      hashManager.updateHash(true);
      this.toggleCountyClass(false);
      this.toggleCountryClass(true);

      if(GeographyStore.countryLoaded(obj.country, this.state.decade)) {
        this.centralStateSetter({county: null, country:obj.country});
      } else {
        Actions.getSelectedCountry(obj.country, this.state.decade);
      }


    } else {
      hashManager.mergeHash({county: obj.properties.nhgis_join, country: null});
      hashManager.updateHash(true);
      this.toggleCountyClass(true);
      this.toggleCountryClass(false);

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
      this.toggleCountryClass(false);
      this.centralStateSetter({county: null});

    } else if (this.state.country) {

      hashManager.mergeHash({country: null});
      hashManager.updateHash(true);
      this.toggleCountyClass(false);
      this.toggleCountryClass(false);
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
      this.toggleCountryClass(false);

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
    var bottomHeight = 124;
    var middleHeight = windowHeight - bottomHeight;
    var mapHeight = middleHeight - headerHeight;

    var popTotalHeight = 99;
    var searchHeight = 55;
    var loupHeight = 184;
    var barchartCountyClose = 30;

    var barChartHeight = middleHeight - (popTotalHeight + searchHeight + 20);

    barChartHeight += 24; // add difference between bottomHeight & actual height of About text block

    if (this.state.county) {
      barChartHeight -= (loupHeight + barchartCountyClose);
    } else if (this.state.country) {
      barChartHeight -= barchartCountyClose;
    }

    // Misc calculations
    // TODO: Find a better home for these
    var error = null;

    var countiesNames = this.state.geographyData.countyGeo.map(function(d){
      return d.properties.name + ", " + d.properties.state;
    });

    var overallOverlay = GeographyStore.getCountryPercents('all');
    var secondaryOverlay = [];
    var radiusScale = this.props.radiusScale;
    var radiusLegend = this.props.radiusScaleValuesForLegend;
    var opacityScale = this.props.opacityScale;
    var colorScale =  this.props.colorScale;
    var valuesForGrid = this.props.valuesForGrid;
    var countriesForCounties = [];
    var countiesFiltered = [];
    var countiesForCountry = [];
    var count = 0;
    var percent = '';
    var t;
    var totalName = "Total Foreign-Born";

    if (this.state.county) {
      secondaryOverlay = GeographyStore.getCountyPercents(this.state.county);

      countriesForCounties = GeographyStore.getCountriesForCounty(this.state.county, this.state.decade);
      radiusScale = Scales.makeCountyRadiusScale(countriesForCounties);
      radiusLegend = Scales.getLegendForCounty(radiusScale);

      var exist = this.state.geographyData.countyGeo.filter(function(d){
        return d.properties.nhgis_join === that.state.county;
      });

      countiesFiltered = secondaryOverlay.filter(function(d){
        return d.name && d.name.length;
      });

      t = secondaryOverlay.filter(function(d){
        return d.year == that.state.decade;
      });

      if (t.length) {
        count = numberFormatter(t[0].fbTotal);
        percent = percentFormatter(t[0].pct);
      }

      if (!exist.length) {
        error = ForeignBornCopy.errors['NO_COUNTY'];
        percent = "";
        count = "N/A";

      } else if (exist.length && count <= 0) {
        error = ForeignBornCopy.errors['NO_COUNTY_DATA'];
        count = 0;
        percent = "0%";

      } else if (countriesForCounties.length < 1) {
        error = ForeignBornCopy.errors['NO_COUNTRY_DATA_FOR_COUNTY'];
      }

      totalName = "County Total";

    } else if (this.state.country) {
      secondaryOverlay = GeographyStore.getSelectedCountry(this.state.country);
      t = secondaryOverlay.filter(function(d){
        return d.year == that.state.decade;
      });
      if (t.length) {
        count = numberFormatter(t[0].count);
        percent = percentFormatter(t[0].pct);
      }

      countiesForCountry = GeographyStore.getCountiesForCountry(this.state.country, this.state.decade);
      colorScale = Scales.adjustColorScale(countiesForCountry, 'pct');

      var colorDomain = colorScale.domain();
      var yMax = Math.floor(colorDomain[colorDomain.length-1] * 100) + '%';
      valuesForGrid = Scales.getValuesForGridKey(null, null, null, yMax, null, null);
      // opacityScale

    } else {
      count = d3.sum(this.state.geographyData.country, function(d){ return d.count; });
      count = numberFormatter(count);
      t = overallOverlay.filter(function(d){
        return d.date.getFullYear() === that.state.decade;
      });

      if (t.length) {
        percent = percentFormatter(t[0].pct);
      }
    }


    var placeName = (countiesFiltered.length) ? countiesFiltered[0].name + ', ' + countiesFiltered[0].state : '';
    var placeNameShort = (countiesFiltered.length) ? countiesFiltered[0].name : '';
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
    var redrawMap = (viewportDirty) ? true : false;
    viewportDirty = false;


    // render DOM-ish
    return (
      <div className='container full-height' style={{paddingTop: windowPadding + 'px'}}>
        <section className="row">
          <div className="columns nine" style={{height: middleHeight + 'px'}}>
            <header className="header">
              <div className="table">
                <div className="td">
                  <span className="decorative-decade">1850</span><h1>Foreign-Born<br/>Population</h1><span className="decorative-decade">2010</span>
                </div>
                <p className="tagline">A Nation of Overlapping Diasporas</p>
              </div>
              <button className="link" onClick={this.toggleAbout}>About this map</button>
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
                radiusScale={radiusScale}
                colorScale={colorScale}
                opacityScale={opacityScale}
                countiesForCountry={countiesForCountry}
                redraw={redrawMap}
              />
            </div>
          </div>
          <div className="columns three stacked" style={{height: middleHeight + 'px'}}>
            <div id="bar-chart">
              <h3><button className="link intro" data-step="0" onClick={this.openIntro}><span className="icon info"></span></button><span>{this.state.decade + " Foreign Born"}</span></h3>
              {placeName &&
              <div id="barchart-county-close"><button onClick={this.closeSelectedPlace} className='link'>{placeName}<span className="close">[<span className="close-x">×</span>]</span></button></div>
              }
              <BarChart errorMsg={error} onBarClickHandler={this.handleMapClick} width={300} spotlight={this.state.country} height={barChartHeight} rows={bardata}/>
            </div>

            <div id="population-totals">
              <h3>{totalName}</h3>
              <p><span className="decade">{this.state.decade}</span><span className="total">{count}</span><span className="percent">{percent}</span></p>
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
            <Loupe changeCallback={this.handleMapClick}
              filterOn={this.state.county}
              data={this.state.geographyData.countyGeo || []}
              decade={this.state.decade}
              colorScale={colorScale}
              opacityScale={opacityScale}
              height={loupHeight-20}
              redraw={redrawMap} />
          </div>
        </section>
        <section className="row">
          <div className="columns nine">
            <div className="row">
              <div className="columns twelve">
                <div className="table footer">

                  <div className="td legends-cell shrink">
                    <button className="link intro" data-step="1" onClick={this.openIntro}><span className="icon info"></span></button>
                    <LegendNestedCircles values={radiusLegend}/>

                    <LegendGrid steps={6}
                      xValues={valuesForGrid.xvals}
                      yValues={valuesForGrid.yvals}
                      axisLabels={valuesForGrid.axis}
                      labels={valuesForGrid.labels}/>
                  </div>

                  <div className="td timeline-cell expand">
                    <div id="timeline-container">
                      <div className="outer-wrap">
                        <div className="wrapper">
                          <div className="title">
                            <h3>Population</h3>
                            <h3>Over Time</h3>
                            <button className="link intro" data-step="2" onClick={this.openIntro}><span className="icon info"></span></button>
                          </div>
                          <div>
                            <Timeline yDomain={[0,.4]} redraw={redrawMap} overlay={overallOverlay} secondaryOverlay={secondaryOverlay} decade={this.state.decade} startDate={new Date('1/1/1850')} endDate={new Date('12/31/2010')} onSliderChange={this.decadeUpdate} />
                            <div className="timeline-legend left">Total Foreign-Born</div>
                            <div className="timeline-legend right">{placeNameShort} Foreign-Born</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
          <div className="columns three">
            <div id="about-time-period" className="row">
                <p className="columns twelve description">{ForeignBornCopy.years[this.state.decade] || ''}</p>
            </div>
          </div>
        </section>

        <Modal isOpen={this.state.about} onRequestClose={this.toggleAbout} className="overlay">
          <button className="close" onClick={this.toggleAbout}><span>×</span></button>
          <h1>About this Map</h1>

          <p>The subtitle is borrowed from historian Robin D.G. Kelley, who begins one of his essays with the question "What is the United States, if not a nation of overlapping diasporas?" At all points in its history, a significant proportion of the population of the United States had been born in other countries and regions. This being the case, American history can never be understood by just looking within its borders. The culture and politics of the US have always been profoundly shaped by the material and emotional ties many of its residents have had to the places where they were born. This map will allow you to begin to explore those connections at the basic level of demographic statistics. </p>

          <h2>Sources</h2>

          <p>All of the data comes from <a href='https://www.nhgis.org/'>Minnesota Population Center, National Historical Geographic Information System: Version 2.0 (Minneapolis, MN: University of Minnesota, 2011)</a>. County boundaries are from the Newberry Library's <a href='http://publications.newberry.org/ahcbp/'>Atlas of Historical County Boundaries</a>.</p>

          <h2>Suggested Reading</h2>

          <p>Much of the best scholarship on the foreign born concentrates on particular groups at specific moments in time, works like George J. Sanchez's <cite>Becoming Mexican American: Ethnicity, Culture and Identity in Chicano Los Angeles, 1900-1945</cite>. Some thoughtful works that deal with the foreign-born population and issues of migration more generally are:</p>

          <ul>
            <li>Roger Daniels, <cite>Coming to America: A History of Immigration and Ethnicity in American Life</cite> (New York: Harper Collins, 1990).</li>
            <li>Thomas Bender, ed. <cite>Rethinking American History in a Global Age</cite> (Berkeley, CA: University of California Press, 2002). [Kelley's essay "How the West Was One: The African Diaspora and the Remapping of U.S. History" is in this collection.]</li>
            <li>Henry Yu, "Los Angeles and American Studies in a Pacific World of Migrations," <cite>American Quarterly</cite> 56 (September 2004) 531-543.</li>
          </ul>

          <h2>Acknowledgements</h2>

        <p>This map is authored by the staff of the Digital Scholarship Lab: Robert K. Nelson, Scott Nesbit, Edward L. Ayers, Justin Madron, and Nathaniel Ayers. Kim D'agostini and Erica Havens geolocated country locations.</p>

          <p>The developers, designers, and staff at Stamen Design Studio have been exceptional partners on this project. Our thanks to Kai Chang, Jon Christensen, Seth Fitzsimmons, Eric Gelinas, Sean Connelley, Nicolette Hayes, Alan McConchie, Michael Neuman, Dan Rademacher, and Eric Rodenbeck.</p>
        </Modal>

      </div>
    );
  }

});

module.exports = App;
