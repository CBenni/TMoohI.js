var net = require("net");
var _ = require("lodash");
var argv = require('yargs')
	.usage('Usage: $0 <command> [options]')
	.example('$0 --config ./some_config.json')
	.describe('config', 'config.json file')
	.default('config', "./settings.json")
	.help('h')
	.alias('h', 'help')
	.argv;

var usermanager = require("./lib/usermanager");
var messageparser = require("./lib/messageparser")

var settings = require(argv.config);
/**
GENERAL INFO

Naming conventions:
(local) client - A client connecting to tmoohi.js, for example a bot or IRC client
(local) server - A server accepting connections from (local) clients
cluster name - One of twitchs chat clusters (normalchat, eventchat, groupchat)
channel name - the name of the IRC channel, without cluster info (ex. #cbenni)
user - a twitch account, identified by the twitch oauth login information (nickname and oauth)
(user) manager - manages the users that tmoohi.js is connected with
connection - TCP connection to a TMI server
**/
class TMoohI {
	constructor(settings) {
		self.settings = settings;
		// start the server, create the usermanager
		self.manager = new usermanager(settings);
		this.loadLoggers();
		this.loadServers();
	}
	
	loadServers() {
		var serversettings = Object.keys(settings.servers);
		for(var i=0;i<serversettings.length;++i) {
			var servername = serversettings[i];
			var serversetting = settings.servers[servername];
			
			var server = new require(serversetting.module)(this, servername, serversetting);
		}
	}
	
	loadLoggers() {
		for(var i=0;i<settings.loggers.length;++i) {
			var loggersetting = settings.loggers[i];
			var logger = new require(loggersetting.module)(loggersetting.filters, loggersetting);
		}
	} 
}