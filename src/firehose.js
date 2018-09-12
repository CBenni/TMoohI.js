import _ from 'lodash';
import EventEmitter from 'events';
import EventSource from 'eventsource';

import settings from './settings';

class Firehose extends EventEmitter {
  constructor() {
    super();

    this.connection = null;
    this.connected = false;
    // TODO: reconnect? idk how thatll work.
  }

  connect() {
    const url = `${settings.firehose.url}?oauth_token=${settings.firehose.oauth}`;
    console.log('Connecting to firehose', url);
    this.connection = new EventSource(url);

    this.connection.addEventListener('privmsg', event => {
      // normalize the event data into the IRC format
      const eventData = JSON.parse(event.data);
      this.emit('event', eventData);
      const tagData = {};
      _.each(eventData.tags.split(';'), tag => {
        const [key, val] = tag.split('=');
        tagData[key] = val;
      });
      tagData.firehose = '1';
      const ircData = {
        tags: tagData,
        prefix: `${eventData.nick}!${eventData.nick}@${eventData.nick}.tmi.twitch.tv`,
        command: eventData.command.toUpperCase() || 'PRIVMSG',
        params: [eventData.room],
        trailing: eventData.body,
        source: 'firehose'
      };
      ircData.raw = `@${eventData.tags} :${ircData.prefix} ${ircData.command} ${eventData.room} :${ircData.trailing}`;

      this.emit('message', ircData);
    });

    this.connection.addEventListener('error', error => {
      console.log('Received firehose error', error);
      this.emit('error', error);
    });

    this.connection.addEventListener('open', info => {
      console.log('Connected to firehose', info);
      this.connected = true;
      this.emit('connect', info);
    });
  }
}

const firehose = new Firehose();
if (settings.firehose.oauth) firehose.connect();
export default firehose;
