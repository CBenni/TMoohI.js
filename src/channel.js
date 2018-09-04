import { EventEmitter } from 'events';

const channelCacheByName = new Map();
const channelCacheByID = new Map();


export default class Channel extends EventEmitter {
  constructor(id, name) {
    super();

    this._id = id;
    this._name = name;
  }

  get name() {
    return this._name;
  }

  set name(name) {
    const oldName = this._name;
    this._name = name;
    this.emit('namechange', {
      id: this._id,
      oldName,
      newName: name
    });
  }

  get id() {
    return this._id;
  }

  isComplete() {
    return this.id && this.name;
  }
}

export function getChannel(channelID, channelName, noUpdate) {
  if (!channelID && !channelName) throw new Error('No channel name or ID given');
  // case 1: channelID given, channel cached by ID
  if (channelID) {
    const channel = channelCacheByID.get(channelID);
    if (channel) {
      if (!noUpdate && channelName && channel.name !== channelName) {
        channelCacheByName.delete(channel.name);
        channel.name = channelName;
        channelCacheByName.set(channelName, channel);
      }
      return channel;
    }
  }
  // case 2: channelName given, channel cached by name
  if (channelName) {
    const channel = channelCacheByName.get(channelName);
    if (channel) {
      if (!noUpdate && channelID && channel.id !== channelID) {
        channelCacheByID.delete(channel.id);
        channel.id = channelID;
        channelCacheByID.set(channelID, channel);
      }
      return channel;
    }
  }
  // case 3: channelName or channelID given, channel not cached by either
  const channel = new Channel(channelID, channelName);
  if (channelID) channelCacheByID.set(channelID, channel);
  if (channelName) channelCacheByName.set(channelName, channel);
  return channel;
}
