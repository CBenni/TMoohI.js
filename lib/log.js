"use strict";
const _ = require("lodash");

/**
* Logger base class, receives messages to log and writes them to its assigned output.
* Each logger holds a list of filters, which determine the messages the logger outputs.
* Just a single filter has to be met, but all properties have to match.(Aka the filters are specified in disjunctive normal form)
* Matching means that each of the filters properties match the message's properties. The property names must not contain double underscores
* since those are reserved for (optional) modifiers:
* * __lt value lower than the filter property
* * __le value lower than or equal to the filter property
* * __gt value greater than the filter property
* * __ge value greater than or equal to the filter property
* * __contains value contains the filter property
* * __startswith value starts with the filter property
* * __endswith value ends with the filter property
* * __containedby filter property contains the value
* * __startedwith filter property starts with the value
* * __endedwith filter property ends with the value
* * __icontains value contains the filter property (case invariant)
* * __istartswith value starts with the filter property (case invariant)
* * __iendswith value ends with the filter property (case invariant)
* * __icontainedby filter property contains the value (case invariant)
* * __istartedwith filter property starts with the value (case invariant)
* * __iendedwith filter property ends with the value (case invariant)
* * __nil value is null or undefined iff filter property is true
*
* For example, the filter `{"level__ge": 10}` matches any message with a filter greater or equal to 10.
**/
const modifiers = {
	"lt": _.lt,
	"le": _.lte,
	"gt": _.gt,
	"ge": _.gte,
	"contains": _.includes,
	"startswith": _.startsWith,
	"endswith": _.endsWith,
	"containedby": _.flip(_.includes),
	"startedwith": _.flip(_.startsWith),
	"endedwith": _.flip(_.endsWith),
	"nil": (a,b) => _.isNil(a) == b
}
const lowerCase = x=>x.toLowerCase();

function Logger(filter) {
	var self = this;
	
	self.setFilters = function(filters) {
		self.filters = _.map(filters, function(filter){
			var res = {};
			_.forEach(filter, function(value, key) {
				var split = key.split("__");
				var property = split[0];
				var modifier = split[1];
				if(modifier !== undefined) {
					if(modifiers[modifier] !== undefined) {
						res[property] = _.partialRight(modifiers[modifier], value);
					} else if(modifier[0] == "i") { // case invariant variants
						modifier = modifier.slice(1);
						if(modifiers[modifier] !== undefined) {
							res[property] = _.partialRight(_.overArgs(modifiers[modifier],lowerCase,lowerCase), value);
						}
					}
				} else {
					res[property] = x => x == value;
				}
			});
			return _.conforms(res);
		});
	}
	
	self._log = function(data) {
	}
	
	self.log = function(data) {
		if(_.find(this.filters, x=>x(data))) {
			this._log(data);
		}
	}
	
	
	self.setFilters(filter || []);
}

var loggers = [];
function writeObject(data) {
	for(var i=0;i<loggers.length;++i) {
		var logger = loggers[i];
		logger.log(data);
	}
}

var defaultLevels = {
	DEBUG: 0,
	INFO: 10,
	WARNING: 20,
	ERROR: 30,
	FATAL: 40
}

function writeMessage(level, type, message) {
	writeObject({
		level: (typeof(level)=="string")?defaultLevels[level.toUpperCase()]:level,
		type: type,
		message: message
	});
}

function writeIRC(user, parsedmessage) {
	writeObject({
		type: "IRC",
		user: user,
		message: parsedmessage[0],
		command: parsedmessage[2],
		data: parsedmessage
	})
}

function addLogger(l){loggers.push(l);}
function removeLogger(l){_.pull(loggers,l);}
	
module.exports = {
	writeObject: writeObject,
	write: writeMessage,
	writeIRC: writeIRC,
	addLogger: addLogger,
	removeLogger: removeLogger,
	Logger: Logger,
}