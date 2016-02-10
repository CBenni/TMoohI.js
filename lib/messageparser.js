var rx = /^(?:@([^ ]+) )?(?:[:](\S+) )?(\S+)(?: (?!:)(.+?))?(?: [:](.+))?$/;
var rx2 = /([^=;]+)(?:=([^;]*))?/g;

/**
* Parses an IRC message. These must not be line-delimited, split your messages prior to parsing.
* @param message The raw IRC message
* @return {[string,object,string,string,string,string]} an array of length 6, [raw, tags, prefix, command, param, trailing], where 
*	raw is the raw message, 
*	tags is the IRCv3 tags
*	prefix is the prefix according to RFC spec
*	command is the IRC command
*	param the parameters of the IRC command
*	trailing the trailing data
*	Parts that are not present are undefined.
**/
function parseIRCMessage(message) {
	
	var data = rx.exec(message);
	var tagdata = data[1]; // 1 = TAGS
	if (tagdata) {
		var tags = {};
		do {
			m = rx2.exec(tagdata);
			if (m) {
				tags[m[1]] = m[2];
			}
		} while (m);
		data[1] = tags;
	}
	return data;
}

parseIRCMessage.TAGS = 1;
parseIRCMessage.PREFIX = 2;
parseIRCMessage.COMMAND = 3;
parseIRCMessage.PARAM = 4;
parseIRCMessage.TRAILING = 5;

module.exports = parseIRCMessage;