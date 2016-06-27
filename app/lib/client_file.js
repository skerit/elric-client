/**
 * The base ClientFile class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var CF = Function.inherits('Informer', function ClientFile(client, settings) {

	// This is basically `elric`
	this.client = client;

	// The settings passed to us by the server
	this.settings = Object.assign({}, this.default_settings, settings);

	log.info('Capability ' + this.constructor.name + ' is starting up');
});

/**
 * Setup the class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
CF.constitute(function setup() {

	var that = this;

	// Add a static create method
	this.create = function create(client, settings) {
		return new that(client, settings);
	};

	log.info('Capability file ' + this.constructor.name + ' has been registered');
});

/**
 * Default client file settings
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @type {Object}
 */
CF.setProperty('default_settings', {});

/**
 * Listen to server-initiated linkups
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   type
 * @param    {Function} callback
 */
CF.setMethod(function onLinkup(type, callback) {
	this.client.connection.onLinkup(type, callback);
});

/**
 * Execute a capability command on the elric server
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   type
 */
CF.setMethod(function remoteCommand(type) {

	var args = [],
	    i;

	for (i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	}

	this.client.connection.submit('capability-command', {
		capability: this.constructor.name.before('ClientFile'),
		type: type,
		args: args
	});
});

/**
 * Start this client file
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
CF.setMethod(function doStart(callback) {
	this.start(callback);
});

/**
 * Start method the client should inherit
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
CF.setMethod(function start(callback) {
	setImmediate(callback);
});

/**
 * Submit a message to the server
 * @TODO: add stream support and such
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
CF.setMethod(function submit(type, msg) {
	this.client.connection.submit(type, msg);
});

/**
 * Stop this client file
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
CF.setMethod(function doStop() {

	var key;

	console.log('Stopping', this.constructor.name, this);

	// Destroy all the linkups first
	for (key in this.client.connection.linkups) {
		this.client.connection.linkups[key].destroy();
	}

	// Call the stop method last
	this.stop();
});

/**
 * Stop method the client should inherit
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
CF.setMethod(function stop() {});