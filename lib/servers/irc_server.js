const net = require("net");
const tls = require("tls");
const _ = require("lodash");
var log = require("../log");
const parseIRCMessage = require("../messageparser.js");
const TAGS = 1;
const PREFIX = 2;
const COMMAND = 3;
const PARAM = 4;
const TRAILING = 5;
/**
**/
function IRCClient(server, socket) {
	var self = this;
	self.socket = socket;
	var buffer = new Buffer('');
	var lineregex = /\r\n|\r|\n/;
	self.server = server;
	self.user = undefined;
	// maps cluster->channel name to a list of channel ids
	self.channels = { event:{}, normal:{}, group:{} };
	self.caps = [];
	
	socket.on("data", function(data) {
		if (typeof (chunk) === 'string') {
			buffer += chunk;
		} else {
			buffer = Buffer.concat([buffer, chunk]);
		}

		var lines = buffer.toString().split(lineregex);

		if (lines.pop()) {
			return;
		} else {
			buffer = new Buffer('');
		}

		for(var i=0;i<lines.length;++i) {
			var parsed = parseIRCMessage(lines[i]);
			var command = parsed[COMMAND];
			if(command == "PING") {
				self.send("PONG");
			} else if(command == "NICK") {
				self.nick = parsed[PARAM];
				self.server.addClient(self);
			} else if(command == "PASS") {
				self.oauth = parsed[PARAM];
			} else if(command == "CAP") { // capability negotiation
				var subcommand = parsed[PARAM];
				var caps = parsed[TRAILING].split(" ")
				if(subcommand == "REQ") {
					for(var j=0;j<caps.length;j++) {
						cap = caps[i];
						if(cap[0] == "-") {
							// remove the capability
							self.caps = _.pull(self.caps, cap.substr(1));
						} else {
							// add the capability
							self.caps = _.union(self.caps, [cap]);
						}
					}
				} else if (subcommand == "LS") {
					
				}
			} else {
				if(self.user === undefined) self.send("451 :You have not registered");
				else if(command == "JOIN") {
					self.user.joinChannel(self, parsed[PARAM], function(channelID, cluster){
						if(!self.channels[cluster][channelID]) self.channels[cluster][channelID] = [];
						self.channels[cluster][channelID].push(parsed[PARAM]);
					});
				}
			}
		}
	});
	
	socket.on("end", function() {
		self.server.clients.splice(self.server.clients.indexOf(self), 1);
	});
	
	self.broadcast = function(parsedmessage) {
		var params = parsedmessage[PARAM].split(" ");
	}
}
/**
A server allowing IRC clients to connect
channel id - A channel name and possibly cluster name (ex #cbenni, #cbenni@normalchat, #cbenni@norm, #cbenni@event)
cluster seperator - The delimiter that seperates channel name from cluster name (@ in aboves example)
**/
function IRCServer(tmoohi, servername, settings) {
	var self = this;
	self.tmoohi = tmoohi;
	self.name = servername;
	self.usermanager = tmoohi.usermanager;
	self.settings = settings;
	self.clients = {};
	if(settings.cert && settings.key) {
		log.write("INFO","IRC server","Starting secure IRC server on "+settings.host+":"+settings.port);
		// If cert and key are specified, open a TLS connection
		self.server = tls.createServer({key: fs.readFileSync(settings.key), cert: fs.readFileSync(settings.cert)},function (socket) {
			new IRCClient(self, socket);
		}).listen(settings.port, settings.host);
	}
	else {
		log.write("INFO","IRC server","Starting IRC server on "+settings.host+":"+settings.port);
		self.server = net.createServer(function (socket) {
			self.clients.push(new IRCClient(self, socket));
		}).listen(settings.port, settings.host);
	}
	self.server.on("error", function(err) {
		if(err) log.write("ERROR","IRC server",err);
	});
	self.server.on("close", function(){
		log.write("INFO","IRC server","Closing server");
	});
	
	self.addClient = function(client) {
		var uid = self.usermanager.getUID(client.nick, client.oauth);
		if(self.clients[uid] === undefined) self.clients[uid] = [];
		self.clients[uid].push(client);
	}
}

module.exports = IRCServer;
			