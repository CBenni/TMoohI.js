import logger from './logger';

import packageConfig from '../package.json';
logger.info("Starting tmoohi.js v"+packageConfig.version+" (Build "+GIT_COMMIT.slice(-7)+")!");
import './server';