import _ from 'lodash';
import { EventEmitter } from 'events';
import settings from './settings';
import TMIConnection from './tmiconnection';
import { invokeRateLimit } from './helpers';
import { getTwitchUser } from './twitchapi';
import logger from './logger';

export default class User extends EventEmitter {
  constructor(name, oauth) {
    super();

    this.name = name;
    this.oauth = oauth;

    this.clients = [];
    this.connections = [];

    this.context = {
      user: this,
      client: this.clients,
      connection: this.connections
    };

    this.createConnection();
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

  async joinChannel(client, channel) {
    // channelName is a string, either '#channelname' or '$channelid'
    channel = channel.toLowerCase();
    // if we have a channel name, we can immediately join it on IRC and filter on firehose (if applicable) until a message is sent
    // in the channel, allowing us to fill in the ID
    let channelName;
    if (channel[0] === '#') {
      channelName = channel;
    } else if (channel[0] === '&') {
      const channelID = channel.slice(1);
      // otherwise, we check if firehose is present. If it isnt, we have to grab the channel name via the twitch API
      if (settings.firehose.oauth) {
        // in this case, we can (probably) just wait for a message to be sent in the channel and grab the name from there
        // (this is done in the connection and channel managers and rename handlers)
      } else {
        // only case for us to run an HTTP request. This shouldnt happen in large joins, since thatll rate limit your ass.
        channelName = await invokeRateLimit('twitchAPI', this.context, async () => {
          const user = await getTwitchUser(channelID);
          return `#${user.name}`;
        });
      }
    } else if (channel === '*') {
      // nothing to do in this case, just set up a filter
    } else {
      throw new Error(`Invalid channel name ${channel}`);
    }
    this.checkConnectionFillStatus();
    if (channelName) {
      this.joinIRCChannel(channelName);
    }
  }

  checkConnectionFillStatus() {
    const totalChannels = _.reduce(this.connections, (res, connection) => {
      res += connection.channels.length;
      return res;
    }, 0);
    console.log('Total channel count:', totalChannels);
    if (totalChannels >= settings.limits.maxConnectionLoad * settings.limits.channelsPerConnection * this.connections.length) {
      this.createConnection();
      this.checkConnectionFillStatus();
    }
  }

  async joinIRCChannel(channelName) {
    this.checkConnectionFillStatus();
    // find a connection to use for this channel
    await invokeRateLimit('join', {
      user: this,
      client: this.clients,
      connection: _.filter(this.connections, conn => conn.channels.length < settings.limits.channelsPerConnection)
    }, ratelimit => {
      // TODO: check if we left the channel again in the meantime
      const ratelimitParent = ratelimit.parent;
      let connectionToUse;
      if (ratelimitParent instanceof TMIConnection) {
        connectionToUse = ratelimitParent;
        // console.log('The ratelimit told us to use this connection: ', ratelimit.parent);
      } else {
        connectionToUse = _.minBy(
          _.filter(this.connections, conn => conn.channels.length < settings.limits.channelsPerConnection),
          conn => (conn.connected ? 0 : 100) + conn.channels.length
        );
      }

      if (connectionToUse) {
        connectionToUse.joinChannel(channelName);
      } else {
        // somehow we ran out of connections to use... yikerz.
        this.joinIRCChannel(channelName);
        logger.error('No connections with remaining capacity found.');
      }
    });
  }
}
