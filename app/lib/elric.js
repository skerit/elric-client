var require_install = require('require-install'),
    bcrypt = alchemy.use('bcrypt'),
    crypto = alchemy.use('crypto'),
    libtemp = alchemy.use('temp'),
    fs = alchemy.use('fs'),
    os = require('os'),
    conf;

(function readConfig() {
	try {
		// Get the configuration file
		conf = fs.readFileSync('elric_config.json', 'utf-8');

		// Undry it
		conf = JSON.undry(conf);
	} catch (err) {
		// Create a new conf object
		conf = {};
	}
}());

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

	// Are we authenticated?
	this.authenticated = false;

	// Store capabilities
	this.capabilities = {};

	// Create a new queue for storing files
	this.store_queue = Function.createQueue();
	this.store_queue.limit = 1;
	this.store_queue.start();
});

/**
 * Get/set configuration
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function config(key, val, callback) {

	if (arguments.length == 1) {
		return conf[key];
	}

	conf[key] = val;

	if (callback !== false) {
		this.storeConfig(callback);
	}

	return val;
});

/**
 * Store the config to disk
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function storeConfig(callback) {
	this.store_queue.add(function doStore(done) {
		fs.writeFile('elric_config.json', JSON.dry(conf), function stored(err) {

			if (err) {
				log.error('Failed to store config file: ' + err);
			}

			if (callback) {
				callback(err);
			}

			done();
		});
	});
});

/**
 * Require something, possibly use require_install
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function use(name) {

	var result;

	try {
		result = alchemy.use(name, {silent: true});
	} catch (err) {
		// Try again using require_install

		// For debug purposes: throw err, don't try require_install
		throw err;
	}

	if (!result) {
		console.log('Trying require_install for', name);
		return null;
		// @todo: cache?
		try {
			result = require_install(name);
		} catch(err) {
			console.log('ERR:', err);
		}
	}

	return result;
});

/**
 * Get auth key to send to the master
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function generateAuthKey(callback) {

	var credentials = this.config('credentials');

	if (!credentials) {
		return callback(new Error('No credentials set'));
	}

	// Generate a bcrypt hash
	bcrypt.hash(credentials.key, 12, callback);
});

/**
 * Check server secret
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function checkServerSecret(hash, callback) {

	var credentials = this.config('credentials');

	if (!credentials) {
		return callback(new Error('No credentials set'));
	}

	// Compare the local secret to the received hash
	bcrypt.compare(credentials.secret, hash, callback);
});

/**
 * Search and connect to the master
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function connect(callback) {

	var that = this,
	    credentials;

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
			hostname: that.hostname,
			start_time: alchemy.start_time
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

		credentials = that.config('credentials');

		// If this client hasn't been paired yet, wait for credentials
		if (!credentials) {

			connection.once('credentials', function gotCredentials(data, callback) {

				that.config('credentials', data, function stored(err) {

					if (err) {
						log.error('Failed to store credentials: ' + err);
						return callback(err);
					}

					callback(null, 'STORED');
				});
			});
		}

		// Listen to server authentication requests
		connection.on('request-authentication', function gotServerKey(hash, callback) {

			// Check the hash the server sent us, make sure it's genuine
			that.checkServerSecret(hash, function checked(err, result) {

				if (err || !result) {
					log.error('Could not authenticate the server!');
					return callback(err || new Error('Failed to authenticate server'));
				}

				that.generateAuthKey(function gotKey(err, client_hash) {

					if (err) {
						log.error('Could not generate key to send to server');
						return callback(err);
					}

					callback(null, client_hash);
				});
			});
		});

		// Listen for the authenticated event
		connection.on('authenticated', function gotAuthenticated() {
			that.authenticated = true;
			log.info('Client has been authenticated');
		});

		// Listen for capability settings & files
		connection.on('capability-settings', function gotCapability(data, stream, callback) {

			if (typeof stream == 'function') {
				callback = stream;
				stream = null;
			}

			if (stream) {
				stream.pause();

				libtemp.open('ccap_file_' + data.name + '_', function opened(err, info) {

					var file = fs.createWriteStream(info.path);

					// Pipe the stream into the file
					stream.pipe(file);

					// Listen for the write to be finished
					stream.on('end', function ended() {

						var client_fnc,
						    instance,
						    idata;

						// Now require the file
						try {
							// Require the file
							client_fnc = require(info.path);

							// Execute the main (constructor) function
							instance = client_fnc(elric, data.settings);

							idata = Object.assign({}, data.settings, {fnc: client_fnc, instance: instance})

							// Store it in the capabilities object
							that.capabilities[data.name] = idata;

							// Do the start method
							instance.start(callback);
						} catch (err) {
							log.error('Could not execute "' + data.name + '" client capability file: ' +err);
							return callback(err);
						}

						log.info('Client capability file "' + data.name + '" has loaded');
					});
				});
			} else {
				log.info('Capability settings for "' + data.name + '" have been stored, no client files found');
				that.capabilities[data.name] = Object.assign({}, data.settings);
				callback();
			}
		});

		connection.on('close', function closed() {
			that.authenticated = false;
			log.info('Lost connection to master');
		});

		// Listen for client-commands to send to the client files
		connection.on('client-command', function gotClientCommand(data, stream, response) {

			var capability = that.capabilities[data.client_type];

			if (typeof stream == 'function') {
				response = stream;
				stream = null;
			}

			console.log('Got client command', data, stream, response);

			if (!capability) {
				return log.info('Ignoring command for ' + data.client_type + ': No client file found');
			}

			console.log('Emitting event "' + data.command_type + '" on client instance');

			if (stream) {
				capability.instance.emit(data.command_type, data, stream, response, null);
			} else {
				capability.instance.emit(data.command_type, data, response, null);
			}
		});

		// Emit the master event
		that.emit('master', that.master);
	});
});

// Create the elric singleton
global.elric = new Elric();