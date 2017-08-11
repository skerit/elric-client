/**
 * Load in the core alchemy functionality
 */
require('alchemymvc');

// Intercept uncaught exceptions so the server won't crash
// @todo: this should be expanded and integrated into alchemy itself
process.on('uncaughtException', function(error) {
	// Indicate we caught an exception
	alchemy.printLog('error', ['Uncaught Exception!', String(error), error], {err: error, level: -2});
});

alchemy.start({client_mode: true}, function ready() {

	// Create a connection to the master
	elric.connect(function done(err) {
		if (err) {
			log.error('Failed to establish connection: ' + err);
		}
	});
});