var argv = require('yargs')
	.usage('Usage: $0 <command> [options]')
	.example('$0 --config ./some_config.json')
	.describe('config', 'config.json file')
	.default('config', "./settings.json")
	.help('h')
	.alias('h', 'help')
	.argv;
var _ = require("lodash");
var usermanager = require("./lib/usermanager");
var log = require("./lib/log");

var settings = _.merge(require(argv.config || "settings.json"), argv);
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
function TMoohI() {
	var self = this;
	
	self.settings = settings;
	// start the server, create the usermanager
	self.manager = new usermanager(settings);
	self.loadServers();
	self.loadLoggers();

	self.loadServers = function() {
		var serversettings = Object.keys(settings.servers);
		for(var i=0;i<serversettings.length;++i) {
			var servername = serversettings[i];
			var serversetting = settings.servers[servername];

			var server = new require(serversetting.module)(self, servername, serversetting);
		}
	}
	self.loadLoggers = function() {
		var loggingsettings = Object.keys(settings.logging);
		for(var i=0;i<loggingsettings.length;++i) {
			var loggingsetting = loggingsettings[i];

			var logger = new require(loggingsetting.module)(loggingsetting.filters);
		}
	}
}
