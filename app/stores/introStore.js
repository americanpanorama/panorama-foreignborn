var intro = require("intro.js").introJs;
var d3    = require("d3");

var barchartText = "The regions where migrants came from shifted substantially over time. From 1820 to around 1880, immigrants from Germany, Ireland, and Scandinavia predominated; from 1880 to 1920, those from southern and eastern Europe; after 1965, those from Mexico, Central America, and Asia. Select a country to see and explore where immigrants from there settled in the US.";
var legendText = "Migrants from some countries and regions like Scandinavia and Japan tended to settle in rural areas, while others like Italians and Irish mostly settled in cities. Greener areas mark areas where the percentage of foreign-born was higher; brighter areas where population density was greater, like cities.";
var timelineText = "Text TK";

var IntroManager = {
  state: false,
  intro: null,
  opened: false,
  buttonClass: '.intro',
  steps: {
    legend: {
      element: ".circle-legend-cell",
      intro: legendText,
      position: "top"
    },
    barchart: {
      element: "#bar-chart",
      intro: barchartText,
      position: "left"
    },
    timeline: {
      element: "#timeline-container .outer-wrap",
      intro: timelineText,
      position: "top"
    }

  },

  init: function() {
    this.intro = intro(document.querySelector("body"));

    this.intro.setOptions({
      "showStepNumbers": false,
      'skipLabel': '×',
      'nextLabel': '⟩',
      'prevLabel': '⟨',
      'doneLabel': '×',
      'widthHeightPadding': 0,
      'steps': [this.steps.barchart,this.steps.legend, this.steps.timeline]
    });

    this.intro.refresh();

    // events
    var that = this;
    this.intro.onchange(function(e) {
      var step = that.intro._currentStep;

      that.deselectAllButtons();
      that.selectButtonByStep(step);
    });

    this.intro.onexit(function(){
      that.state = false;
      that.deselectAllButtons();
    });

    this.intro.onbeforechange(function(targetElement) {
      //console.log(targetElement)
      that.onbeforechange(targetElement);
    });

    this.intro.onafterchange(function(targetElement) {
      //console.log(targetElement)
    });

    this.intro.oncomplete(function() {
      that.deselectAllButtons();
      // Do something when intro is complete
    });

  },

  onbeforechange: function(targetElement) {},

  getCurrentStep: function() {
    return this.intro._currentStep || null;
  },

  deselectAllButtons: function() {
    d3.selectAll(this.buttonClass).classed('selected', false).attr('disabled', null);
  },

  selectButtonByStep: function(step) {
    d3.select('[data-step="' + step + '"]').classed('selected', true)
      .attr('disabled', 'disabled');
  },

  selectButtonByElement: function(elm) {
    d3.select(elm).classed('selected', true)
      .attr('disabled', 'disabled');
  },

  open: function(e) {
    if (!this.intro) return;

    this.state = true;
    var step = (e && e.currentTarget) ? parseInt(e.currentTarget.getAttribute("data-step")) : null;

    // Fixes a problem where step indexes are different
    // when initially called
    //if (e && !this.opened) step += 1;

    if (step) {
      if (!this.opened) {
        this.intro.goToStep(step).start().nextStep();
      } else {
        this.intro.goToStep(step).start();
      }


    } else {
      this.intro.start();
    }

    this.opened = true;
  },

  close: function() {
    if (!this.intro) return;
    this.intro.exit();
  },

  destroy: function() {
    this.close();
    this.intro = null;
  }
};

module.exports = IntroManager;
