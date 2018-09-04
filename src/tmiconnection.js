import net from 'net';
import settings from './settings';
import logger from './logger';

export default class TMIConnection {
  constructor(user) {
    this.channels = [];
    this.user = user;

    this.socket = net.createConnection(settings.tmi, () => {
      logger.debug('Connection created for user', user);
    });
  }

  joinChannel(channel) {

  }
}
