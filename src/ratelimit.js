import _ from 'lodash';
import perfNow from 'performance-now';

export class RateLimitHolder {
  constructor() {
    this._limits = {};
  }
}

export class RateLimit {
  constructor(options, parent) {
    this.options = options;
    this.events = [];
    this.queue = [];
    this.timeout = null;
    this.parent = parent;
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
    let result;
    try {
      result = queueItem.callback(this);
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
    return result;
  }

  addEvent() {
    this.events.push(perfNow());
  }

  // the wait time is how long itll take (approximately) until a new event can be executed
  getWaitTime() {
    this.purge();
    // if theres less events in the queue and in the event list than the limit allows, we can do it immediately
    if ((this.events.length + this.queue.length) < this.options.limit) {
      return 0;
    }
    // a good approximation to the wait time is to fill the event list with queue items and to assume the remaining queue is
    // handled in regular intervals. This isnt 100% precise, but avoids an O(n) iteration
    return (this.queue.length + this.events.length - this.options.limit) * this.options.interval;
  }

  getQueueLength() {
    this.purge();
    // if theres less events in the queue and in the event list than the limit allows, we can do it immediately
    return this.events.length + this.queue.length;
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
        // find the parent with the shortest wait time (aka queue length)
        const parentToUse = _.minBy(parents, parent => {
          if (parent._limits) {
            if (parent._limits[limitID]) return parent._limits[limitID].getQueueLength();
          }
          return 0;
        });
        if (!parentToUse._limits) parentToUse._limits = {};
        if (!parentToUse._limits[limitID]) parentToUse._limits[limitID] = new RateLimit(options, parentToUse);
        const limit = parentToUse._limits[limitID];
        return limit.invoke(callback);
      } throw new Error('Parent not found for ', limitID, options);
    } else {
      throw new Error('Limit not found:', limitID);
    }
  }
}

export const rateLimitManager = new RateLimitManager();
