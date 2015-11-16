var AppDispatcher = require("../dispatchers/app");
var EventEmitter  = require("events").EventEmitter;
var dslClient     = require("../lib/dslClient");
var assign        = require("object-assign");
var Constants     = require('../constants/Constants.js');

var d3            = require('d3');
var topojson      = require('topojson');
var Immutable     = require('immutable');

var CHANGE_EVENT  = "change";

var data = {
  countryByYear: {},
  countyByYear: {},
  countyGeometries: [],
  world: null,
};

var countyDataLookup = window.countyDataLookup =  {};
var countyGeometriesLoaded = {};
var countyBreakdowns = {};
var countryBreakdowns = {};

var state = {
  loaded: false,
  decade: null,
  decadeBounds: null
};

var countiesLoaded = {};
var decadeData = {};
var populationPercents = {};


function setData(newData, decade) {
  state.loaded = true;

  newData.forEach(function(d){
    if (typeof d.key === 'undefined') return;

    if (d.key === 'country') {
      data['countryByYear'] = rollupCountryData(d.response.rows);

    } else if(d.key.indexOf('country_breakdown') === 0) {
      processCountryBreakdown(d);

    } else if(d.key === 'us_counties') {
      processCountyData(d, decade);

    } else if(d.key.indexOf('total_county_pop') === 0) {
      processCountyPop(d);

    } else if (d.key.indexOf('county_pop_breakdown') === 0) {
      processCountyBreakdown(d);

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

function processCountryBreakdown(obj) {
  var keyParts = obj.key.split(':'),
      country = keyParts[1],
      decade = keyParts[2];

  if (!countryBreakdowns[decade]) countryBreakdowns[decade] = {};
  countryBreakdowns[decade][country] = [];

  var total = d3.sum(obj.response.rows, function(d){return d.count;});

  obj.response.rows.forEach(function(d){
    countryBreakdowns[decade][country].push({
      pct: d.count / total,
      value: d.count,
      yr: decade,
      'nhgis_join': d.nhgis_join
    });

  });
}

function processCountyPop(obj) {
  var keyParts = obj.key.split(':'),
      county = keyParts[1];

  var lk = {};
  obj.response.rows.forEach(function(d){
    lk[d.year] = d;
  });

  var intervals = d3.range(state.decadeBounds[0], state.decadeBounds[1]+10,10);

  populationPercents[county] = [];

  intervals.forEach(function(yr){

    var total = (lk[yr]) ? lk[yr].cty_pop : 0,
        fbTotal = (lk[yr]) ? lk[yr].count : 0,
        name = (lk[yr]) ? lk[yr].name : '',
        state = (lk[yr]) ? lk[yr].state_terr : '';

    var pct = (total === 0) ? 0 : fbTotal/total;

    populationPercents[county].push({
      date: new Date('1/1/' + yr),
      pct: pct,
      total: total,
      fbTotal: fbTotal,
      year: yr,
      name: name,
      state: state
    });

  });
}

function processCountyBreakdown(obj) {
  var keyParts = obj.key.split(':'),
      county = keyParts[1];

  countyBreakdowns[county] = {
    decades: {},
    overlay: []
  };

  d3.nest()
    .key(function(d){ return d.year; })
    .entries(obj.response.rows)
    .forEach(function(d){
      countyBreakdowns[county].decades[d.key] = d.values;
      var fbTotal = d3.sum(d.values, function(x){ return x.count; }),
          total = d.values[0]['place_total'];

      countyBreakdowns[county].overlay.push({
        date: new Date('1/1/' + d.key),
        pct: fbTotal/total
      })
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
    if (!features) features = [];

    features.forEach(function(f){
      data['countyGeometries'].push(f);
    });
  }
}

function computePopulationPercents() {
  if (!data['total_us_pop']) return [];
  var pcts = [];

  data['total_us_pop'].forEach(function(d){
    var yr = d.year,
        total = d.pop;

    if (!data['countryByYear'][yr]) return;

    var fbTotal = d3.sum(data['countryByYear'][yr], function(o) { return o.count;});

    pcts.push({
      date: new Date('1/1/' + yr),
      pct: fbTotal/total
    });
  });

  populationPercents['all'] = pcts;
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

  var filtered = data['countyGeometries'].filter(function(d){
    return d.properties['start_n'] <= now && d.properties['end_n'] >= now && d.properties['nhgis_join'] !== null;
  });

  filtered.forEach(function(d,i){
    var joinID = d.properties['nhgis_join'];

    d.properties.id = d.properties['nhgis_join'] + '-' + decade;

    if (countyDataLookup[decade][joinID] &&
        !isNaN(countyDataLookup[decade][joinID].count) &&
        !isNaN(countyDataLookup[decade][joinID].area_sqmi)) {

      d.properties.count = countyDataLookup[decade][joinID].count;

      var area = countyDataLookup[decade][joinID].area_sqmi;
      // make sure area_sqmi is not zero
      if (area === 0) area = 1;
      d.properties.density = countyDataLookup[decade][joinID].count / area;

      d.properties.fbPct = countyDataLookup[decade][joinID].count / countyDataLookup[decade][joinID]['cty_pop'];

    } else {
      d.properties.fbPct = 0;
      d.properties.count = 0;
      d.properties.density = 0;
    }

  });

  return filtered;
}

function getCountryScaleData(countries) {
  if (!state.decade) return [];

  countries = countries || data['countryByYear'][state.decade] || [];

  if (!countries.length) return [];

  var domain = countries.map(function(d){
        return d.count;
      });

  var min = d3.min(domain),
      max = d3.max(domain);

  var scale = d3.scale.sqrt()
      .range([5,45])
      .domain([min, max]);

  var format = d3.format('s');
  var values = [];

  var parts = [];
  var steps, subLength;
  var length = (max - min) * 0.70;

  if (length < 60) {
    steps = 2;
    parts = [min,max];

  } else {

    steps = 4;
    subLength = round(length / steps);

    for (var i = 0; i < steps; i++) {
      var n = subLength + subLength * i;

      parts.push(n);
    }
  }

  scale.domain([parts[0], parts[steps-1]]);

  parts.forEach(function(d){
    values.push({
      r: scale(d),
      value: d,
      label: ''
    });
  });

  values.sort(function(a,b){
    return a.r - b.r;
  });

  values.forEach(function(d,i){
    if (values.length === 2) {
      d.label = format(d.value ) + " " + pluralize(d.value, "person", "people")
    } else {
      if (i === 0) {
        d.label = "<" + format(d.value) + " " + pluralize(d.value, "person", "people");
      } else {
        d.label = format(values[i-1].value).replace(/\D/g,'') + ' - ' + format(d.value) + " " + pluralize(d.value, "person", "people");
      }
    }

  });

  return values;
}

function round(n) {
  if (n < 100) {
    n = Math.round(n/10)*10;
  } else if (n < 1000) {
    n = Math.round(n/100)*100;
  } else if (n < 10000) {
    n = Math.round(n/1000)*1000;
  } else if (n < 100000) {
    n = Math.round(n/10000)*10000;
  } else if (n < 1000000) {
    n = Math.round(n/100000)*100000;
  } else if (n < 10000000) {
    n = Math.round(n/1000000)*1000000;
  } else if (n < 100000000) {
    n = Math.round(n/10000000)*10000000;
  }

  return n;
}

function pluralize(val, singular, plural) {
   if (val === 1) return singular;
   return plural;
}


var GeographyStore = assign({}, EventEmitter.prototype, {
  getCountryScaleData: getCountryScaleData,

  getData: function() {
    return data;
  },

  // TODO: refactor make immutable
  getDataByDecade: function(decade) {

    //if (decadeData[decade]) return Immutable.Map(decadeData[decade]).toObject();

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

    return o;
    //o = Immutable.Map(o).toObject();

    //if (!decadeData[decade] && state.loaded) decadeData[decade] = o;

    return o;
  },

  getCountryPercents: function(country) {
    return populationPercents[country] || [];
  },

  getCountyPercents: function(county) {
    return populationPercents[county] || [];

    //if (!countyBreakdowns[county]) return [];

    //return countyBreakdowns[county].overlay || []
  },

  getCountriesForCounty: function(county, decade) {
    if (!countyBreakdowns[county]) return [];

    return countyBreakdowns[county].decades[decade] || []
  },

  getSelectedCountry: function(country) {
    var o = [];
    if (!data['total_us_pop'] || !data['total_us_pop'].length) return [];

    data['total_us_pop'].forEach(function(d){
      var r = [];
      if (data['countryByYear'] && data['countryByYear'][d.year]) {
        r = data['countryByYear'][d.year].filter(function(d){
          return d.country === country;
        });
      }

      var count = (r.length) ? r[0].count : 0;
      var pct = (r.length) ? count/d.pop : 0;

      o.push({
        year: d.year,
        count: count,
        date: new Date("1/1/" + d.year),
        pct: pct
      });

    });


    for(var yr in data['countryByYear']) {
      var r = data['countryByYear'][yr].filter(function(d){
        return d.country === country;
      });

      var usPop = data['total_us_pop'].filter(function(d){
        return d.year == yr;
      });

      if (r.length && usPop.length) {
        o.push({
          year: yr,
          count: r[0].count,
          date: new Date("1/1/" + yr),
          pct: r[0].count / usPop[0].pop
        });
      }
    }

    return o;
  },

  decade: function(decade) {
    if (!decade) return state.decade;
    state.decade = decade;
  },

  county: function(county) {
    if (!county) return state.county;
    state.county = county;
  },

  country: function(country) {
    if (!country) return state.country;
    state.country = country;
  },

  decadeBounds: function(decadeBounds) {
    if (!decadeBounds) return state.decadeBounds;
    state.decadeBounds = decadeBounds;
  },

  round: function(x) {
    return round(x);
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

  countyLoaded: function(county) {
    return !!countyBreakdowns[county];
  },

  countryLoaded: function(country, decade) {
    return !!(countryBreakdowns[decade] && countryBreakdowns[decade][country]);
  },

  getCountiesForCountry: function(country, decade) {
    if(!this.countryLoaded(country, decade)) return [];
    return countryBreakdowns[decade][country] || [];
  },

  getCountyColorScale: function(arr) {

  },

  getCountyOpacityScale: function(arr) {

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
        computePopulationPercents();

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

    case Constants.GET_COUNTY_BREAKDOWN_DATA:
        if (action.response instanceof Array) {
          state.county = action.queryParams.county;
          setData(action.response, action.queryParams.decade);

          GeographyStore.emitChange(Constants.GET_COUNTY_BREAKDOWN_DATA, 'GeographyStore');
        }
      break;
    case Constants.GET_COUNTRY_BREAKDOWN_DATA:
        if (action.response instanceof Array) {
          state.country = action.queryParams.country;
          setData(action.response, action.queryParams.decade);

          GeographyStore.emitChange(Constants.GET_COUNTRY_BREAKDOWN_DATA, 'GeographyStore');
        }
      break;

    default:
      return true;
  }
});

module.exports = GeographyStore;