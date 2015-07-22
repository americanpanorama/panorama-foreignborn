var AppDispatcher = require("../dispatchers/app");
var EventEmitter  = require("events").EventEmitter;
var dslClient     = require("../lib/dslClient");
var assign        = require("object-assign");

var d3            = require('d3');
var topojson      = require('topojson');

var CHANGE_EVENT  = "change";

//var COUNTY_QUERY = 'SELECT start_n,end_n,area_sqmi,count,year,nhgis_join, round(cast (count/area_sqmi as numeric), 2) as density FROM site_foreignborn_counties_prod_materialized WHERE start_n < {startN} and end_n >= {startN}';
var COUNTRY_QUERY = 'SELECT ST_X(the_geom) as lng,ST_Y(the_geom) as lat,category_id,count,country,continent,year FROM site_foreignborn_rolled_country_counts_materialized';
var COUNTY_QUERY = 'SELECT SUM(count) as count, AVG(area_sqmi) as area_sqmi, nhgis_join FROM site_foreignborn_counties_prod_materialized WHERE start_n < {startN} and end_n >= {startN} group by nhgis_join';
var WORLD = {
  key: 'world',
  url: 'static/world-50m-subunits.json'
};

var data = {
  countryByYear: {},
  countyByYear: {},
  countyGeometries: [],
  world: null
};

var countyDataLookup = window.countyDataLookup =  {};

var state = {
  loaded: false
};

var decade = null;

var decadeBounds = [1850,2010];

var countiesLoaded = {};



function setData(newData) {
  if(state.loaded) return;
  state.loaded = true;

  newData.forEach(function(d){

    if (d.key === 'country') {
      data['countryByYear'] = rollupCountryData(d.response.rows);

    } else if(d.key === 'us_counties') {
      data['countyByYear'][decade] = d.response;
      data['countyByYear'][decade].rows.forEach(function(d){
        var k = d['nhgis_join'];
        if (k in countyDataLookup) {
          console.warn('`nhgis_join` is not unique!');
        }

        countyDataLookup[k] = d;
      });

    } else if(d.response && d.response.features) {
      data[d.key] = d.response;

    } else if (d.response && d.response.rows) {
      data[d.key] = d.response.rows;

    } else if (d.response && d.response.type && d.response.type == 'Topology') {
      if (d.key === 'county_geo') {
        var features = topojson.feature(d.response, d.response.objects[decade]).features;
        features.forEach(function(f){
          data['countyGeometries'].push(f);
        });
      } else {
        data[d.key] = d.response;
      }
    }

  });

  if (decade === decadeBounds[0]) {
    GeographyStore.emitChange('GeographyStore');
  } else {
    backfill();
  }

}

function backfill() {

  var c = decade - 10;
  var queue = [];
  while(c >= decadeBounds[0]) {
    queue.push(makeCountyGeometryQueryObject(c));
    c -= 10;
  }


  dslClient.requestPromiseParallelJSON(queue)
   .then(function(response) {
     response.forEach(function(d){
      var keys = Object.keys(d.response.objects);
      if (keys.length) {
        var k = keys[0];
        console.log('Loaded: ', k);
        var features = topojson.feature(d.response, d.response.objects[k]).features;
        features.forEach(function(f){
          data['countyGeometries'].push(f);
        });

      }
     });

    GeographyStore.emitChange('GeographyStore');

   }, function(error){
     console.error(error.payload);
     return false;
   })

}

function makeCountyQueryObject(decade) {
  var start = decade * 10000 + 101;
  var end = (decade + 10) * 10000 + 101;
  console.log( COUNTY_QUERY.replace(/{startN}/g, start).replace(/{endN}/g, end).replace(/{year}/g, decade) )
  return {
    key: 'us_counties',
    sql: COUNTY_QUERY.replace(/{startN}/g, start).replace(/{endN}/g, start).replace(/{year}/g, decade),
    options: {"format":"JSON"}
  }
}

function makeCountryQueryObject(decade) {
  return {
    key: 'country',
    sql: COUNTRY_QUERY,
    options: {"format":"JSON"}
  }
}

function makeCountyGeometryQueryObject(decade) {
  return {
    key: 'county_geo',
    url: 'static/counties/' + decade + '.json'
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

function getInitialData(_state) {
  decade = _state.decade;
  // Initial queue
  var queue = [
    makeCountyQueryObject(_state.decade),
    makeCountryQueryObject(_state.decade),
    makeCountyGeometryQueryObject(_state.decade),
    WORLD
  ];

 dslClient.requestPromiseParallelJSON(queue)
  .then(function(response) {
    setData(response);

  }, function(error){
    console.error(error.payload);
    return false;
  })

}

function filterCountyGeometriesByDecade(decade) {
  if (!data['countyGeometries'].length) return [];

  var now = decade * 10000 + 101,
      end = (decade + 10) * 10000 + 101,
      begin = 18;

  console.log("%s: %s (%s)", decade ,  data['countyGeometries'].length, now);

  var filtered = data['countyGeometries'].filter(function(d){
    return d.properties['start_n'] <= now && d.properties['end_n'] >= now;
  });

  var densities = [];
  filtered.forEach(function(d){
    var joinID = d.properties['nhgis_join'];

    if (countyDataLookup[joinID]) {
      //d.properties.density = countyDataLookup[joinID].density;
      d.properties.count = countyDataLookup[joinID].count;
      d.properties.density = Math.round(countyDataLookup[joinID].count/countyDataLookup[joinID].area_sqmi);

      densities.push(d.properties.density);
    } else {
      console.warn('no join');
      d.properties.density = 0;
    }
  });
  var max = d3.max(densities),
      min = d3.min(densities);

  console.log("Max: %s | Min: %s", max, min);
  console.log('Filtered: %s', filtered.length);

  return filtered;
}


var GeographyStore = assign({}, EventEmitter.prototype, {

  getData: function() {
    return data;
  },

  getDataByDecade: function(decade) {
    var country = data['countryByYear'][decade] || [],
        world = data['world'] || [],
        countyData = data['countyByYear'][decade] || [],
        countyGeo = filterCountyGeometriesByDecade(decade) || [];

    return {
      country: country,
      world: world,
      countyData: countyData,
      countyGeo: countyGeo
    }
  },

  emitChange: function(_caller) {

    this.emit(CHANGE_EVENT, {
      state:  state,
      data:   data,
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

    case "getInitialData":

      getInitialData(action.state);

      break;


    default:
      // no op
  }
});

module.exports = GeographyStore;