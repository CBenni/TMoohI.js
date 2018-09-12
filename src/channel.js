import { EventEmitter } from 'events';
import { declareAsyncProperty } from './helpers';

export default class Channel extends EventEmitter {
  constructor(id, name) {
    super();

    this.id = id;
    this.connection = null;
    this.referenceCount = 0;

    declareAsyncProperty(this, 'name', name);
  }
}
