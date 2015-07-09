/**
 * Load in the core alchemy functionality
 */
require('alchemymvc');

setTimeout(function() {
	console.log('Submitting data');
alchemy.multicast('client', 'this is data from the client', true, function(response, packet, callback) {
	console.log('Got client response', response);
});
}, 200)

return;

var local    = require('./local'),
    address  = 'ws://' + local.server + ':' + local.serverport;

alchemy.callServer(address, function(server) {

	log.verbose('Established connection to Elric server at ' + (local.server + ':' + local.serverport).bold);

	elric.server = server;

});