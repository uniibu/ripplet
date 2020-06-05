const RippleAPI = require('ripple-lib').RippleAPI;
const promiseRetry = require('promise-retry');
const logger = require('../logger');
let maxretry = 4;
const { _lastClosedLedger, _bootstrap } = require('./bootstrap');
const listServers = [
  'wss://s2.ripple.com',
  'wss://ripple1.devpod.io',
  'wss://ripple2.devpod.io',
  'wss://s1.ripple.com'
];
const apiServer = listServers[process.env.NODE_APP_INSTANCE == undefined ? 0 : process.env.NODE_APP_INSTANCE];
let api = exports.api = new RippleAPI({ server: apiServer });
exports.connect = () => {
  api.on('error', (errorCode, errorMessage) => {
    logger.error(`[${errorCode}] ripple socket error: ${errorMessage}`);
  });
  api.on('connected', () => {
    logger.info(`successfully connected to ${api.connection._url}`);
  });
  api.on('disconnected', (code) => {
    logger.warn(`disconnected with code: ${code}`);
    logger.info('Reconnecting to', apiServer);
    start();
  });
  const connect = () => promiseRetry((retry, attempt) => api.connect().catch(() => {
    logger.warn(`Error connection: ${apiServer}`, `retry attempt: ${attempt}`);
    api.connection._url = apiServer;
    retry();
  }), { maxTimeout: 1000, retries: maxretry });
  const start = () => {
    connect().then(() => {
      api.getServerInfo().then(server => {
        _lastClosedLedger(server.validatedLedger.ledgerVersion);
        _bootstrap(api);
        logger.info('ripplet is syncing successfully');
      });
    }).catch(console.error);
  };
  start();
};
exports.verifyTransaction = async (hash, options) => {
  const r = await promiseRetry(retry => api.getTransaction(hash, options).catch(retry), { maxTimeout: 1000, retries: 20 });
  return r;
};