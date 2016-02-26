var log = require("../log");
var fs = require('fs');
var strftime = require("strftime");
var _ = require("lodash");
function FileLogger(filters, options) {
	var self = this;
	self.setFilters(filters || []);
	
	self.options = _.merge({
		levels: {0:"DEBUG", 10:"INFO", 20:"WARNING", 30:"ERROR", 40:"FATAL"},
		dateFormat: "%Y-%m-%d %H:%M:%S",
		filename: require.main.filename.match(/(\w+)\.\w+$/)[1]+"_%Y_%m_%d.log"
	}, options);
	self.filestream = null;
	
	self.stringify = function(data) {
		var level = data.level === undefined?"":"["+self.options.levels[_.max(_.filter(Object.keys(self.options.levels),function(x){return x<=data.level}))]+"] ";
		if(data._string === undefined) return strftime(self.options.dateFormat)+" "+level+(data.type?"["+data.type+"] ":"")+data.message;
		else return strftime(self.options.dateFormat)+level+data._string;
	}
	
	self._log = function(data) {
		var newfilename = strftime(self.options.filename);
		if(self.filestream === null || newfilename != self.filestream.path) {
			if(self.filestream) self.filestream.end();
			self.filestream = fs.createWriteStream(newfilename, {flags:"a"}).on("error",function(err) {
				if(err) {
					// we must not call log.write from within _log, else we will end up with infinite loops.
					console.log(strftime(self.options.dateFormat)+"[FATAL] [io] could not log message: "+err.toString()); 
				}
			});
		}
		self.filestream.write(self.stringify(data)+"\r\n");
	}
}
FileLogger.prototype = new log.Logger();
module.exports = FileLogger;