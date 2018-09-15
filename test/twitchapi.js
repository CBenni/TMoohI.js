import { describe, it } from 'mocha';
import { twitchGetUser } from '../src/twitchapi';
import settings from '../src/settings';

describe('twitch api', () => {
  it('twitch api should return user', async () => {
    const userPromise = twitchGetUser('21018440', settings.firehose.oauth);
    const user = await userPromise;
    userPromise.should.be.fulfilled();
    return user.name.should.be.exactly('cbenni');
  });
});
