/** @jsx React.DOM */
var React = require('react'),
    App   = require('./App.jsx');

React.render(<App showIntroOnStart={true}/>, document.getElementById('app-box'));