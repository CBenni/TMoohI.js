import _ from 'lodash';

import { createStream } from './irc-message';
import ircNumerics from './irc-numerics';
import logger from './logger';
import { setToString } from './helpers';
import userManager from './usermanager';
import firehose from './firehose';
import { getUptime } from './statsmanager';
import settings from './settings';

const capabilities = [
  'twitch.tv/tags',
  'twitch.tv/commands',
  'tmoohi/knownBot',
  'tmoohi/verifiedBot'
];

const COMMANDS_PREFER_FIREHOSE = new Set([
  'PRIVMSG',
  'USERNOTICE'
]);

const COMMANDS_TMI = new Set([
  'WHISPER',
  'HOSTTARGET',
  'NOTICE',
  'USERSTATE',
  'ROOMSTATE'
]);

export default class Client {
  constructor(socket) {
    this.socket = socket;

    this.name = null;
    this.pass = null;
    this.user = null;
    this.capabilities = new Set();
    this.channelsByID = new Set();
    this.channelsByName = new Set();
    this.joinedFirehose = false;

    socket.pipe(createStream())
    .on('data', message => {
      logger.debug('<-- ', message);
      this.handleClientMessage(message);
    })
    .on('close', () => {
      logger.debug('Client connection closed', this);
      this.handleDisconnect();
    })
    .on('error', () => {
      logger.error('Client errored out', this);
      this.handleDisconnect();
    });

    this.messageCallback = message => this.handleTMIMessage(message);
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
      this.user.on('message', this.messageCallback);
      firehose.on('message', this.messageCallback);

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
    const functionName = `handleClient${msg.command}`;
    if (this[functionName]) this[functionName](msg);
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
    this.pass = msg.params[0];
    if (this.user) this.user.oauth = this.pass;
    else this.logIn();
  }

  handleClientJOIN(msg) {
    if (this.user) {
      _.each(msg.params[0].split(','), async channelName => {
        channelName = channelName.toLowerCase();
        if (this.channelsByID.has(channelName) || this.channelsByName.has(channelName) || !channelName) return;
        await this.user.joinChannel(this, channelName);
        this.send(`:${this.name}!${this.name}@${this.name}.tmi.twitch.tv JOIN ${channelName}`);
        if (channelName[0] === '#') this.channelsByName.add(channelName);
        else if (channelName[0] === '&') this.channelsByID.add(channelName.slice(1));
        else if (channelName === '!firehose') this.joinedFirehose = true;
      });
    } else {
      this.sendNumeric('ERR_NOLOGIN', '', 'Not logged in yet.');
    }
  }

  handleClientPART(msg) {
    if (this.user) {
      _.each(msg.params[0].split(','), async channelName => {
        channelName = channelName.toLowerCase();
        if (!this.channelsByID.has(channelName) && !this.channelsByName.has(channelName)) return;
        await this.user.partChannel(this, channelName);
        this.send(`:${this.name}!${this.name}@${this.name}.tmi.twitch.tv PART ${channelName}`);
        if (channelName[0] === '#') this.channelsByName.remove(channelName);
        else if (channelName[0] === '&') this.channelsByID.remove(channelName.slice(1));
      });
    } else {
      this.sendNumeric('ERR_NOLOGIN', '', 'Not logged in yet.');
    }
  }

  handleClientPRIVMSG(msg) {
    if (this.user) {
      this.user.sendMessage(msg.params[0], msg.trailing);
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

  handleTMIMessage(msg) {
    if (!COMMANDS_PREFER_FIREHOSE.has(msg.command) && !COMMANDS_TMI.has(msg.command)) return;
    else if (COMMANDS_PREFER_FIREHOSE.has(msg.command) && settings.firehose.oauth && msg.source !== 'firehose') return;

    // check if the channel is joined either by name or by ID
    const channelsToEmit = [];
    if (this.channelsByName.has(msg.params[0])) channelsToEmit.push(msg.params[0]);
    if (this.channelsByID.has(msg.tags['room-id'])) channelsToEmit.push(`&${msg.tags['room-id']}`);
    if (this.joinedFirehose) channelsToEmit.push('!firehose');
    msg.tags['channel-name'] = msg.params[0].slice(1);

    if (channelsToEmit.length > 0) {
      const rawTags = _.map(msg.tags, (val, key) => `${key}=${val}`).join(';');
      _.each(channelsToEmit, channel => {
        if (rawTags && this.capabilities.has('twitch.tv/tags')) {
          if (msg.trailing) this.send(`@${rawTags} :${msg.prefix} ${msg.command} ${channel} :${msg.trailing}`);
          else this.send(`@${rawTags} :${msg.prefix} ${msg.command} ${channel}`);
        } else if (msg.trailing) this.send(`:${msg.prefix} ${msg.command} ${channel} :${msg.trailing}`);
        else this.send(`:${msg.prefix} ${msg.command} ${channel}`);
      });
    }
  }
}
