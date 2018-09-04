import usermanager from './usermanager';
import { formatTimespan } from './helpers';

const startTime = Date.now();

export function getUptime() {
  return formatTimespan((Date.now() - startTime) / 1000);
}

export function getConnectionStats() {
  return {
    users: usermanager.users.size
  };
}
