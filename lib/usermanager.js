var crypto = require('crypto');
var hash = require('node_hash');
var tmoohiUser = require("./user.js")
/**
 * This class manages the users TMoohI handles. A user is a pair [nickname, oauth]
**/
module.exports = function usermanager() {
	var self = this;
	self.users = {};
	
	self.getUID = function(nick, oauth) {
		return nick+"$"+hash.sha1(oauth).substring(0,8);
	}
	
	self.getUser = function(nick, oauth) {
		var uid = self.getUID(nick, oauth);
		var user = self.users[uid];
		if(user === undefined) {
			user = self.users[uid] = new tmoohiUser(nick, oauth, uid);
		}
		return user;
	}
}