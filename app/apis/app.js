var AppDispatcher = require("../dispatchers/app");
var Constants     = require('../constants/Constants.js');
var dslClient     = require("../lib/dslClient");

var TIMEOUT = 10000;

var _pendingRequests = {};

var COUNTRY_QUERY = 'SELECT ST_X(the_geom) as lng,ST_Y(the_geom) as lat,category_id,count,country,continent,year FROM site_foreignborn_rolled_country_counts_materialized';
var COUNTY_QUERY = 'SELECT SUM(count) as count, AVG(area_sqmi) as area_sqmi, nhgis_join FROM site_foreignborn_counties_prod_materialized WHERE start_n < {startN} and end_n >= {startN} group by nhgis_join';
var TOTAL_US_POP = 'SELECT year, pop FROM site_foreignborn_us_pop_totals_materialized';
var COUNTY_POP_BREAKDOWN = "SELECT year,total,fb_total FROM site_foreignborn_county_pop_breakdowns_materialized WHERE RTRIM(nhgis_join) = '{nhgis_join}'";
var WORLD = {
  key: 'world',
  url: 'static/world-50m-subunits.json'
};

function abortPendingRequests(key) {
    if (_pendingRequests[key]) {
        _pendingRequests[key] = null;
        /*
        _pendingRequests[key]._callback = function(){};
        _pendingRequests[key].abort();
        _pendingRequests[key] = null;
        */
    }
}

function dispatch(key, response, params) {
    var payload = {actionType: key, response: response};
    if (params) {
        payload.queryParams = params;
    }

    AppDispatcher.dispatch(payload);
}

function totalPopulation() {
  return {
    key: 'total_us_pop',
    sql: TOTAL_US_POP,
    options: {"format":"JSON"}
  }
}

function CountyPopulationBreakdown(nhgis_join) {
  return {
    key: 'county_pop_' + nhgis_join,
    sql: COUNTY_POP_BREAKDOWN.replace(/{nhgis_join}/g, nhgis_join),
    options: {"format":"JSON"}
  }
}

function makeCountyQueryObject(decade) {
  var start = decade * 10000 + 101;
  var end = (decade + 10) * 10000 + 101;
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

var Api = {
  getInitialData: function(decade, backfill) {
    var key = Constants.GET_INITIAL_DATA;
    var params = {decade: decade};

    var queue = [
      totalPopulation(),
      makeCountyQueryObject(decade),
      makeCountryQueryObject(decade),
      makeCountyGeometryQueryObject(decade),
      WORLD
    ];

    if (backfill) {
      backfill.forEach(function(d){
        queue.push(makeCountyGeometryQueryObject(d))
      });
    }

    abortPendingRequests(key);
    dispatch(key, Constants.request.PENDING, params);

    _pendingRequests[key] = dslClient.requestPromiseParallelJSON(queue)
      .then(function(response) {
        dispatch(key, response, params);

      }, function(error){
        dispatch(key, Constants.request.ERROR, params);
      });
  },

  getDataForDecade: function(decade, backfill) {
    var key = Constants.GET_DECADE_DATA;
    var params = {decade: decade};

    var queue = [
      makeCountyQueryObject(decade)
    ];

    if (backfill) {
      backfill.forEach(function(d){
        queue.push(makeCountyGeometryQueryObject(d))
      });
    }

    abortPendingRequests(key);
    dispatch(key, Constants.request.PENDING, params);

    _pendingRequests[key] = dslClient.requestPromiseParallelJSON(queue)
      .then(function(response) {
        dispatch(key, response, params);

      }, function(error){
        dispatch(key, Constants.request.ERROR, params);
      });

  }
};

module.exports = Api;