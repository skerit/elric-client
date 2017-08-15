var libtemp  = alchemy.use('temp'),
    bcrypt   = alchemy.use('bcrypt'),
    crypto   = alchemy.use('crypto'),
    exec     = alchemy.use('child_process').execSync,
    fs       = alchemy.use('fs'),
    os       = alchemy.use('os'),
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

	// Bootup the client
	this.init();
});

/**
 * Initialize the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function init() {

	if (this._inited) {
		return;
	}

	this._inited = true;

	// @Fix bug in Janeway: when janeway doesn't start,
	// this doesn't exist and indicators throw an error
	if (!__Janeway.indicator_area) {
		__Janeway.indicator_area = {
			indicators_by_name : {},
			indicators         : []
		};
	}

	// Set the terminal title
	alchemy.Janeway.setTitle('Elric Client "' + this.hostname + '"');

	// Create the connection indicator
	this.connection_indicator = this.addIndicator({type: 'connection', name: 'connection'});

	// Add the capabilities indicator
	this.capability_indicator = this.addIndicator({type: 'capability', name: 'capabilities'});
});

/**
 * Get the time offset (compared to the server)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Number}
 */
Elric.setProperty(function offset() {

	if (this.connection) {
		return this.connection.offset;
	}

	return 0;
});

/**
 * Get the latency
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Number}
 */
Elric.setProperty(function latency() {

	if (this.connection) {
		return this.connection.latency;
	}

	return 0;
});

/**
 * Create a janeway indicator
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function addIndicator(options) {
	try {
		return __Janeway.addIndicator(options);
	} catch (err) {
		console.log(err)
		return null;
	}
});

/**
 * Get the offset corrected timestamp
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Number}
 */
