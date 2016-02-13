var crypto = require('crypto');
var hash = require('node_hash');
var tmoohiUser = require("./lib/user.js")
/**
 * This class manages the users TMoohI handles. A user is a pair [nickname, oauth]
**/
class usermanager() {
	constructor() {
		this.users = {};
	}
	
	getUID(nick, oauth) {
		return nick+"$"+hash.sha1(oauth).substring(0,8);
	}
	
	getUser(nick, oauth) {
		var uid = self.getUID(nick, oauth);
		var user = self.users[uid];
		if(user === undefined) {
			user = new tmoohiUser(nick, oauth, uid);
		}
		return user;
	}
}