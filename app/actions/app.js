var AppDispatcher = require('../dispatchers/app');
var Constants = require('../constants/Constants.js');
var API = require('../apis/app.js');

var AppActions = {
  getInitialData: function(decade, backfill) {
    API.getInitialData(decade, backfill);
  },

  getDataForDecade: function(decade, backfill) {
    API.getDataForDecade(decade, backfill);
  },
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