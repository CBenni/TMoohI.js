import { it, describe } from 'mocha';
import perfNow from 'performance-now';
import 'should';

import { RateLimitHolder, rateLimitManager } from '../src/ratelimit';

function log(...args) {
  console.log(`[${perfNow()}]`, ...args);
}

class Parent extends RateLimitHolder {
  constructor(name) {
    super();
    this.name = name;
    this.children = [];
  }
}
let count = 0;
class Child {
  constructor(parent, name) {
    this.parent = parent;
    parent.children.push(this);
    this.name = name;
    this.events = [];
  }

  increment() {
    const cnt = count++;
    log(`Increment #${cnt} called!`);
    return rateLimitManager.invoke('increment', {
      parent: this.parent,
      interval: 100,
      limit: 3
    }, () => {
      this.events.push(Date.now());
      log(`Increment #${cnt} run!`);
    });
  }
}

const options = {
  interval: 100,
  limit: 3
};

const parent = new Parent('parent');
const child = new Child(parent, 'child');

parent.children.push(child);

const times = [];
const testerFunction = () => {
  times.push(perfNow());
};

const promises = [];
// log('First wave');
for (let i = 1; i <= Math.round(options.limit * 2.49); ++i) {
  promises.push(rateLimitManager.invoke('test', options, testerFunction));
}

setTimeout(() => {
  // log('Second wave');
  for (let i = 1; i <= Math.round(options.limit * 2.3333); ++i) {
    promises.push(rateLimitManager.invoke('test', options, testerFunction));
  }
}, options.interval / 10);


function thirdWave() {
  return new Promise(resolve => {
    setTimeout(() => {
      // log('Third wave');
      for (let i = 1; i <= Math.round(options.limit); ++i) {
        promises.push(rateLimitManager.invoke('test', options, testerFunction));
      }
      return Promise.all(promises).then(() => {
        // log('Invocation times: ', times);
        for (let i = 0; i < times.length; ++i) {
          for (let j = i + 1; j < times.length && (times[j] - times[i] < options.interval); ++j) {
            (j - i).should.be.below(options.limit);
          }
        }
        resolve();
      }).should.be.fulfilled();
    }, options.interval * 6);
  });
}

describe('ratelimits', () => {
  it('invocation times should all be below the limit', () => thirdWave());
});
