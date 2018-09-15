import got from 'got';

export async function twitchGet(url, headers, token, query) {
  if (!headers) headers = {};
  if (token) headers.authorization = `OAuth ${token}`;
  if (!headers.accept) headers.accept = 'application/vnd.twitchtv.v5+json';
  return (await got.get(url, { headers, query, json: true })).body;
}

export async function twitchPost(url, headers, token, body) {
  if (!headers) headers = {};
  if (token) headers.authorization = `OAuth ${token}`;
  if (!headers.accept) headers.accept = 'application/vnd.twitchtv.v5+json';
  return (await got.post(url, { headers, body, json: true })).body;
}

const userIDByName = {};

export async function twitchGetIDByName(userName) {
  if (userIDByName[userName]) return userIDByName[userName];
  const userResponse = await twitchGet(`https://api.twitch.tv/kraken/users/?login=${userName}`);
  userIDByName[userName] = userResponse.body.users[0]._id;
  return userIDByName[userName];
}

export function twitchGetUser(userID, token) {
  return twitchGet(`https://api.twitch.tv/kraken/users/${userID}`, null, token);
}
