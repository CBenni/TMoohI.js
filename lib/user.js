/** Represents a user, which is basically a (nick, oauth) pair
 *
**/
function user(nick, oauth, uid) {
	var self = this;
	self.nick = nick;
	self.oauth = oauth;
	self.uid = uid;
	
	
	
}

module.exports = user;