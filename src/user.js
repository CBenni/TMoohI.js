import _ from 'lodash';
import settings from './settings';
import TMIConnection from './tmiconnection';
import { invokeRateLimit } from './helpers';
import { getChannel } from './channel';

export default class User {
  constructor(name, oauth) {
    this.name = name;
    this.oauth = oauth;

    this.clients = [];
    this.connections = [];
    this.channelsByID = new Map(); // maps channel ID to a channel object
    this.channelsByName = new Map(); // maps channel ID to a channel object

    this.context = {
      user: this,
      client: this.clients,
      connection: this.connections
    };
  }

  registerClient(client) {
    if (!this.clients.includes(client)) this.clients.push(client);
  }

  unregisterClient(client) {
    _.pull(this.clients, client);
  }

  async joinChannel(client, channel) {
    // channelName is a string, either '#channelname' or '$channelid'
    channel = channel.toLowerCase();
    let connectionToUse = _.find(this.connections, connection => connection.channels.length < settings.limits.channelsPerConnection);
    if (!connectionToUse) {
      connectionToUse = await invokeRateLimit('connect', this.context, () => {
        const connection = new TMIConnection(this);
        this.connections.push(connection);
        return connection;
      });
    }
    // if we have a channel name, we can immediately join it on IRC and filter on firehose (if applicable) until a message is sent
    // in the channel, allowing us to fill in the ID
    if (channel[0] === '#') {
      const channelObj = getChannel(null, channel.slice(1));
      connectionToUse.joinChannel(channelObj);
    } else if (channel[0] === '$') {
      // otherwise, we check if firehose is present. If it isnt, we have to grab the channel name via the twitch API
      const channelObj = getChannel(null, channel.slice(1));
      if (settings.firehose.oauth) {
        // in this case, we can (probably) just wait for a message to be sent in the channel and grab the name from there
        // (this is done in the connection and channel managers and rename handlers)
      } else {
        // only case for us to run an HTTP request. This shouldnt happen in large joins, since thatll rate limit your ass.
        channelObj.name = await invokeRateLimit('twitchAPI', this.context, () => twitchAPI.get);
      }
    } else {

    }
  }
}
