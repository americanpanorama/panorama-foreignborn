var AppDispatcher = require('../dispatchers/app');
var Constants = require('../constants/Constants.js');
var API = require('../apis/app.js');

var AppActions = {
  getInitialData: function(decade, backfill, county, country) {
    API.getInitialData(decade, backfill, county, country);
  },

  getDataForDecade: function(decade, backfill) {
    API.getDataForDecade(decade, backfill);
  },

  getSelectedCounty: function(county){
    API.getSelectedCounty(county);
  }
}

AppDispatcher.register(function(payload) {

  //
  // TODO: Wire this into a UI error state
  //
  if (payload.actionType === "throwError") {
    if (console.error) {
      console.error("Application Error", payload.error);
    }
  }

});

module.exports = AppActions;