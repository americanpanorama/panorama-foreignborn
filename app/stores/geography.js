var AppDispatcher = require("../dispatchers/app");
var EventEmitter  = require("events").EventEmitter;
var dslClient     = require("../lib/dslClient");
var assign        = require("object-assign");

var CHANGE_EVENT  = "change";

var COUNTY_QUERY = 'SELECT * FROM site_foreignborn_counties_prod_materialized WHERE year = {year} and {yearNum} >= start_n and {yearNum} < end_n';
var COUNTRY_QUERY = 'SELECT ST_X(the_geom) as lng,ST_Y(the_geom) as lat,category_id,count,country,continent,year FROM site_foreignborn_rolled_country_counts_materialized';
//the_geom_webmercator,area_sqmi,count,end_n,start_n,year,nhgis_join, round(cast (count/area_sqmi as numeric), 2) as density
var WORLD = {
  key: 'world_shapes',
  url: 'static/world-50m-subunits.json'
};

/*
{
  key: 'country_data',
  sql: 'SELECT category,count,nhgis_join,year FROM foreign_born2_materialized',
  options: {"format":"JSON"}
},
 */

var data = {
  countryByYear: {},
  countyByYear: {},
  world: null
};

var state = {
  loaded: false
};

var decade = null;



function setData(newData) {
  if(state.loaded) return;
  state.loaded = true;

  newData.forEach(function(d){

    if (d.key === 'country') {
      data['countryByYear'] = rollupCountryData(d.response.rows);

    } else if(d.key === 'us_counties') {
      data['countyByYear'][decade] = d.response;

    } else if(d.response.features) {
      data[d.key] = d.response;

    } else if (d.response.rows) {
      data[d.key] = d.response.rows;

    } else if (d.response.type && d.response.type == 'Topology') {
      data.world = d.response;
    }

  });
  console.log(data);
  GeographyStore.emitChange('GeographyStore');

}

function makeCountyQueryObject(decade) {
  var yearNum = decade * 10000 + 0101;
  return {
    key: 'us_counties',
    sql: COUNTY_QUERY.replace(/{yearNum}/g,yearNum).replace(/{year}/g, decade),
    options: {"format":"GeoJSON"}
  }
}

function makeCountryQueryObject(decade) {
  return {
    key: 'country',
    sql: COUNTRY_QUERY,
    options: {"format":"JSON"}
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


var GeographyStore = assign({}, EventEmitter.prototype, {

  getData: function() {
    return data;
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