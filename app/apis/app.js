var AppDispatcher = require("../dispatchers/app");
var Constants     = require('../constants/Constants.js');
var dslClient     = require("../lib/dslClient");

var TIMEOUT = 10000;

var _pendingRequests = {};

var COUNTRY_QUERY = 'SELECT ST_X(the_geom) as lng,ST_Y(the_geom) as lat,category_id,count,country,continent,year,category_id FROM site_foreignborn_rolled_country_counts_materialized';
var COUNTRY_POP_BREAKDOWN = "select category,count,RTRIM(nhgis_join) as nhgis_join from site_foreignborn_country_to_county_counts_materialized where country='{country}' and year={year}";
var COUNTY_QUERY = 'SELECT SUM(count) as count, SUM(cty_pop) as cty_pop, AVG(area_sqmi) as area_sqmi, nhgis_join FROM site_foreignborn_counties_prod_materialized WHERE start_n < {startN} and end_n >= {startN} and year = {year} group by nhgis_join';
var TOTAL_US_POP = 'SELECT year, pop FROM site_foreignborn_us_pop_totals_materialized';
var COUNTY_BREAKDOWN = "SELECT year, country, count, place_total FROM site_foreignborn_county_breakdowns_materialized WHERE RTRIM(nhgis_join) = '{nhgis_join}'";
var COUNTY_POP_BREAKDOWN = "SELECT year, count, cty_pop, name, state_terr FROM site_foreignborn_counties_prod_materialized WHERE RTRIM(nhgis_join) = '{nhgis_join}'"
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

function makeRequest(key, params, queue) {
  abortPendingRequests(key);
  dispatch(key, Constants.request.PENDING, params);

  _pendingRequests[key] = dslClient.requestPromiseParallelJSON(queue)
    .then(function(response) {
      dispatch(key, response, params);

    }, function(error){
      dispatch(key, Constants.request.ERROR, params);
    });
}

function totalPopulation() {
  return {
    key: 'total_us_pop',
    sql: TOTAL_US_POP,
    options: {"format":"JSON"}
  }
}

function countyPopulation(nhgis_join) {
  return {
    key: 'total_county_pop:' + nhgis_join,
    sql: COUNTY_POP_BREAKDOWN.replace(/{nhgis_join}/g, nhgis_join),
    options: {"format":"JSON"}
  }
}

function countyPopulationBreakdown(nhgis_join) {
  return {
    key: 'county_pop_breakdown:' + nhgis_join,
    sql: COUNTY_BREAKDOWN.replace(/{nhgis_join}/g, nhgis_join),
    options: {"format":"JSON"}
  }
}

function countryBreakdownByDecade(country, decade) {
  return {
    key: 'country_breakdown:' + country + ':' + decade,
    sql: COUNTRY_POP_BREAKDOWN.replace(/{country}/g, country).replace(/{year}/g, decade),
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
  getInitialData: function(decade, backfill, county, country) {
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

    if (county) {
      queue.push(countyPopulation(county));
      queue.push(countyPopulationBreakdown(county));
    }

    if (country) {
      queue.push(countryBreakdownByDecade(country, decade))
    }

    makeRequest(key, params, queue);
  },

  getDataForDecade: function(decade, backfill, county, country) {
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

    if (county) {
      queue.push(countyPopulation(county));
      queue.push(countyPopulationBreakdown(county));
    }

    if (country) {
      queue.push(countryBreakdownByDecade(country, decade))
    }

    makeRequest(key, params, queue);
  },

  getSelectedCounty: function(county) {
    var key = Constants.GET_COUNTY_BREAKDOWN_DATA;
    var params = {county: county};

    var queue = [
      countyPopulation(county),
      countyPopulationBreakdown(county)
    ];

    makeRequest(key, params, queue);
  },

  getSelectedCountry: function (country, dec) {
    var key = Constants.GET_COUNTRY_BREAKDOWN_DATA;
    var params = {country: country, decade: dec};
    var queue = [countryBreakdownByDecade(country, dec)];
    makeRequest(key, params, queue);
  },

};

module.exports = Api;