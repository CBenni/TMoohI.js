import net from 'net';

import settings from './settings';
import logger from './logger';
import Client from './client';

const server = net.createServer(socket => {
  const client = new Client(socket);
  logger.info('Client connecting!', client);
});

server.listen(settings.server.port, settings.server.host);
server.on('listening', () => {
  logger.info(`Server listening on ${settings.server.host}:${settings.server.port}!`);
});
