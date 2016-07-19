var React = require("react");


/**
 * The new (Summer 2016) intro modal.
 * This is distinct from the intro.js "intro",
 * which acts more like a series of walkthrough overlays.
 */
var coverImgPath = './static/images/introModalCover.png';
var IntroModal = React.createClass({

	propTypes: {
		onDismiss: React.PropTypes.func
	},

	componentWillMount: function() {

		var img = new Image(),
			onload = function (event) {
				img.removeEventListener('load', onload);
				this.setState({
					coverImgLoaded: true
				});
			}.bind(this);

		img.addEventListener('load', onload);
		img.src = coverImgPath;

	},

	getInitialState: function () {

		return {
			pageIndex: 0,
			coverImgLoaded: false
		};

	},

	setPage: function (pageIndex) {

		pageIndex = Math.max(0, Math.min(pageIndex, 1));
		this.setState({
			pageIndex: pageIndex
		});

	},

	dismissIntro: function () {

		if (this.props.onDismiss) this.props.onDismiss(this.refs.muteIntroInput.getDOMNode().checked);

	},

	handleInputChange: function () {

		this.refs.muteIntroLabel.getDOMNode().classList.toggle('checked', this.refs.muteIntroInput.getDOMNode().checked);

	},



	// ============================================================ //
	// Lifecycle
	// ============================================================ //

	render: function () {

		if (this.state.pageIndex === 0) {

			return (
				<div className='intro-modal'>
					<div className='page p0'>
						<div className='title-block'>
							<h1>FOREIGN-BORN POPULATION</h1>
							<h3>1850 – 2010</h3>
						</div>
						<img src={ coverImgPath } className={ this.state.coverImgLoaded ? '' : 'loading' } />
						<p>Lorem dim sum Lo mai gai baked barbecue pork bao Egg custard tarts. Popular shumai cha siu bao A creamy mango pudding Chiu-chao fan guo Siu mai Haam sui gau Jiu cai bau Zhaliang Pei guen Lo baak gou. Taro cake Deep fried pumpkin and egg-yolk ball vegetarian crisp spring rolls dried scallop and leek puff deep fried seaweed roll BBQ pork puff. Pan friend pork dumpling Pot sticker water chestnut cake bitter melon beef dumplings turnip cake.</p>
						<div className='intro-modal-button' onClick={ function (e) { this.setPage(1); }.bind(this) }>Next</div>
					</div>
				</div>
			);

		} else {

			return (
				<div className='intro-modal'>
					<div className='page p1'>
						<div className='title-block'>
							<h3>How to Use</h3>
							<h2>THIS MAP</h2>
						</div>
						<div className='content'>
							<ol>
								<li>
									<div className='ordinal'>1</div>
									<div className='item'>
										<p>See how the foreign-born density of counties in the US changes over time.</p>
										<img src='./static/images/introModalStep01.png' />
									</div>
								</li>
								<li className='wider'>
									<div className='ordinal'>2</div>
									<div className='item text-overlay'>
										<p>The green circles indicate how many people in the US were born in that country in a given year.</p>
										<img src='./static/images/introModalStep02.png' />
									</div>
								</li>
								<li>
									<div className='ordinal descender'>3</div>
									<div className='item'>
										<p>The timeline shows totals for the US as well as whatever country or county is selected.</p>
										<img src='./static/images/introModalStep03.png' />
									</div>
								</li>
								<li className='wider'>
									<div className='ordinal descender'>4</div>
									<div className='item'>
										<p>See which country had the largest migrant population for the given year.</p>
										<img src='./static/images/introModalStep04.png' />
									</div>
								</li>
							</ol>
						</div>
						<p className='map-desc'>Lorem dim sum turnip cake leek dumplings deep fried taro turnover. Cha siu sou Cheong fan pan fried bitter melon beef dumpling mango pudding coconut milk pudding.</p>
						<div className='intro-modal-button' onClick={ this.dismissIntro }>Enter</div>
						<div className='footer'>
							<div onClick={ function (e) { this.setPage(0); }.bind(this) }>&lt; back</div>
							<label onChange={ this.handleInputChange } ref='muteIntroLabel'><input type='checkbox' ref='muteIntroInput' />do not show again</label>
						</div>
					</div>
				</div>
			);

		}

	}

});

module.exports = IntroModal;
