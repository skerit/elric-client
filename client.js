/**
 * Load in the core alchemy functionality
 */
require('alchemymvc');

// Create the elric global
GLOBAL.elric = {};

var local    = require('./local'),
    address  = 'ws://' + local.server + ':' + local.serverport;

alchemy.callServer(address, function(server) {

	log.verbose('Established connection to Elric server at ' + (local.server + ':' + local.serverport).bold);

	elric.server = server;

});