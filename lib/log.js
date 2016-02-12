"use strict";

class Log {
	constructor() {
		this.loggers = [];
	}

	log(data) {
		for(var i=0;i<this.loggers.length;++i) {
			var logger = this.loggers[i];
			logger._log(data);
		}
	}
}

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
	lt: _.lt,
	le: _.lte,
	gt: _.gt,
	ge: _.gte,
	contains: _.includes,
	startswith: _.startsWith,
	endswith: _.endsWith,
	containedby: _.flip(_.includes),
	startedwith: _.flip(_.startsWith),
	endedwith: _.flip(_.endsWith),
	nil: (a,b) => _.isNil(a) == b
}
const lowerCase = x=>x.toLowerCase();
class Logger {
	constructor(filter) {
		if (new.target === Logger) {
		  throw new TypeError("Cannot construct Logger instances directly");
		}
		this.setFilters(filter || []);
	}

	setFilters(filters) {
		this.filter = _.map(function(filter){
			var res = {};
			_.forEach(filter, function(value, key) {
				var [property,modifier] = key.split("__")
				if(modifier !== undefined) {
					if(modifiers[modifier] !== undefined) {
						res[property] = modifiers[modifier];
					} else if(modifier[0] == "i") { // case invariant variants
						modifier = modifier.slice(1);
						if(modifiers[modifier] !== undefined) {
							res[property] = _.overArgs(modifiers[modifier],lowerCase,lowerCase);
						}
					}
				}
			});
			return _.conforms(res);
		});
	}

	_log(data) {
		if(_.find(this.filter, x=>x(data))) {
			this.log(data);
		}
	}

	log(data) {}
}

class ConsoleLogger extends Logger {
	constructor(filter) {
		super(filter);
	}

	log(data) {
		console.log(data);
	}
}


var cl = new ConsoleLogger({level__ge: 10});

cl._log({level:15,message:"this should get through"});
cl._log({level:5,message:"this shouldnt"});
cl._log({level:10,message:"this should get through as well"});
cl._log({message:"this should probably not get through"});
