import fs from 'fs';
import _ from 'lodash';
import parseArgs from 'minimist';

import defaultArgs from './settings.default.json';

const settings = defaultArgs;

const argv = parseArgs(process.argv.slice(2))
if(argv.config) {
	try {
		_.merge(settings, JSON.parse(fs.readFileSync(argv.config, 'utf-8')));
	} catch(err) {
		console.error("Couldnt load config file "+argv.config+":", err);
	}
}

_.each(argv, (val, key) => {
	_.set(settings, key, val);
})

console.log("Settings: ", settings);
export default settings;