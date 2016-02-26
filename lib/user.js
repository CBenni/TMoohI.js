/** Represents a user, which is basically a (nick, oauth) pair
 * that manages the connections to TMI servers
**/
function user(nick, oauth, uid) {
	var self = this;
	self.nick = nick;
	self.oauth = oauth;
	self.uid = uid;
	
	self.connections = {
		"event": [],
		"normal": [],
		"group": []
	}
	self.queue = {
		"event": [],
		"normal": [],
		"group": []
	}
	self.nextconn = {
		"event": 0,
		"normal": 0,
		"group": 0
	}
	self.timeout = null;
	self._send = function(cluster, message) {
		//console.log("Trying to send message "+message);
		var timeremaining = Infinity;
		var connlist = self.connections[cluster];
		for(var i=0;i<connlist.length; ++i) {
			var bot = connlist[(i+self.nextconn)%self.connections.length];
			var res = bot.send(message);
			if(res === 0) {
				//console.log("Message sent.");
				return 0;
			}
			else {
				//console.log("Bot id "+bot.id+" can send again in "+(30000-res)+"ms");
				timeremaining = Math.max(0,Math.min(timeremaining, res));
			}
		}
		return timeremaining;
	}
	
	self.send = function(cluster, message) {
		self.queue.push([cluster,message]);
		if(self.timeout) {
			clearTimeout(self.timeout);
			self.timeout = null;
		}
		self.handlequeue(cluster);
	}
	
	self.handlequeue = function(cluster) {
		var queue = self.queue[cluster]
		while(queue.length) {
			var res = self._send(cluster, queue[0]);
			if(res > 0) {
				setTimeout(self.handlequeue, res, cluster);
				break;
			}
		}
	}
	
	self.requestConnection = function(cluster) {
		
	}
	
	self.requestConnection("event");
	self.requestConnection("normal");
	self.requestConnection("group");
	
}

module.exports = user;