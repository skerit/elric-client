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
	this.settings = settings;

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