import net from 'net';

import settings from './settings';
import logger from './logger';

const server = net.createServer(()=>{
	logger.info("Server listening on "+settings.server.host+":"+settings.server.port+"!");
})

server.listen(settings.server.port, settings.server.host);