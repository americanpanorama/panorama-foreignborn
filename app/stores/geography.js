var AppDispatcher = require("../dispatchers/app");
var EventEmitter  = require("events").EventEmitter;
var dslClient     = require("../lib/dslClient");
var assign        = require("object-assign");
var Constants     = require('../constants/Constants.js');

var d3            = require('d3');
var topojson      = require('topojson');

var CHANGE_EVENT  = "change";

var data = {
  countryByYear: {},
  countyByYear: {},
  countyGeometries: [],
  world: null
};

var countyDataLookup = window.countyDataLookup =  {};
var countyGeometriesLoaded = {};

var state = {
  loaded: false,
  decade: null,
  decadeBounds: null
};

var countiesLoaded = {};
var decadeData = {};


function setData(newData, decade) {
  state.loaded = true;

  newData.forEach(function(d){

    if (d.key === 'country') {
      data['countryByYear'] = rollupCountryData(d.response.rows);

    } else if(d.key === 'us_counties') {
      processCountyData(d, decade);

    } else if(d.response && d.response.features) {
      data[d.key] = d.response;

    } else if (d.response && d.response.rows) {
      data[d.key] = d.response.rows;

    } else if (d.response && d.response.type && d.response.type == 'Topology') {
      if (d.key === 'county_geo') {
        processCountyGeometries(d);
      } else {
        data[d.key] = d.response;
      }
    }

  });

}

function processCountyData (d, decade) {
  data['countyByYear'][decade] = d.response;
  countyDataLookup[decade] = countyDataLookup[decade] || {};
  data['countyByYear'][decade].rows.forEach(function(d){
    var k = d['nhgis_join'];
    if (k in countyDataLookup[decade]) {
      console.warn('`nhgis_join` is not unique!');
    }

    countyDataLookup[decade][k] = d;
  });
}

function processCountyGeometries (d) {
  var keys = Object.keys(d.response.objects);
  if (keys.length) {
    var k = keys[0];
    if (k in countyGeometriesLoaded) return;
    countyGeometriesLoaded[k] = 1;
    var features = topojson.feature(d.response, d.response.objects[k]).features;
    features.forEach(function(f){
      data['countyGeometries'].push(f);
    });
  }

}


function rollupCountryData(countryData) {
  var out = {};
  var clean = countryData.filter(function(d){
    return d.lat && d.lng && d.year && d.country.length;
  });
  d3.nest()
    .key(function(d){ return d.year; })
    .entries(clean)
    .forEach(function(d){
      out[d.key] = d.values;
    });

  return out;
}


function filterCountyGeometriesByDecade(decade) {
  if (!data['countyGeometries'].length) return [];

  var now = decade * 10000 + 101;

  console.log("%s: %s (%s)", decade ,  data['countyGeometries'].length, now);

  var filtered = data['countyGeometries'].filter(function(d){
    return d.properties['start_n'] <= now && d.properties['end_n'] >= now;
  });

  //var densities = [];

  filtered.forEach(function(d,i){
    var joinID = d.properties['nhgis_join'];

    if (countyDataLookup[decade][joinID]) {
      //d.properties.density = countyDataLookup[joinID].density;
      d.properties.count = countyDataLookup[decade][joinID].count;
      d.properties.density = Math.round(countyDataLookup[decade][joinID].count/countyDataLookup[decade][joinID].area_sqmi);
      d.properties.id = d.properties['nhgis_join'] + '-' + decade;
      //densities.push(d.properties.density);
    } else {
      //console.warn('no join');
      d.properties.density = 0;
    }
  });


  console.log('Filtered: %s', filtered.length);

  return filtered;
}


var GeographyStore = assign({}, EventEmitter.prototype, {

  getData: function() {
    return data;
  },

  getDataByDecade: function(decade) {

    if (decadeData[decade]) return decadeData[decade];

    var country = data['countryByYear'][decade] || [],
        world = data['world'] || [],
        countyData = data['countyByYear'][decade] || [],
        countyGeo = filterCountyGeometriesByDecade(decade) || [];

    var o = {
      country: country,
      world: world,
      countyData: countyData,
      countyGeo: countyGeo
    };

    if (!decadeData[decade] && state.loaded) decadeData[decade] = o;

    return o;
  },

  decade: function(decade) {
    if (!decade) return state.decade;
    state.decade = decade;
  },

  decadeBounds: function(decadeBounds) {
    if (!decadeBounds) return state.decadeBounds;
    state.decadeBounds = decadeBounds;
  },

  getBackFill: function(decade) {
    decade = decade || state.decade;

    if (!state.decadeBounds) return [];

    var a = [],
        c = decade - 10;

    while(c >= state.decadeBounds[0]) {
      if (!countyGeometriesLoaded[c]) a.push(c);
      c -= 10;
    }

    return a;
  },

  decadeLoaded: function(_) {
    return !!data['countyByYear'][_] && !!countyGeometriesLoaded[_];
  },

  emitChange: function(type, _caller) {

    this.emit(CHANGE_EVENT, {
      type:  type,
      caller: _caller
    });

  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    if (callback) {
      this.removeListener(CHANGE_EVENT, callback);
    }
  }

});

// Register callback to handle all updates
AppDispatcher.register(function(action) {

  switch(action.actionType) {

    case Constants.GET_INITIAL_DATA:

      if (action.response instanceof Array) {
        state.decade = action.queryParams.decade;
        setData(action.response, action.queryParams.decade);

        GeographyStore.emitChange(Constants.GET_INITIAL_DATA, 'GeographyStore');
      }

      break;

    case Constants.GET_DECADE_DATA:
        if (action.response instanceof Array) {
          state.decade = action.queryParams.decade;
          setData(action.response, action.queryParams.decade);

          GeographyStore.emitChange(Constants.GET_DECADE_DATA, 'GeographyStore');
        }
      break;

    default:
      return true;
  }
});

module.exports = GeographyStore;