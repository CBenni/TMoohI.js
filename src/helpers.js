import _ from 'lodash';

import settings from './settings';
import { rateLimitManager } from './ratelimit';
import logger from './logger';

export function setToString(set, seperator = ', ') {
  return Array.from(set).join(seperator);
}

export function noop() {}

export function formatTimespan(timespan) {
  let age = Math.round(parseInt(timespan, 10));
  const periods = [
    { abbr: 'y', len: 3600 * 24 * 365 },
    { abbr: 'm', len: 3600 * 24 * 30 },
    { abbr: 'd', len: 3600 * 24 },
    { abbr: ' hrs', len: 3600 },
    { abbr: ' min', len: 60 },
    { abbr: ' sec', len: 1 }
  ];
  let res = '';
  let count = 0;
  for (let i = 0; i < periods.length; ++i) {
    if (age >= periods[i].len) {
      const pval = Math.floor(age / periods[i].len);
      age %= periods[i].len;
      res += (res ? ' ' : '') + pval + periods[i].abbr;
      count++;
      if (count >= 2) break;
    }
  }
  return res;
}

export function invokeRateLimit(limitID, context, callback) {
  if (!settings.limits[limitID]) logger.warn(`Cannot find config for limit '${limitID}'`);
  const options = _.extend({}, settings.limits[limitID]);
  options.parent = context[options.parent];
  if (options.parent && !options.parent) logger.error(`Cannot find parent for limit '${limitID}'`);
  return rateLimitManager.invoke(limitID, options, callback);
}
