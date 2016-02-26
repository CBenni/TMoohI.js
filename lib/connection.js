var ws = require("ws");
var events = require('events');

var log = require("./log");
var parse = require("./messageparser");

function Connection(user, id, ip) {
	var self = this;
	self.channelstojoin = [];
	self.joinedchannels = [];
	self.id = id;
	self.ip = ip;
	self.connected = true;
	
	// ratelimiting
	self.ratelimitinterval = 30000;
	self.ratelimit = 15; // max. 15 messages per 30s
	self.senttimes = [];
	self.timeUntilCanSend() {
		var t = Date.now();
		// clear out list of expired messages
		while(self.senttimes.length > 0) {
			var timeremaining = self.ratelimitinterval-t+self.senttimes[0];
			if(timeremaining > 0) self.senttimes.shift();
			else if(self.senttimes.length > self.ratelimit) {
				return timeremaining;
			}
			else {
				return 0;
			}
		}
		return 0;
	}
	
	self.send = function(message) {
		var timeremaining = self.timeUntilCanSend();
		if(timeremaining <= 0) {
			self.wss.send(message);
			log.write("DEBUG","connection","Sending message on bot id "+self.id+": "+message);
			self.senttimes.push(Date.now());
			return 0;
		}
		else {
			return timeremaining;
		}
	}
	
	self.wss = new ws("wss://"+ip)
		.on("open",function(){self.emit("open")})
		.on("close",function(){self.emit("close")})
		.on("end",function(){self.emit("close")})
		.on("timeout",function(){self.wss.end()})
		.on("error",function(){log.write(error)}
		.on("data",function(data){
			var lines = data.split(" ");
			for(var i=0;i<lines.length;++i) {
				var message = parse(lines[i]);
				self.emit("raw",message);
				self.emit(message[parse.COMMAND],message);
			}
		});
}
Connection.prototype = new events.EventEmitter();

module.exports = Connection;