var log = require("../log");
var strftime = require("strftime");
var _ = require("lodash");
function ConsoleLogger(filters, options) {
	var self = this;
	self.setFilters(filters || []);
	
	self.options = _.merge({
		levels: {0:"DEBUG", 10:"INFO", 20:"WARNING", 30:"ERROR", 40:"FATAL"},
		dateFormat: "%Y-%m-%d %H:%M:%S"
	}, options);
	
	self.stringify = function(data) {
		var level = data.level === undefined?"":"["+self.options.levels[_.max(_.filter(Object.keys(self.options.levels),function(x){return x<=data.level}))]+"] ";
		if(data._string === undefined) return strftime(self.options.dateFormat)+" "+level+(data.type?"["+data.type+"] ":"")+data.message;
		else return strftime(self.options.dateFormat)+level+data._string;
	}
	
	self._log = function(data) {
		console.log(self.stringify(data));
	}
}
ConsoleLogger.prototype = new log.Logger();

module.exports = ConsoleLogger;