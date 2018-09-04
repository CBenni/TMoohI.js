import _ from 'lodash';
import perfNow from 'performance-now';

export class RateLimitHolder {
  constructor() {
    this._limits = {};
  }
}

export class RateLimit {
  constructor(options) {
    this.options = options;
    this.events = [];
    this.queue = [];
    this.timeout = null;
  }

  // purges the events list to make room for new events
  purge() {
    const now = perfNow();
    let i = 0;
    while (i < this.events.length && now - this.events[i] > this.options.interval) {
      i += 1;
    }
    this.events.splice(0, i);
  }

  invoke(callback) {
    this.purge();
    if (this.timeout || this.events.length >= this.options.limit) {
      return new Promise((resolve, reject) => {
        this.queue.push({ callback, resolve, reject });
        this.triggerQueue();
      });
    }
    return Promise.resolve(this.run({ callback, resolve: null, reject: null }));
  }

  triggerQueue() {
    if (!this.timeout) {
      const now = perfNow();
      this.timeout = setTimeout(() => {
        this.handleQueue();
      }, now - this.events[0] + this.options.interval);
    }
  }

  handleQueue() {
    this.purge();
    while ((this.events.length < this.options.limit) && this.queue.length > 0) {
      const queueItem = this.queue.shift();
      this.run(queueItem);
    }
    this.timeout = null;
    if (this.queue.length > 0) this.triggerQueue();
  }

  run(queueItem) {
    try {
      const result = queueItem.callback();
      if (result !== false) {
        this.addEvent();
      }
      if (result && _.isFunction(result.then) && _.isFunction(result.catch)) {
        if (queueItem.resolve) {
          result.then(queueItem.resolve);
        }
        if (queueItem.reject) {
          result.catch(queueItem.reject);
        }
      } else if (queueItem.resolve) queueItem.resolve(result);
    } catch (err) {
      if (queueItem.reject) queueItem.reject(err);
      else throw err;
    }
  }

  addEvent() {
    this.events.push(perfNow());
  }
}

class RateLimitManager extends RateLimitHolder {
  invoke(limitID, options, callback) {
    if (options) {
      const parentConfig = options.parent || this;
      if (parentConfig) {
        let parents = null;
        if (_.isArray(parentConfig)) {
          parents = parentConfig;
        } else {
          parents = [parentConfig];
        }
        if (parents.length < 1) throw new Error('No parent found for ', limitID, options);
        let executed = false;
        return new Promise((resolve, reject) => {
          _.each(parents, parent => {
            if (!parent._limits) parent._limits = {};
            if (!parent._limits[limitID]) parent._limits[limitID] = new RateLimit(options);
            const limit = parent._limits[limitID];
            return limit.invoke(() => {
              if (!executed) {
                executed = true;
                const result = callback();
                resolve(result);
                return callback();
              }
              return false;
            });
          });
        });
      } throw new Error('Parent not found for ', limitID, options);
    } else {
      throw new Error('Limit not found:', limitID);
    }
  }
}

export const rateLimitManager = new RateLimitManager();
