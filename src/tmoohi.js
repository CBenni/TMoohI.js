import logger from './logger';

import packageConfig from '../package.json';
import './server';

logger.info(`Starting tmoohi.js v${packageConfig.version}!`);
