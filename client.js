/**
 * Load in the core alchemy functionality
 */
require('alchemymvc');

// Intercept uncaught exceptions so the server won't crash
// @todo: this should be expanded and integrated into alchemy itself
process.on('uncaughtException', function(error) {

	// Indicate we caught an exception
	log.error('Uncaught Exception!', {err: error});

	console.log(error.stack)
});

alchemy.start({client_mode: true}, function ready() {

	// Create a connection to the master
	elric.connect(function done(err) {
		if (err) {
			log.error('Failed to establish connection: ' + err);
		}
	});
});




return;

console.log('Submitting data');

var text = 'this is data from the client';

alchemy.multicast('client', text, true, function(responses) {
	console.log('Got client response', responses);
});

// alchemy.callServer('192.168.1.2:3000', function() {
// 	console.log('Connected!');
// })


return;

var local    = require('./local'),
    address  = 'ws://' + local.server + ':' + local.serverport;

alchemy.callServer(address, {type: 'elric_client'}, function(server) {

	log.verbose('Established connection to Elric server at ' + (local.server + ':' + local.serverport).bold);

	elric.server = server;

	server.on('settings', function(settings) {
		pr(settings);
	});

});