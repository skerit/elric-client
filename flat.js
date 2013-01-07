var fs = require('fs');

module.exports = function Flat (datafolder) {
	
	this.folder = datafolder;
	
	this.get = function get (keyname, callback) {
		
		fs.readFile(this.getPath(keyname), function (err, data) {
			if (err) {
				var object = undefined;
			} else {
				var object = JSON.parse(data);
			}
			
			if (callback !== undefined) callback(object);
		});
	}
	
	this.getSync = function getSync (keyname) {
		try {
			var json = fs.readFileSync(this.getPath(keyname));
			return JSON.parse(json);
		} catch(err) {
			return undefined;
		}
	}
	
	this.set = function set (keyname, data, callback) {
		
		var json = JSON.stringify(data);
		
		fs.writeFile(this.getPath(keyname), json, function (err) {
			if (err) throw err;
			if (callback !== undefined) callback(err);
		});
	}
	
	this.setSync = function setSync (keyname, data) {
		var json = JSON.stringify(data);
		fs.writeFileSync(this.getPath(keyname), json)
	}
	
	this.getPath = function getPath (keyname) {
		return './' + this.folder + '/' + keyname + '.json'
	}
	
}