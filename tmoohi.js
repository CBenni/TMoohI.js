var net = require("net");
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

function merge(x,y){var t=typeof x;if(t=="object"){var k=Object.keys(y),i=0;for(;i<k.length;++i)x[k[i]]=merge(x[k[i]],y[k[i]]);return x}else return y}
var settings = merge(require(argv.config), argv);
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
		this.loadServers();
	}
	
	loadServers() {
		var serversettings = Object.keys(settings.servers);
		for(var i=0;i<serversettings.length;++i) {
			var servername = serversettings[i];
			var serversettings = settings.servers[servername];
			
			var server = new require(serversettings.module)(this, servername, serversettings);
		}
	} 
}