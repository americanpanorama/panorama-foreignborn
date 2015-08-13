//TODO: Enable Dates to be dynamic

/** @jsx React.DOM */
var React   = require("react");
var d3      = require("d3");

var lastWindowWidth;
var fullYearFormatter = d3.time.format('%Y');
var yearFormatter = d3.time.format('%y');

var overlayDrawn;
var hasSecondaryOverlay;
var Timeline = React.createClass({
  svgElm: null,
  margin: {top: 20, right: 15, bottom: 20, left: 40},
  width: null,
  height: null,
  xscale: null,
  yscale: null,
  line: null,
  color: null,
  xAxis: null,
  yAxis: null,
  brush: null,
  slider: null,
  handle: null,
  hasSlider: true,
  hasData: false,
  beginDate:null, // date obj
  endDate: null, // date obj

  getInitialState: function () {
    return {};
  },

  setXYScales: function() {
    var domain = d3.time.years(this.beginDate, this.endDate, 10);

    var range = [];
    this.years = [];
    var that = this;
    domain.forEach(function(d,i){
      var pct = i/(domain.length-1);
      range.push(pct * that.width);
      that.years.push(d.getFullYear());
    });
    this.xscale = d3.time.scale()
      .range(range)
      .domain(domain)
      //.range([0, this.width])
      //.domain(d3.time.years(this.beginDate, this.endDate, 10))
      //.domain([this.beginDate, this.endDate])
      .clamp(true);

    this.yscale = d3.scale.linear()
      .range([this.height, 0])
      .domain(this.props.yDomain || [0,100]);
  },

  getStepSize: function() {

    var year = this.beginDate.getFullYear();

    var d0 = new Date('1/1/' + year),
        d1 = new Date('12/31/' + (year + 10));

    var x0 = this.xscale(d0),
        x1 = this.xscale(d1);

    return x1-x0;
  },

  setBrush: function(date) {
    date = date || this.xscale.domain()[0];
    var that = this;

    this.brush = d3.svg.brush()
      .x(this.xscale)
      .extent([date, date])
      .on("brush", function(e){
        that.brushed(this);
      });
  },

  setXYAxis: function () {
    this.xAxis = d3.svg.axis()
      .scale(this.xscale)
      .ticks(d3.time.years, 10)
      .orient("bottom")
      .tickSize(-(this.height+5))
      .tickPadding(5)
      .tickFormat(function(d){
        if (d.getFullYear() % 50 === 0) {
          return fullYearFormatter(d);
        } else {
          return "";
        }
      });


    var yDomain = this.yscale.domain().slice(0);
    var tv = [yDomain[0],(yDomain[1]-yDomain[0])/2, yDomain[1] ];
    this.yAxis = d3.svg.axis()
      .scale(this.yscale)
      .orient("left")
      .tickValues(tv)
      .tickSize(5,-this.width)
      .tickFormat(function(d,i) {
        if (i === 0 || i === 2) {
          return Math.ceil(d * 100) + "%";
        }
        return "";
      });
  },

  setWidth: function (x) {
    this.width = x - this.margin.left - this.margin.right;
  },

  setHeight: function(y) {
    this.height = y - this.margin.top - this.margin.bottom;
  },

  brushed: function(context) {
    var that = this;
    var value = this.brush.extent()[0];
    var snapped;

    if (d3.event.sourceEvent) { // not a programmatic event
      value = this.xscale.invert(d3.mouse(context)[0]);
      value = this.nearstDecade(value);
      this.brush.extent([value,value]);
    } else {
      // skipping brush events not created by mouse
    }

    this.handle.attr("transform", "translate(" + this.xscale(value) + ",0)");
    var callChange = (value.getFullYear() !== this.currentYear) ? true : false;
    this.currentYear = value.getFullYear();
    this.currentDate = value;
    if (!callChange) return;
    this.handle.select('text').text(this.currentYear);
    if (this.props.onSliderChange) this.props.onSliderChange(value);


  },

  nearstDecade: function(val) {
    var y = val;
    var r = [];
    var years = this.xscale.domain();

    years.forEach(function(d,i){
      r.push({index: i, delta: Math.abs(d-y)})
    });
    r.sort(function(a,b){
      return a.delta - b.delta;
    });

    return years[r[0].index];
  },

  moveBrush: function(value) {
    this.brush.extent([value, value]);
    this.handle.attr("transform", "translate(" + this.xscale(value) + ",0)");
    if (this.props.onSliderChange) this.props.onSliderChange(value);
  },

  updateDisplay: function(justContainer) {
    var container = this.getDOMNode();
    this.setWidth(container.offsetWidth);
    this.setHeight(72);

    var svg = d3.select(container).select('svg');

    svg
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height  + this.margin.top + this.margin.bottom);

    this.svgElm
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    if (justContainer ) return;

    this.svgElm.selectAll('*').remove();

    this.setXYScales();
    this.setXYAxis();
    this.setBrush(this.currentDate);

    this.visualize();

    this.drawMainOverlay();
    this.drawSecondaryOverlay();
  },


  componentDidMount: function() {
    var container = this.getDOMNode();
    var that = this;
    lastWindowWidth = window.innerWidth;
    this.setWidth(container.offsetWidth);
    this.setHeight(72);

    this.currentDate = new Date('1/1/'+ this.props.decade);

    /*
    this.setXYScales();
    this.setXYAxis();

    if (this.hasSlider) this.setBrush(this.props.currentDate);
    this.currentDate = this.props.currentDate;
    */

    this.svgElm = d3.select(container).append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height  + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("class", "group")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
  },

  componentWillUnmount: function() {

  },

  shouldComponentUpdate: function(nextProps) {
    if (!this.hasData) return true;
    if (this.props.decade !== nextProps.decade) return true;
    if (!overlayDrawn) return true;
    if (this.props.secondaryOverlay !== nextProps.secondaryOverlay) return true;
    return false;
  },

  componentDidUpdate: function() {
    if (this.hasData) {
      this.handle.select('text').text(this.props.decade);

      if (!overlayDrawn) {
        this.drawMainOverlay();
      }

      if (this.props.secondaryOverlay && this.props.secondaryOverlay.length) {
        if (!hasSecondaryOverlay) {
          this.margin.right = 30;
          this.updateDisplay();
        } else {
          this.drawSecondaryOverlay();
        }
      } else {
        if (hasSecondaryOverlay) {
          this.margin.right = 15;
          this.updateDisplay();
        }
      }

      return;
    }

    if (this.props.secondaryOverlay && this.props.secondaryOverlay.length) {
      this.margin.right = 30;
      this.updateDisplay(true);
    }

    this.hasData = true;

    this.beginDate = this.props.startDate;
    this.endDate = this.props.endDate;

    this.setXYScales();
    this.setXYAxis();
    this.setBrush(this.currentDate);

    this.visualize();
    this.drawMainOverlay();
    if (this.props.secondaryOverlay && this.props.secondaryOverlay.length) this.drawSecondaryOverlay();
  },

  loaded: function(state) {
    return state;
  },

  // TODO: this is all wrong but works for now
  // Should set up a resize listener inside the component
  updateWidth: function() {

    var container = this.getDOMNode();
    this.setWidth(container.offsetWidth);
    if (this.xscale) this.xscale.range([0, this.width]);

    d3.select(container).select('svg').remove();
    this.svgElm = d3.select(container).append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height  + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.visualize();

    this.brush.extent([this.currentDate, this.currentDate]);
    this.handle.attr("transform", "translate(" + this.xscale(this.currentDate) + ",0)");
  },

  drawOverlay: function(overlay, elm, yscale) {
    overlay.sort(function(a,b){
      return a.date - b.date;
    });

    var that = this;
    yscale = yscale || that.yscale;

    var area = d3.svg.area()
      .x(function(d) { return that.xscale(d.date); })
      .y0(this.height)
      .y1(function(d) { return yscale(d.pct); });

    elm.datum(overlay)
      .attr('d', area);

  },

  drawMainOverlay: function() {
    var overlay = this.props.overlay;
    if (!overlay.length && !this.overlay) return;
    overlayDrawn = true;

    this.drawOverlay(overlay, this.overlay);
  },

  drawSecondaryOverlay: function() {
    var overlay = this.props.secondaryOverlay;

    if (this.secondaryOverlay) {
      this.secondaryOverlay.attr('d', '');
    } else {
      return;
    }

    if (!overlay.length) {
      hasSecondaryOverlay = false;
      this.svgElm.select('.y.axis.secondary').remove();
      return;
    }

    hasSecondaryOverlay = true;

    var vals = [];
    overlay.forEach(function(d){
      vals.push(d.pct);
    });

    var max = d3.max(vals) * 1.1;
    var pct = max * 100;
    var val;
    if (pct < 1) {
      val = 1;
    } else {
      val = Math.ceil(pct / 2) * 2;
    }

    console.log("MAX: %s, VAL: %s", max, val)
    var yscale = d3.scale.linear()
      .range([this.height, 0])
      .domain([0, val / 100]);

    var yDomain = yscale.domain();
    var tv = [yDomain[0],(yDomain[1]-yDomain[0])/2, yDomain[1] ];
    var yAxis = d3.svg.axis()
      .scale(yscale)
      .orient("right")
      .tickValues(tv)
      .tickSize(5, -this.width)
      .tickFormat(function(d,i) {
        if (i === 0 || i === 2) {
          return Math.ceil(d * 100) + "%";
        }
        return "";
      });

    this.svgElm.select('.y.axis.secondary').remove();

    this.svgElm.append("g")
      .attr("class", "y axis secondary")
      .attr("transform", "translate(" + this.width + ",0)")
      .call(yAxis);

    this.drawOverlay(overlay, this.secondaryOverlay, yscale);
  },

  visualize: function(callback) {
    var that = this;

    this.overlay = this.svgElm.append('g')
      .attr('class', 'overlay')
      .append("path")
      .attr("class", "area");

    this.secondaryOverlay = this.svgElm.append('g')
      .attr('class', 'overlay-secondary')
      .append("path")
      .attr("class", "area");

    var yAxis = this.svgElm.append("g")
      .attr("class", "y axis")
      .call(that.yAxis);

    yAxis.selectAll('line')
      .attr('transform', 'translate(0,0)');

    yAxis.selectAll('text')
      .attr('transform', 'translate(-3,0)');

    this.svgElm.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (this.height + 5) + ")")
      .call(that.xAxis);

    if (this.hasSlider) {
      this.slider = this.svgElm.append("g")
        .attr("class", "slider")
        .call(that.brush);

      this.slider.selectAll(".extent,.resize")
        .remove();

      this.slider.select(".background")
        .attr("height", this.height);

      this.handle = this.slider.append("g")
        .attr("class", "handle");

      var yearWidthHalf = this.getStepSize()/2;

      this.handle.append("rect")
        .attr('class', 'handle-bounds')
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 4)
        .attr("height", this.height + 6)
        .attr("transform", "translate(-" + 2 + ",-1)");


      this.handle.append('text')
        .attr('dy', "-5")
        .text(this.props.decade);


      this.slider
        .call(that.brush.event);

      if (typeof this.callback === 'function') this.callback(true);
    }
  },

  /*
  handleSliderChange: function(value) {
    var pctWidth = (value/100) * this.width;
    var date = this.xscale.invert(pctWidth);
  },


  <div id="marey-slider">
    <ReactSlider defaultValue={0} step={0.1} onChange={this.handleSliderChange} />
  </div>
   */

  render: function() {
    return (
        <div className="component timeline" ref="timeline">
        </div>
    );

  }

});

module.exports = Timeline;