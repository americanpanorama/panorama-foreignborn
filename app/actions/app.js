var AppDispatcher = require('../dispatchers/app');

var AppActions = {
  getInitialData: function(state) {
    AppDispatcher.dispatch({
      actionType: "getInitialData",
      state: state
    });
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