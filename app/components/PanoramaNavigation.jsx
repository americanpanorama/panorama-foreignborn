/** @jsx React.DOM */
var React   = require("react");
var Modal   = require('react-modal');

var PanoramaNavigation = React.createClass({

	getDefaultProps: function() {
		return {
			title: 'American Panorama',
    		home_url: 'http://dsl.richmond.edu/panorama',
    		links: [],
    		link_separator: ' ',
    		nav_data: {},
    		show_menu : false,
    		on_hamburger_click: null,
    		style: {
    			overlay: {
    				position: 'fixed',
    				top: 0,
    				left: 0,
    				backgroundColor: 'rgba(0,0,0,0.5)'
				},
				content: {
    				position: 'absolute',
    				top: 0,
    				left: 0,
    				bottom: 'auto',
    				right: 'auto',
    				border: 0,
    				background: 'rgba(0,0,0,0.5)',
    				overflow: 'auto',
    				WebkitOverflowScrolling: 'touch',
    				borderRadius: '4px',
    				outline: 'none',
    				padding: 0
				}
    		}
		}
	},

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

		var that = this;

		return (
			<div>

				<div id='hamburger'><img src='http://dsl.richmond.edu/panorama/static/images/hamburger.png' onClick={ this.props.on_hamburger_click } /></div>

				<Modal
				  isOpen={ this.props.show_panorama_menu }
				  onRequestClose={ this.props.on_hamburger_click }
				  overlayClassName='panorama-modal'
				  className="nav_header"
				  style={ this.props.style }
				>
					<div id='nav_header'>
						<div id='navburger'><img src='http://dsl.richmond.edu/panorama/static/images/hamburger.png' onClick={ this.props.on_hamburger_click } /></div>
					
						{ (this.props.title && this.props.home_url) ? <h1><a href={ this.props.home_url }>{ this.props.title }</a></h1> : '' }

            			<h2>
            				{ 
								this.props.links.map(function(item, i) {
									return (
										<a href={ item.url } key={ 'pan_nav_links_' + i }>{ (i < that.props.links.length - 1) ? item.name + that.props.link_separator : item.name }</a>
									);
								})
							}
						</h2>

						<div id='maps'>  
							{
								this.props.nav_data.map(function(item, i) {
									return (
										<div className='pan_nav_item' key={ 'pan_nav_item_' + i }  style={{width: that.computeDimensions() + 'px'}}>
											<a href={ item.url }><img src={ item.screenshot } style={{width: that.computeDimensions() + 'px'}} /></a><br/> 
											<h4>
												<a href={ item.url }>{ item.title }</a>
											</h4>
										</div>
									)
								})
							}
						</div>
					</div>
				</Modal>
			</div>


		);
	}

});

module.exports = PanoramaNavigation;
