import fs from 'fs';
import _ from 'lodash';
import parseArgs from 'minimist';

import defaultArgs from './settings.default.json';

const settings = defaultArgs;

const argv = parseArgs(process.argv.slice(2));
const configFile = argv.config || 'settings.json';
if (configFile) {
  try {
    _.merge(settings, JSON.parse(fs.readFileSync(configFile, 'utf-8')));
  } catch (err) {
    console.error(`Couldnt load config file ${configFile}:`, err);
  }
}

_.each(argv, (val, key) => {
  _.set(settings, key, val);
});

// console.log('Settings: ', settings);
export default settings;
