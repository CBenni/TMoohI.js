import _ from 'lodash';
import EventEmitter from 'events';
import EventSource from 'eventsource';

import settings from './settings';

class Firehose extends EventEmitter {
  constructor() {
    super();

    this.connection = null;
  }

  connect() {
    const url = `${settings.firehose.url}?oauth_token=${settings.firehose.oauth}`;
    console.log('Connecting to firehose', url);
    this.connection = new EventSource(url);

    this.connection.addEventListener('privmsg', event => {
      this.emit('event', JSON.parse(event.data));
      const eventData = JSON.parse(event.data);
      const tagData = {};
      _.each(eventData.tags.split(';'), tag => {
        const [key, val] = tag.split('=');
        tagData[key] = val;
      });
      eventData.rawTags = eventData.tags;
      eventData.tags = tagData;
      this.emit(`PRIVMSG-$${tagData['room-id']}`, eventData);
    });

    this.connection.addEventListener('error', error => {
      console.log('Received firehose error', error);
      this.emit('error', error);
    });

    this.connection.addEventListener('open', info => {
      console.log('Connected to firehose', info);
      this.emit('connect', info);
    });
  }
}

const firehose = new Firehose();
if (settings.firehose.oauth) firehose.connect();
export default firehose;
