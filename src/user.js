import _ from 'lodash';
import { EventEmitter } from 'events';
import settings from './settings';
import TMIConnection from './tmiconnection';
import { invokeRateLimit } from './helpers';
import { twitchGetUser } from './twitchapi';
import logger from './logger';
import firehose from './firehose';
import Channel from './channel';

export default class User extends EventEmitter {
  constructor(name, oauth) {
    super();

    this.name = name;
    this.oauth = oauth;

    this.clients = [];
    this.connections = [];
    this.channelsByName = new Map(); // <String, Channel> - maps a channel name to a channel object
    this.channelsByID = new Map(); // <String, Channel> - maps a channel id to a channel object

    this.context = {
      user: this,
      client: this.clients,
      connection: this.connections
    };

    setInterval(() => {
      this.checkConnectionFillStatus();
    }, 1000);

    this.createConnection();
    firehose.on('message', message => {
      this.handleRenames(message);
    });
  }

  registerClient(client) {
    if (!this.clients.includes(client)) this.clients.push(client);
  }

  unregisterClient(client) {
    _.pull(this.clients, client);
  }

  createConnection() {
    const connection = new TMIConnection(this);
    this.connections.push(connection);
    return invokeRateLimit('connect', this.context, () => {
      connection.connect();
      connection.on('message', message => {
        // console.log('TMIConnection received message: ', message);
        this.emit('message', message);
      });
      return connection;
    });
  }

  getChannelObj(channel) {
    if (channel[0] === '#') {
      const slicedName = channel.slice(1);
      const channelObj = this.channelsByName.get(slicedName);
      if (channelObj) return channelObj;
    } else if (channel[0] === '&') {
      const channelID = channel.slice(1);
      const channelObj = this.channelsByID.get(channelID);
      if (channelObj) return channelObj;
    }
    return null;
  }

  retrieveChannelName(channelID) {
    return invokeRateLimit('twitchAPI', this.context, async () => {
      console.log('Getting channel name for', channelID);
      try {
        const user = await twitchGetUser(channelID, this.oauth.replace('oauth:', ''));
        console.log('Got user', user);
        return user.name;
      } catch (err) {
        logger.error(err);
        console.error(err.response.body);
      }
      return null;
    });
  }

  async joinChannel(client, channel) {
    // channel is a string, either '#channelname' or '&channelid'
    if (!channel) return;
    // if we have a channel name, we can immediately join it on IRC and filter on firehose (if applicable) until a message is sent
    // in the channel, allowing us to fill in the ID
    let channelObj;
    if (channel[0] === '#') {
      const slicedName = channel.slice(1);
      channelObj = this.channelsByName.get(slicedName);
      if (!channelObj) {
        channelObj = new Channel(null, slicedName);
        this.channelsByName.set(slicedName, channelObj);
      }
      channelObj.referenceCount += 1;
    } else if (channel[0] === '&') {
      const channelID = channel.slice(1);

      channelObj = this.channelsByID.get(channelID);
      if (!channelObj) {
        channelObj = new Channel(channelID, null);
        this.channelsByID.set(channelID, channelObj);
      }
      channelObj.referenceCount += 1;

      // we check if firehose is present. If it isnt, we have to grab the channel name via the twitch API
      if (settings.firehose.oauth) {
        // in this case, we can (probably) just wait for a message to be sent in the channel and grab the name from there
        // (this is done in the connection and channel managers and rename handlers)
      } else {
        // only case for us to run an HTTP request. This shouldnt happen in large joins, since thatll rate limit your ass.

      }
    } else if (channel === '!firehose') {
      // nothing to do in this case, just set up a filter
    } else {
      throw new Error(`Invalid channel name ${channel}`);
    }
    this.checkConnectionFillStatus();
    channelObj.name.then(() => {
      if (channelObj && channelObj.referenceCount > 0 && !channelObj.connection) {
        this.joinIRCChannel(channelObj);
      }
    });
  }

