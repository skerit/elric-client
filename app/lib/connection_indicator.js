/**
 * The connection indicator
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Janeway} janeway   The parent janeway instance
 */
var Connection = Function.inherits('Develry.Janeway.Indicator', function ConnectionIndicator(janeway, name, options) {
	ConnectionIndicator.super.call(this, janeway, name, options);

	//icon: '{red-fg}○{/red-fg}'}
});

/**
 * Currently scanning
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Connection.setMethod(function scanning() {

	// Set the status bar text
	elric.setStatus('Scanning for Elric master', false, 'pie');

	// Set the indicator icon
	this.setIcon('○', {color: 'red'});

	// Set the hover text
	this.setHover('Scanning...');
});

/**
 * Retrying later
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Connection.setMethod(function retry() {

	// Set the status bar text
	elric.setStatus('No master instance could be found, retrying in 5 seconds');

	// Set the indicator icon
	this.setIcon('○', {color: 'red'});

	// Set the hover text
	this.setHover('Retrying in 5 seconds...');
});

/**
 * Retrying later
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Connection.setMethod(function connecting(address) {

	address = address || elric.master.remote.address;

	// Set the status bar text
	elric.setStatus('Connecting to master at ' + address, false, 'arrow3');

	// Set the indicator icon
	this.setIcon('○', {color: 'yellow'});

	// Set the hover text
	this.setHover('Connecting to ' + address + ' ...');
});

/**
 * Connected
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Connection.setMethod(function connected(address) {

	address || elric.master.remote.address;

	// Set the status bar text
	elric.setStatus('Connection made with master Elric instance');

	// Set the indicator icon
	this.setIcon('◉', {color: 'green'});

	// Set the hover text
	this.setHover('Connected to ' + address);
});

/**
 * Failed to connect
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Connection.setMethod(function failedToConnect() {

	// Set the status bar text
	elric.setStatus('Could not connect to master Elric instance');

	// Set the indicator icon
	this.setIcon('○', {color: 'red'});

	// Set the hover text
	this.setHover('Failed to connect');
});

/**
 * Lost connection
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Connection.setMethod(function lostConnection() {

	// Set the status bar text
	elric.setStatus('Lost connection to master, destroying capability instances');

	// Set the indicator icon
	this.setIcon('○', {color: 'red'});

	// Set the hover text
	this.setHover('Connection lost, retrying ...');
});

/**
 * Timed out
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Connection.setMethod(function timedOut() {

	// Set the status bar text
	elric.setStatus('Connection attempt timed out, retrying discovery in 3 seconds');

	// Set the indicator icon
	this.setIcon('○', {color: 'red'});

	// Set the hover text
	this.setHover('Connection timeout, retrying ...');
});

/**
 * Reconnecting
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
Connection.setMethod(function reconnecting() {

	// Set the status bar text
	elric.setStatus('Reconnecting in 3 seconds ...');

	// Set the indicator icon
	this.setIcon('○', {color: 'red'});

	// Set the hover text
	this.setHover('Reconnecting in 3 seconds ...');
});