var AppDispatcher = require("../dispatchers/app");
var EventEmitter  = require("events").EventEmitter;
var assign        = require("object-assign");

var CHANGE_EVENT  = "changeSize";

// Private
var _initialized;
var _dimensions = {
  "window": {
    width: null,
    height: null
  }
}

function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

var calculateDimensionsDebounce = debounce(calculateDimensions, 250);

function calculateDimensions() {
  _dimensions['window'].width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;

  _dimensions['window'].height =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight;

    if(_initialized) LayoutStore.emitChange();
}


var LayoutStore = assign({}, EventEmitter.prototype, {

  initialize: function() {
    if (_initialized) return this;
    calculateDimensions();
    _initialized = true;

    window.addEventListener('resize', calculateDimensionsDebounce);

    return this;
  },

  force: calculateDimensions,

  get: function(key, prop) {
    if (!key && !_dimensions[key]) return _dimensions;
    if (!prop && !_dimensions[key][prop]) return _dimensions[key];

    return _dimensions[key][prop]
  },

  block: function(obj) {

  },

  destroy: function() {
    window.removeEventListener('resize', calculateDimensionsDebounce);
  },

  emitChange: function(_caller) {
    this.emit(CHANGE_EVENT);
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


module.exports = LayoutStore;