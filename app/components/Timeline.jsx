//TODO: Enable Dates to be dynamic

/** @jsx React.DOM */
var React   = require("react");
var d3      = require("d3");

var lastWindowWidth;
var fullYearFormatter = d3.time.format('%Y');
var yearFormatter = d3.time.format('%y');

var Timeline = React.createClass({
  svgElm: null,
  margin: {top: 10, right: 1, bottom: 20, left: 40},
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
      .domain([0, 100]);
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
      .tickFormat(function(d){
        if (d.getFullYear() % 50 === 0) {
          return fullYearFormatter(d);
        } else {
          return "";
        }
      });

    this.yAxis = d3.svg.axis()
      .scale(this.yscale)
      .orient("left")
      .ticks(4)
      .tickSize(10,-this.width)
      .tickFormat(function(d) {
        if (d === 100 || d === 0) {
          return d + "%";
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


  componentDidMount: function() {
    var container = this.getDOMNode();
    var that = this;
    lastWindowWidth = window.innerWidth;
    this.setWidth(container.offsetWidth);
    this.setHeight(container.offsetHeight);

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
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
  },

  componentWillUnmount: function() {

  },

  componentDidUpdate: function() {
    if (this.hasData) return;

    this.hasData = true;

    this.beginDate = this.props.startDate;
    this.endDate = this.props.endDate;

    this.setXYScales();
    this.setXYAxis();
    this.setBrush(this.currentDate);

    this.visualize();

    /*
    if ((this.props.dimensions.width !== lastWindowWidth) && this.hasData) {
      lastWindowWidth = this.props.dimensions.width;
      this.updateWidth();
    }
    if (this.props.currentDate !== this.currentDate) {
      this.currentDate = this.props.currentDate;
      if (this.brush)this.moveBrush(this.currentDate);
    }

    if (this.hasData) return;
    if (!this.props.chartdata) return;
    if (!this.props.chartdata.hasOwnProperty('entries')) return;
    this.hasData = true;

    this.visualize(
      this.props.chartdata.entries,
      this.props.chartdata.source,
      this.loaded
    );
    */
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

  visualize: function(callback) {
    var that = this;

    var yAxis = this.svgElm.append("g")
      .attr("class", "y axis")
      .call(that.yAxis);

    yAxis.selectAll('line')
      .attr('transform', 'translate(5,0)');

    yAxis.selectAll('text')
      .attr('transform', 'translate(5,0)');

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
        .attr("width", 2)
        .attr("height", this.height + 5)
        .attr("transform", "translate(-" + 1 + ",0)");


      /*
      this.handle.append("path")
        .attr("transform", "translate(0," + this.height / 2 + ")")
        .attr("d", "M 0 -" +(this.height / 2)+ " V " + (this.height / 2));

      this.handle.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "#686562")
        .attr("width", 19)
        .attr("height", 4)
        .attr("transform", "translate(-9.5,-4)");

      this.handle.append("polygon")
        .style("fill", "#686562")
        .attr("points", "17,0 8.5,12 0,0")
        .attr("transform", "translate(-8.5, 0)");
        */



      /*
      this.handle.append("polyline")
        .style("stroke", "#686562")
        .style("fill", "none")
        .style("stroke-width", 2)
        .style("stroke-miterlimit", 10)
        .attr("points", "1,0 1,4.4 " + yearWidthHalf + ",4.4 " + yearWidthHalf + ",0")
        .attr("transform", "translate(-" + yearWidthHalf/2 + "," + this.height + ")");
      */

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
        <div className="component timeline">
        </div>
    );

  }

});

module.exports = Timeline;