Elric.setMethod(function now() {

	if (this.connection) {
		return this.connection.now();
	}

	return Date.now();
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
		fs.writeFile('elric_config.json', JSON.dry(conf, null, 4), function stored(err) {

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
 * Install synchronously using npm
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function npmInstall(packages, opts) {

	packages = Array.cast(packages);

	if (!packages.length){
		throw new Error('No packages found');
	}

	if (!opts) opts = {};

	if (!opts.cwd) {
		opts.cwd = PATH_ROOT;
	}

	var cmdString = 'npm install ' + packages.join(' ') + ' '
	+ (opts.global ? ' -g' : '')
	+ (opts.save   ? ' --save' : '')
	+ (opts.saveDev? ' --saveDev' : '')
	+ (opts.ignoreScripts? ' --ignore-scripts' : '')
	+ (opts.legacy ? ' --legacy-bundling' : '');

	var stdout = exec(cmdString, {cwd: opts.cwd ? opts.cwd : '/'});

	if (opts.output) {
		console.log('NPM: ' + stdout);
	}
});

/**
 * Require something, possibly use require_install
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function use(name) {

	var result,
	    failed;

	// Try the normal require first
	try {
		result = require(name);
	} catch (err) {
		// Ignore, use alchemy
		failed = true;
	}

	// If the require failed
	if (failed) {

		// Try alchemy.use
		result = alchemy.use(name, {silent: true});

		// If that didn't work, install the package
		if (!result) {

			this.setStatus('Installing required package "' + name + '"', false, 'simpleDotsScrolling');

			try {
				this.npmInstall(name);
				result = require(name);
				this.setStatus('Installed "' + name + '" package!');
			} catch (err) {
				console.error('Failed to install "' + name + '" package!', err);

				// @TODO: should revert to previous status?
				that.setStatus('Failed to install "' + name + '" package!');
				throw err;
			}
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
 * Set janeway statusbar
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Elric.setMethod(function setStatus(text, update, spinner) {

	if (this.current_status) {
		if (this.current_status.text == text || update) {
			this.current_status.setText(text);

			if (spinner) {
				this.current_status.startSpinner(spinner);
			} else {
				this.current_status.stopSpinner();
			}

			return this.current_status;
		}
	}

	this.current_status = alchemy.Janeway.setStatus(text, spinner);

	return this.current_status;
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
	    credentials,
	    retry_text,
	    indicator;

	retry_text = 'No master instance could be found, retrying in 5 seconds';

	if (callback) {
		this.afterOnce('master', function gotMaster() {
			callback(null, that.master);
		});
	}

	if (this._connecting) {
		return;
	}

	indicator = this.connection_indicator;

	if (!callback) {
		callback = Function.thrower;
	}

	// Indicate we are currently establishing a connection
	this._connecting = true;

	function scanSpinner() {
		indicator.scanning();
	}

	scanSpinner();

	// Send out an multicast discovery
	alchemy.discover('elric::master', function gotResponses(err, responses) {

		var announce_data,
		    master_uri,
		    connection,
		    bomb;

		if (err) {
			log.error('Discovery error: ' + err);
			return callback(err);
		}

		if (!responses.length) {

			setTimeout(function retryDiscover() {
				scanSpinner();
				alchemy.discover('elric::master', gotResponses);
			}, 5000);

			return indicator.retry();
		}

		announce_data = {
			type: 'ElricClient',
			hostname: that.hostname,
			start_time: alchemy.start_time
		};

		// Set the response packet as master info
		that.master = responses[0][1];

		indicator.connecting();

		// Create the timebomb so we'll retry after a while
		bomb = Function.timebomb(5000, function timeout(err) {

			// @TODO: destroy connection?
			indicator.timedOut();

			setTimeout(function retryDiscover() {
				scanSpinner();
				alchemy.discover('elric::master', gotResponses);
			}, 3000);
		});

		// Construct the uri to the master
		master_uri = 'http://' + that.master.remote.address + ':' + that.master.http_port;

		// Create a connection with the master elric server
		connection = alchemy.callServer(master_uri, announce_data, function connected(err) {

			// Set the websocket connection
			that.connection = connection;

			if (!err) {
				indicator.connected(that.master.remote.address);
				bomb.defuse();
			} else {
				indicator.failedToConnect();
			}
		});

		// Get credentials
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
		} else {
			connection.once('credentials', function gotCredentials(data, callback) {
				log.error('Cannot overwrite credentials, remove manually!');
				callback(new Error('Already got other set of credentials'));
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
		});

		// Listen for capability settings & files
		connection.on('capability-settings', function gotCapability(data, stream, callback) {

			that.capability_indicator.setCapability(data.name, 'settings');

			if (typeof stream == 'function') {
				callback = stream;
				stream = null;
			}

			if (stream) {
				stream.pause();

				let temp_file_options = {
					prefix : 'ccap_file_' + data.name + '_',
					suffix : '.js'
				};

				libtemp.open(temp_file_options, function opened(err, info) {

					if (err) {
						throw err;
					}

					var file = fs.createWriteStream(info.path);

					// Pipe the stream into the file
					stream.pipe(file);

					// Register the original name in janeway
					if (typeof __Janeway != 'undefined') {
						if (!__Janeway.args_name_map) {
							__Janeway.args_name_map = {};
						}

						__Janeway.args_name_map[info.path] = 'cf_' + data.name;
					}

					// Listen for the write to be finished
					file.on('finish', function ended() {

						var client_module;

						// Now require the file
						try {
							// Require the file
							client_module = require(info.path);

							if (!client_module) {
								throw new Error('Nothing was exported');
							}

						} catch (err) {
							that.capability_indicator.setCapability(data.name, 'error');
							log.error('Could not load "' + data.name + '" client capability file: ' +err, {err: err});
							return callback(err);
						}

						Blast.setImmediate(function letItInitialize() {
							startClientFile(client_module);
						});
					});

					function startClientFile(c_module) {

						var instance,
						    idata,
						    fnc;

						if (typeof c_module.create == 'function') {
							fnc = c_module.create;
						} else {
							fnc = c_module;
						}

						try {

							// Execute the main (constructor) function
							instance = fnc(elric, data.settings);

							idata = Object.assign({}, data.settings, {fnc: fnc, instance: instance})

							// Store it in the capabilities object
							that.capabilities[data.name] = idata;

							// Do the start method
							instance.doStart(callback);
						} catch (err) {
							that.capability_indicator.setCapability(data.name, 'error');
							log.error('Could not execute "' + data.name + '" client capability file: ' +err, {err: err});
							return callback(err);
						}

						that.capability_indicator.setCapability(data.name, 'loaded');

					}
				});
			} else {
				that.capability_indicator.setCapability(data.name, 'nofile');
				that.capabilities[data.name] = Object.assign({}, data.settings);
				callback();
			}
		});

		// Listen for the close event, and reconnect
		connection.on('close', function closed() {

			var entry,
			    name;

			// Unset authentication
			that.authenticated = false;

			// Unset master property
			that.master = null;

			// Unsee the master event
			that.unsee('master');

			// Set connecting to false
			that._connecting = false;

			indicator.lostConnection();

			for (name in that.capabilities) {
				entry = that.capabilities[name];

				if (entry.instance) {
					entry.instance.doStop();
				}
			}

			indicator.reconnecting();

			setTimeout(function doReconnect() {
				that.connect();
			}, 3000);
		});

		// Listen for client-commands to send to the client files
		connection.on('client-command', function gotClientCommand(data, stream, response) {

			var capability = that.capabilities[data.client_type];

			if (typeof stream == 'function') {
				response = stream;
				stream = null;
			}

			if (!capability) {
				return log.info('Ignoring command for ' + data.client_type + ': No client file found');
			}

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