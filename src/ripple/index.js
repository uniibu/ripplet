const RippleAPI = require('ripple-lib').RippleAPI;
const promiseRetry = require('promise-retry');
const { _lastClosedLedger, _bootstrap } = require('./bootstrap');

const listServers = ['wss://s2.ripple.com:443', 'wss://s-west.ripple.com:443', 'wss://s-east.ripple.com:443', 'wss://s1.ripple.com:443'];
let api = exports.api = new RippleAPI({ server: listServers[0] });
exports.connect = () => {
  api.on('error', (errorCode, errorMessage) => {
    console.log(`${errorCode}: ${errorMessage}`);
  });
  api.on('connected', () => {
    console.log('<< connected >>');
  });
  api.on('disconnected', (code) => {
    console.log('<< disconnected >> code:', code);
  });
  const connect = () => promiseRetry((retry, attempt) => api.connect().catch(() => {
    api.connection._url = listServers[attempt];
    retry();
  }), { maxTimeout: 1000, retries: 4 });
  connect().then(() => {
    api.getServerInfo().then(server => {
      _lastClosedLedger(server.validatedLedger.ledgerVersion);
      _bootstrap(api);
    });
  }).catch(console.error);
};
exports.verifyTransaction = async (hash, options) => {
  const r = await promiseRetry(retry => api.getTransaction(hash, options).catch(retry), { maxTimeout: 1000, retries: 20 });
  return r;
};