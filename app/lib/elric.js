var os = require('os');

/**
 * The Elric class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Elric = Function.inherits('Informer', function Elric() {

	// Set the hostname
	this.hostname = os.hostname();

	log.info('Client will be identified as ' + JSON.stringify(this.hostname));

	// Are we already connecting?
	this._connecting = false;

	// The found master packet
	this.master = null;

});

/**
 * Search and connect to the master
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function connect(callback) {

	var that = this;

	if (callback) {
		this.after('master', function gotMaster() {
			callback(null, that.master);
		});
	}

	if (this._connecting) {
		return;
	}

	if (!callback) {
		callback = Function.thrower;
	}

	this._connecting = true;

	// Send out an multicast discovery
	alchemy.discover('elric::master', function gotResponses(err, responses) {

		var announce_data,
		    master_uri,
		    connection;

		if (err) {
			return callback(err);
		}

		if (!responses.length) {
			// @todo: Try again?
			return log.error('No master instance could be found ...');
		}

		announce_data = {
			type: 'ElricClient',
			hostname: that.hostname
		};

		// Set the response packet as master info
		that.master = responses[0][1];

		log.info('Found master at ' + that.master.remote.address);

		master_uri = 'http://' + that.master.remote.address + ':' + that.master.http_port;

		connection = alchemy.callServer(master_uri, announce_data, function connected(err) {

			// Set the websocket connection
			that.connection = connection;

			if (!err) {
				log.info('Connection made with master Elric instance');
			} else {
				log.error('Could not connect to master Elric instance');
			}
		});

		connection.on('close', function closed() {
			log.info('Lost connection to master');
		});

		// Emit the master event
		that.emit('master', that.master);
	});
});

// Create the elric singleton
global.elric = new Elric();