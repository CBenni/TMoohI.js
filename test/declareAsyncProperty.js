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

const event = sinon.spy();
channel.on('change-name', event);


describe('declareAsyncProperty', () => {
  it('channel name should be fulfilled with "testName"', () => {
    channel.name = 'testName';
    channel.name.should.be.fulfilledWith('testName');
  });
  it('event should be called with "testName", null', () =>
    event.should.be.calledWith('testName', null));

  it('event should be called with "testName2", "testName"', () => {
    channel.name = 'testName2';
    event.should.be.calledWith('testName2', 'testName');
  });
});

