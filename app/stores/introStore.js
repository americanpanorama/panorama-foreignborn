var intro = require("intro.js").introJs;
var d3    = require("d3");

var barchartText = "The map shows where nearly a million enslaved people were moved from and where they were moved to through the American slave trade and the migration of planters from 1810 to 1860. Over time, the places where people were bought and the places where they were sold moved progressively westward.  The domestic slave trade changed continually, shifting shape in response to markets for cotton and sugar as well as to the seizing of land from the American Indians of the southeastern United States.";
var legendText = "";
var timelineText = "";

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