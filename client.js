/**
 * All our external requirements
 */
var EventEmitter = require('events').EventEmitter;
var async = require('async');
var io = require('socket.io-client');
var os = require('os');
var fs = require('fs');
var jQuery = require('jquery');
var $ = jQuery;
var local = require('./local');
var flat = require('./flat');

var client = {}
client.connected = false;
client.socket = io.connect(local.server + ':' + local.serverport, {reconnect: true});
client.name = os.hostname();
if (local.clientname) client.name = local.clientname;
client.event = new EventEmitter();
client.ioqueue = [];
client.flat = new flat('settings');
//client.capabilities = client.flat.getSync('capabilities');
client.capabilities = {};
client.settings = {}; // These are sent to us from the server
client.transfer = {};
client.transfer.ready = false;
client.transfer.amount = 0;
client.transfer.done = 0;
client.transfer.files = {};
client.jQuery = $;
client.$ = $;

/**
 * Add a jQuery regex expression
 *
 * @author   James Padolsey   http://james.padolsey.com/
 * @since    2013.01.09
 */
$.expr[':'].regex = function(elem, index, match) {
	var matchParams = match[3].split(','),
			validLabels = /^(data|css):/,
			attr = {
					method: matchParams[0].match(validLabels) ? 
					        matchParams[0].split(':')[0] : 'attr',
					property: matchParams.shift().replace(validLabels,'')
			},
			regexFlags = 'ig',
			regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g,''), regexFlags);
	return regex.test(jQuery(elem)[attr.method](attr.property));
}


/**
 * Send data to the server,
 * store for later if no connection is available
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.05
 * @version  2013.01.09
 */
client.submit = function (type, message, filter) {
	
	if (message === undefined) message = true;
	if (type === undefined) type = 'data';
	if (filter === undefined) filter = false;
	
	var packet = {type: type, message: message, filter: filter};
	
	if (client.connected) {
		client.socket.emit('client', packet);
	} else {
		client.ioqueue.push(packet);
	}
}

/**
 * Return a submit function that automatically adds a filter
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.09
 * @version  2013.01.09
 *
 * @returns    {function}        The submit function
 */
client.filteredSubmit = function (filter) {
	return function filteredSubmit (type, message) {
		client.submit(type, message, filter);
	}
}

/**
 * Login to the server
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.05
 */
client.login = function () {
	
	var auth = {
		'login': client.name,
		'key': local.key
	}
	
	client.submit('login', auth);
}

client.socket.on('connect', function(socket) {
	
	console.log('Connected to server ' + local.server + ' on port ' + local.serverport + ' as ' + client.name);
	
	client.connected = true;
	
	// Emit an event on our internal event emitter
	client.event.emit('connected');
	
	// Send the login message
	client.login();

});

client.socket.on('notifyTransfer', function (data) {
	client.transfer.amount = data.amount;
	client.transfer.done = 0;
	client.transfer.files = data.capabilities;
	client.transfer.ready = true;
	
	client.submit('readyForSettings');
});

/**
 * Handle file data
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.07
 * @version  2013.01.07
 *
 */
client.socket.on('file', function (file) {
console.log('Receiving file');
	if (file.type == 'clientfile') {

		fs.writeFile('./clientfiles/' + file.name + '.js', file.data, function(err){
			if(err){
				console.log('File could not be saved: ' + err);
			}else{
				console.log('File ' + file.name + " saved");
			};
			
			// Indicate this transfer is complete
			client.transfer.done++;
			
			if (client.transfer.done == client.transfer.amount) {
				
				// File transfers are done, now we can initialize those files
				for (var capname in client.transfer.files) {
					
					var loadCapability = false;
					
					// Only initialize if the capability has been enabled!
					if (client.settings[capname] !== undefined) {
						loadCapability = client.settings[capname].enabled;
					}
					
					if (loadCapability) client.capabilities[capname] = require('./clientfiles/' + capname)(client);
				}
				
				// Now we can send the started signal
				client.event.emit('start');
				client.submit('started');
			}
			
		});
	}
});

/**
 * Handle capability settings
 * When this has finished, the server can send files
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.09
 * @version  2013.01.09
 *
 */
client.socket.on('settings', function (settings) {
	client.settings = settings;
	client.submit('readyForTransfer');
});

client.socket.on('disconnect', function () {
  client.connected = false;
	client.event.emit('disconnected');
	client.event.emit('stop');
});

client.event.on('start', function() {
	
});

