/**
 * All our external requirements
 */
var EventEmitter = require('events').EventEmitter;
var async = require('async');
var io = require('socket.io-client');
var os = require('os');
var fs = require('fs');
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
client.transfer = {};
client.transfer.ready = false;
client.transfer.amount = 0;
client.transfer.done = 0;
client.transfer.files = {};

/**
 * Send data to the server,
 * store for later if no connection is available
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.01.05
 */
client.submit = function (message, type) {
	
	if (type === undefined) type = 'clientdata';
	
	if (client.connected) {
		client.socket.emit(type, message);
	} else {
		client.ioqueue.push({type: type, message: message});
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
		'key': local.key,
		'capabilities': client.capabilities
	}
	
	client.submit(auth, 'clientlogin');
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
	
	client.submit('go', 'readyForTransfer');
});

client.socket.on('file', function (file) {

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
					client.capabilities[capname] = require('./clientfiles/' + capname)(client);
				}
				
				client.event.emit('start');
			}
			
		});
	}
});

client.socket.on('disconnect', function () {
  client.connected = false;
	client.event.emit('disconnected');
	client.event.emit('stop');
});

client.event.on('start', function() {
	
});

