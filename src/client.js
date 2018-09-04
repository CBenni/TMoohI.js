import _ from 'lodash';

import { createStream } from './irc-message';
import ircNumerics from './irc-numerics';
import logger from './logger';
import { setToString } from './helpers';
import userManager from './usermanager';
import { getUptime } from './statsmanager';

const capabilities = [
  'twitch.tv/tags',
  'twitch.tv/commands',
  'tmoohi/knownBot',
  'tmoohi/verifiedBot'
];

export default class Client {
  constructor(socket) {
    this.socket = socket;

    this.name = null;
    this.pass = null;
    this.user = null;
    this.capabilities = new Set();
    this.channels = [];

    socket.pipe(createStream())
    .on('data', message => {
      logger.debug('Received client message: ', message);
      this.handleClientMessage(message);
    })
    .on('close', () => {
      logger.debug('Client connection closed', this);
      this.handleDisconnect();
    });
  }

  /*
  >> :tmi.twitch.tv 001 cbenni :Welcome, GLHF!
  >> :tmi.twitch.tv 002 cbenni :Your host is tmi.twitch.tv
  >> :tmi.twitch.tv 003 cbenni :This server is rather new
  >> :tmi.twitch.tv 004 cbenni :-
  >> :tmi.twitch.tv 375 cbenni :-
  >> :tmi.twitch.tv 372 cbenni :You are in a maze of twisty passages, all alike.
  >> :tmi.twitch.tv 376 cbenni :>
  */
  logIn() {
    if (this.name && this.pass) {
      this.user = userManager.getUser(this.name, this.pass);
      this.user.registerClient(this);
      this.sendNumeric('RPL_WELCOME', this.name, 'Welcome, GLHF!');
      this.sendNumeric('RPL_YOURHOST', this.name, 'Your host is tmi.twitch.tv!');
      this.sendNumeric('RPL_CREATED', this.name, `TMoohI has been running for ${getUptime()}`);
      this.sendNumeric('RPL_MYINFO', this.name, '-');
      this.sendNumeric('RPL_MOTDSTART', this.name, '-');
      this.sendNumeric('RPL_MOTD', this.name, 'You are in a maze of dank memes, all alike.');
      this.sendNumeric('RPL_ENDOFMOTD', this.name, '>');
    }
  }

  send(msg) {
    logger.debug(`--> ${msg}`);
    this.socket.write(`${msg}\n`);
  }

  sendNumeric(name, params, reason) {
    this.send(`:tmi.twitch.tv ${ircNumerics[name]} ${params || ''}${reason ? (` :${reason}`) : ''}`);
  }

  handleDisconnect() {
    if (this.user) {
      this.user.unregisterClient(this);
    }
  }

  handleClientMessage(msg) {
    if (msg.command === 'PING') this.handleClientPING(msg);
    else if (msg.command === 'CAP') this.handleClientCAP(msg);
    else if (msg.command === 'NICK') this.handleClientNICK(msg);
    else if (msg.command === 'PASS') this.handleClientPASS(msg);
    else if (msg.command === 'JOIN') this.handleClientJOIN(msg);
  }

  handleClientPING(msg) {
    const param = msg.params.join(' ');
    this.send(`:tmi.twitch.tv PONG tmi.twitch.tv${param ? ` ${param}` : ''}`);
  }

  handleClientNICK(msg) {
    if (this.name) {
      this.sendNumeric('ERR_RESTRICTED', '', 'This server does not support nick name changes.');
    } else {
      this.name = msg.params[0];
      this.logIn();
    }
  }

  handleClientPASS(msg) {
    if (this.name) {
      this.sendNumeric('ERR_ALREADYREGISTRED', '', 'Already registered.');
    } else {
      this.pass = msg.params[0];
      this.logIn();
    }
  }

  handleClientJOIN(msg) {
    if (this.user) {
      _.each(msg.params[0].split(','), channelName => {
        this.user.joinChannel(this, channelName).then(() => {

        });
      });
    } else {
      this.sendNumeric('ERR_NOLOGIN', '', 'Not logged in yet.');
    }
  }

  handleClientCAP(msg) {
    const subcommand = msg.params[0];
    if (subcommand === 'LS') {
      this.send(`:tmi.twitch.tv CAP * LS :${capabilities.join(' ')}`);
    } else if (subcommand === 'LIST') {
      console.log(this.capabilities);
      console.log(Array.from(this.capabilities));
      this.send(`:tmi.twitch.tv CAP * LIST :${setToString(this.capabilities, ' ')}`);
    } else if (subcommand === 'REQ') {
      let ok = true;
      const requestedCaps = msg.trailing.split(' ').map(cap => {
        const remove = cap[0] === '-';
        const capName = remove ? cap.slice(1) : cap;
        if (!capabilities.includes(capName)) ok = false;
        return {
          name: capName,
          remove
        };
      });
      if (ok) {
        _.each(requestedCaps, cap => {
          if (cap.remove) {
            this.capabilities.delete(cap.name);
          } else {
            this.capabilities.add(cap.name);
          }
        });
        this.send(`:tmi.twitch.tv CAP * ACK :${msg.trailing}`);
      } else {
        this.send(`:tmi.twitch.tv CAP * NAK :${msg.trailing}`);
      }
    }
  }
}
