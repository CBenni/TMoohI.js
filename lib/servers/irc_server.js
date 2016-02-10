const net = require("net");
const tls = require("tls");
const _ = require("lodash");
const parseIRCMessage = require("../messageparser.js");
const TAGS = 1;
const PREFIX = 2;
const COMMAND = 3;
const PARAM = 4;
const TRAILING = 5;
/**
**/
class IRCClient {
	constructor(server, socket) {
		var self = this;
		self.socket = socket;
		var buffer = new Buffer('');
		var lineregex = /\r\n|\r|\n/;
		self.server = server;
		self.user = undefined;
		// maps cluster->channel name to a list of channel ids
		self.channels = { eventchat:{}, normalchat:{}, groupchat:{} };
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
					} else if (subcommand == "LS")
				} else {
					if(self.user === undefined) self.send("451 :You have not registered");
					else if(command == "JOIN") {
						self.user.joinChannel(self, parsed[PARAM], function(channelID, cluster){
							if(!self.channels[cluster][channelID]) self.channels[cluster][channelID] = [];
							self.channels[cluster][channelID].push(parsed[PARAM]);
						}
					}
				}
			}
		});
		
		socket.on("end", function() {
			self.server.clients[].splice(clients.indexOf(self), 1);
		});
	}
	
	broadcast(parsedmessage) {
		
	}
}
/**
A server allowing IRC clients to connect
channel id - A channel name and possibly cluster name (ex #cbenni, #cbenni@normalchat, #cbenni@norm, #cbenni@event)
cluster seperator - The delimiter that seperates channel name from cluster name (@ in aboves example)
**/
class IRCServer {
	constructor(tmoohi, settings) {
		var self = this;
		self.tmoohi = tmoohi;
		self.usermanager = tmoohi.usermanager;
		self.settings = settings;
		self.clients = {};
		if(settings.cert && settings.key) {
			// If cert and key are specified, open a TLS connection
			self.server = net.createServer({key: fs.readFileSync(settings.key), cert: fs.readFileSync(settings.cert)},function (socket) {
				new IRCClient(self, socket);
			}).listen(settings.port, settings.host);
		}
		else {
			self.server = net.createServer(function (socket) {
				self.clients.push(new IRCClient(self, socket));
			}).listen(settings.port, settings.host);
		}
	}
	
	addClient(client) {
		var uid = self.usermanager.getUID(client.nick, client.oauth);
		if(self.clients[uid] === undefined) self.clients[uid] = [];
		self.clients[uid].push(client);
	}
}

module.exports = IRCServer;
			