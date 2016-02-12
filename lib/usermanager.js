import crypto from 'crypto';
import hash from 'node_hash';
import tmoohiUser from './user';

/**
* This class manages the users TMoohI handles. A user is a pair [nickname, oauth]
**/
export default class usermanager {
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
