var net = require("net");
var _ = require("lodash");
var jsonfile = require("jsonfile");
var argv = require('yargs')
	.usage('Usage: $0 <command> [options]')
	.example('$0 --config some_config.json')
	.describe('config', 'config.json file')
	.default('config', "settings.json")
	.help('h')
	.alias('h', 'help')
	.argv;

var usermanager = require("./lib/usermanager");
var messageparser = require("./lib/messageparser");
var log = require("./lib/log");

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
function TMoohI(settings) {
	var self = this;
	self.settings = settings;
	
	self.loadLoggers = function() {
		for(var i=0;i<settings.loggers.length;++i) {
			var loggersetting = settings.loggers[i];
			var module = require(loggersetting.module);
			var logger = new module(loggersetting.filters, loggersetting);
			log.addLogger(logger);
		}
	}
	
	self.loadServers = function() {
		var serversettings = Object.keys(settings.servers);
		for(var i=0;i<serversettings.length;++i) {
			var servername = serversettings[i];
			log.write("INFO","main","Loading server "+servername);
			var serversetting = settings.servers[servername];
			var module = require(serversetting.module);
			var server = new module(this, servername, serversetting);
		}
	}
	
	
	// start the server, create the usermanager
	self.manager = new usermanager(settings);
	self.loadLoggers();
	log.write("INFO","main","Loaded loggers, starting servers");
	self.loadServers();
}

if(argv.config) {
	var settings = jsonfile.readFile(argv.config,function(err, res) {
		if(err) {
			console.log("Error: couldnt read settings file "+argv.config+": "+err);
			return;
		}
		var tmoohi = new TMoohI(res);
	});
} else {
	console.log("Error: No config file specified.");
}