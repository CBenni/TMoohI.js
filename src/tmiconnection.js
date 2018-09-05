import _ from 'lodash';
import net from 'net';
import { EventEmitter } from 'events';
import settings from './settings';
import logger from './logger';
import { createStream } from './irc-message';

export default class TMIConnection extends EventEmitter {
  constructor(user) {
    super();

    this.channels = [];
    this.user = user;
    this.connected = false;
    this.socket = null;
    this.sendQueue = [];
    this.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    this.send(`PASS ${user.oauth}`);
    this.send(`NICK ${user.name}`);
  }

  connect() {
    this.socket = net.createConnection(settings.tmi, () => {
      logger.debug('Connection created for user', this.user.name);
      this.connected = true;
      _.each(this.sendQueue, item => this.send(item));
      this.emit('connect');
    });
    this.socket.pipe(createStream())
    .on('data', message => {
      message.source = 'tmi';
      logger.debug('<==', message);
      if (message.command === 'PING') this.send('PONG');
      else {
        this.emit('message', message);
      }
    })
    .on('close', reason => {
      this.emit('disconnect', reason);
    });
  }

  send(msg) {
    if (this.connected) {
      logger.debug(`==> ${msg}`);
      this.socket.write(`${msg}\n`);
    } else {
      this.sendQueue.push(msg);
    }
  }

  joinChannel(channelName) {
    this.send(`JOIN ${channelName}`);
    this.channels.push(channelName);
  }
}
