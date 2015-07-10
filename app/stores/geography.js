var AppDispatcher = require("../dispatchers/app");
var EventEmitter  = require("events").EventEmitter;
var dslClient     = require("../lib/dslClient");
var assign        = require("object-assign");

var CHANGE_EVENT  = "change";
var QUERY2        = 'SELECT * FROM foreignborn_us_counties_materialized';
var QUERY         = 'SELECT * FROM foreign_born_country_points_materialized';

var QUEUE = [
  {
    key: 'us_counties',
    sql: 'SELECT * FROM foreignborn_us_counties_materialized',
    options: {"format":"GeoJSON"}
  },
  {
    key: 'country_points',
    sql: 'SELECT * FROM foreign_born_country_points_materialized',
    options: {"format":"JSON"}
  },
  {
    key: 'country_data',
    sql: 'SELECT category,count,nhgis_join,year FROM foreign_born2_materialized',
    options: {"format":"JSON"}
  },
  {
    key: 'world_shapes',
    url: 'static/world-50m-subunits.json'
  }
];

var data = {};

var state = {
  loaded: false
};

var projectionParams = {
  asia: {
    centerCoords: [110,20],
    translate: [130, 110],
    scale: 100
  },
  oceania: {
    centerCoords: [150,-30],
    translate: [100, 300],
    scale: 100
  },
  southamerica: {
    centerCoords: [-70,-30],
    translate: [400, 300],
    scale: 100
  },
  centralamerica: {
    centerCoords: [-100,20],
    translate: [250, 300],
    scale: 100
  },
  usa: {
    centerCoords: [-100,35],
    translate: [320, 110],
    scale: 300
  },
  canada: {
    centerCoords: [-100,50],
    translate: [500, 75],
    scale: 100
  },
  africa: {
    centerCoords: [20,0],
    translate: [600, 300],
    scale: 100
  },
  europe: {
    centerCoords: [20,50],
    translate: [600, 100],
    scale: 100
  },
  nullisland: {
    centerCoords: [0,0],
    translate: [700, 100],
    scale: 100
  }
};


function setData(newData) {
  if(state.loaded) return;

  newData.forEach(function(d){
    if(d.key === 'world_shapes' || d.key === 'us_counties') {
      data[d.key] = d.response;
    } else {
      data[d.key] = d.response.rows;
    }
  });

  data['projection_params'] = projectionParams;

  state.loaded = true;
  GeographyStore.emitChange('GeographyStore');

}

function getInitialData(_state) {
  dslClient.requestPromiseParallelJSON(QUEUE)
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