  partChannel(client, channel) {
    let channelObj;
    if (channel[0] === '#') {
      const slicedName = channel.slice(1);
      channelObj = this.channelsByName.get(slicedName);
      if (!channelObj) return;
      channelObj.referenceCount -= 1;
    } else if (channel[0] === '&') {
      const channelID = channel.slice(1);

      channelObj = this.channelsByID.get(channelID);
      if (!channelObj) return;
      channelObj.referenceCount -= 1;
    } else if (channel === '!firehose') {
      // nothing to do in this case, just set up a filter
    } else {
      throw new Error(`Invalid channel name ${channel}`);
    }
    this.checkConnectionFillStatus();
    if (channelObj && channelObj.referenceCount === 0 && !channelObj.connection) {
      this.partIRCChannel(channelObj);
      channelObj.connection = null;
    }
  }

  handleRenames(msg) {
    const channelName = msg.params[0].slice(1);
    const channelID = msg.tags['room-id'];
    const channelObjByID = this.channelsByID.get(channelID);
    const channelObjByName = this.channelsByName.get(channelName);

    if (!channelName || !channelID) return;

    if (channelObjByID) {
      if (channelObjByName) {
        if (channelObjByID !== channelObjByName) {
          // merge the two objects
          channelObjByID.referenceCount += channelObjByName.referenceCount;
          channelObjByID.connection = channelObjByName.connection;
          channelObjByID.name = channelName;
          this.channelsByName.set(channelName, channelObjByID);
        }
      } else {
        /* if (channelObjByID.name) {
          // channel got renamed, leave old channel and join new one
          logger.info(`Channel ${channelObjByID.name} got renamed to ${channelName}`);
          channelObjByID.connection.partChannel(channelObjByID.name);
          channelObjByID.connection.joinChannel(channelName);
        } */
        channelObjByID.name = channelName;
        // this.channelsByName.set(channelName, channelObjByID);
        // this.joinIRCChannel(channelObjByID);
      }
    } else if (channelObjByName) {
      channelObjByName.id = channelID;
      this.channelsByName.set(channelName, channelObjByID);
    }
  }

  checkConnectionFillStatus() {
    const totalChannels = _.reduce(this.connections, (res, connection) => {
      res += connection.channels.length;
      return res;
    }, 0);
    if (totalChannels >= settings.limits.maxConnectionLoad * settings.limits.channelsPerConnection * this.connections.length) {
      this.createConnection();
      this.checkConnectionFillStatus();
    }
  }

  async joinIRCChannel(channelObj) {
    this.checkConnectionFillStatus();
    // find a connection to use for this channel
    return invokeRateLimit('join', {
      user: this,
      client: this.clients,
      connection: _.filter(this.connections, conn => conn.channels.length < settings.limits.channelsPerConnection)
    }, async ratelimit => {
      // TODO: check if we left the channel again in the meantime
      const ratelimitParent = ratelimit.parent;
      let connectionToUse;
      if (ratelimitParent instanceof TMIConnection) {
        connectionToUse = ratelimitParent;
      } else {
        connectionToUse = _.minBy(
          _.filter(this.connections, conn => conn.channels.length < settings.limits.channelsPerConnection),
          conn => (conn.connected ? 0 : 100) + conn.channels.length
        );
      }

      if (connectionToUse) {
        channelObj.connection = connectionToUse;
        connectionToUse.joinChannel(`#${await channelObj.name}`);
      } else {
        // somehow we ran out of connections to use... yikerz.
        this.joinIRCChannel(channelObj);
        logger.error('No connections with remaining capacity found.');
      }
    });
  }

  async sendMessage(channel, text) {
    let ircName = null;
    if (channel[0] === '#') {
      ircName = channel;
    } else {
      const channelObj = this.getChannelObj(channel);
      if (channelObj && channelObj._name) {
        ircName = `#${channelObj._name}`;
      } else {
        const channelName = await this.retrieveChannelName(channelObj.id);
        console.log('Got channel name: ', channelName);
        if (channelName) {
          if (channelObj) channelObj.name = channelName;
          ircName = `#${channelName}`;
        }
      }
    }

    if (!ircName) throw new Error(`Channel ${channel} not found.`);

    return invokeRateLimit('message', {
      user: this,
      client: this.clients,
      connection: this.connections
    }, ratelimit => {
      const ratelimitParent = ratelimit.parent;
      let connectionToUse;
      if (ratelimitParent instanceof TMIConnection) {
        connectionToUse = ratelimitParent;
      } else {
        connectionToUse = _.sample(this.connections);
      }
      connectionToUse.send(`PRIVMSG ${ircName} :${text}`);
    });
  }
}
