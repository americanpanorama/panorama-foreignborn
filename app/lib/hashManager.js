var hashManager = {
  hashParams: {},

  get: function() {
    return this.hashParams;
  },

  set: function(hashParams) {
    this.hashParams = hashParams;
  },

  parseHash: function(hash) {
    var out = {};
    if (!hash) return out;

    if(hash.indexOf('#') === 0) {
      hash = hash.substr(1);
    }

    // hash = this.decode(hash);

    var that = this;
    var things = hash.split('&').map(function(d){return d.split('=');});

    things.forEach(function(thing){
      if (thing[0] in that.hashParams && thing[1] != '') {
        out[thing[0]] = that.decode(thing[1]);
      }
    });

    return out;
  },

  mergeHash: function(params) {
    for (var k in params) {
      if (k in this.hashParams) {
        var value = params[k];
        /*
        if (!value.length) value = null;
        if (!value && this.hashParams[k].required) value = this.hashParams[k].default;

        if (value && this.hashParams[k].type === "Number") value = +value;
        */
        this.hashParams[k].value = value;
      }
    }

    return this.hashParams;
  },

  encode: function(item) {
    return encodeURIComponent(item);
    // return item.replace(/ /g, '+').replace(/&/g, 'and');
  },

  decode: function(item) {
    return decodeURIComponent(item);
    // return item.replace(/\+/g, ' ').replace(/ and /g, ' & ');
  },

  updateHash: function(silent) {
    var out = [];
    var that = this;
    for (var k in this.hashParams) {
      var v = this.hashParams[k].value;

      if (v !== null) {
        out.push(k + '=' + that.encode(v));
      }
    }

    var hash = "#" + out.join('&');

    if (document.location.hash !== hash) document.location.replace(hash);
  }
}

module.exports = hashManager;