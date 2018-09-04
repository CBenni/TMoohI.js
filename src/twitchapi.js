import _ from 'lodash';
import got from 'got';

export async function getTwitchUser(userID) {
  const result = await got(`https://api.twitch.tv/kraken/users/${userID}`, { json: true });
  return result.body;
}

export async function getTwitchUsersByName(userNames) {
  if (_.isArray(userNames)) userNames = _.join(userNames);
  const result = await got(`https://api.twitch.tv/kraken/users/${userNames}`, { json: true });
  return _.reduce(result.body.users, (item, index, result) => {
    result[item.name] = item;
    return result;
  }, {});
}
