import { it, describe } from 'mocha';
import sinon from 'sinon';
import 'should';
import 'should-sinon';

import { EventEmitter } from 'events';
import { declareAsyncProperty } from '../src/helpers';

export default class ChannelTest extends EventEmitter {
  constructor(id, name) {
    super();

    this.id = id;
    this.connection = null;
    this.referenceCount = 0;

    declareAsyncProperty(this, 'name', name);
  }
}

const channel = new ChannelTest('1234', null);

describe('channel name promise', () => {
  it('channel name should be fulfilled with "testName"', () =>
    channel.name.should.be.fulfilledWith('testName'));
});

const event = sinon.spy();

channel.on('change-name', event);

channel.name = 'testName';

describe('channel change-name event', () => {
  it('event should be called with "testName", null', () =>
    event.should.be.calledWith('testName', null));
});

