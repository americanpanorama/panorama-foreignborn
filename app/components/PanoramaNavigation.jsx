/** @jsx React.DOM */
var React   = require("react");
var Modal   = require('react-modal');

var PanoramaNavigation = React.createClass({


	componentDidMount: function() {

	},

	componentWillUnmount: function() {

	},

	componentWillMount: function() {
	
	},

	componentDidUpdate: function() {

	},

	computeDimensions: function() {
		// width of the left and right margins are 10
		return (window.innerWidth - 40 * (this.props.nav_data.length)) / (this.props.nav_data.length);
	},


	render: function() {

		return (
			<div>

				<div id='hamburger'><img src='http://dsl.richmond.edu/panorama/static/images/hamburger.png' onClick={ this.props.on_hamburger_click } /></div>
	
				<Modal
				  isOpen={ this.props.show_panorama_menu }
				  onRequestClose={ this.props.on_hamburger_click }
				  className="nav_header"
				>
					<div id='navburger'><img src='http://dsl.richmond.edu/panorama/static/images/hamburger.png' onClick={ this.props.on_hamburger_click } /></div>
	
					<div id='nav_header'>
						<h1><a href='/panorama/'>American Panorama</a></h1>
						{
							this.props.nav_data.map(function(item, i) {
								return (
									<div className='pan_nav_item' style={{width: this.computeDimensions() + 'px'}}>
										<img src={ item.screenshot } style={{width: this.computeDimensions() + 'px'}} /><br/> 
										<h4>
											<a href='{ this.url }'>{ item.title }</a>
										</h4>
									</div>
								)
							}.bind(this));
						}
					</div>
				</Modal>
			</div>


		);
	}

});

module.exports = PanoramaNavigation;
