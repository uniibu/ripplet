const { _storeTransaction } = require('./storeTx');
const { getAddress } = require('../helpers');
const logger = require('../logger');
const wallets = [getAddress()];
let closedLedger = 0;
const _lastClosedLedger = exports._lastClosedLedger = (ledgerIndex) => {
  const i = parseInt(ledgerIndex);
  if (i > closedLedger) {
    closedLedger = i;
  }
};
const sortArrayBy = (arr, n) => arr.sort((a, b) => {
  if (a.tx[n] < b.tx[n])
    return -1;
  if (a.tx[n] > b.tx[n])
    return 1;
  return 0;
});

const checkTransaction = (tx) => {
    if(!wallets.includes(tx.transaction.Destination)) return [false, 'invalid destination ' + tx.transaction.Destination];
    if(!tx.validated) return [false, 'invalid'];
    if(tx.transaction.TransactionType !== 'Payment') return [false, 'invalid transaction type ' + tx.transaction.TransactionType];
    if(typeof tx.meta.delivered_amount !== 'string') return [false, 'invalid delivered_amount ' + tx.meta.delivered_amount];
    if(tx.meta.TransactionResult !== 'tesSUCCESS') return [false, 'invalid transaction result ' + tx.meta.TransactionResult];
    return [true];
}

exports._bootstrap = (api) => {
  api.connection._ws.on('message', m => {
    const message = JSON.parse(m);
 
    if (message.type === 'ledgerClosed') {
      _lastClosedLedger(message.ledger_index);
    }
    if (message.type === 'response' && typeof message.id !== 'undefined' && message.id <= wallets.length) {
      if (typeof message.result.transactions !== 'undefined' && message.result.transactions.length > 0) {
        message.result.transactions = sortArrayBy(message.result.transactions, 'ledger_index');
        message.result.transactions.filter(f => f.validated && wallets.includes(f.tx.Destination) && f.tx.TransactionType === 'Payment' && typeof f.meta.delivered_amount === 'string' && f.meta.TransactionResult === 'tesSUCCESS').forEach(t => {
          _storeTransaction(t.tx,t.meta);
        });
      }
    }
  });
  wallets.forEach((_w, k) => {
    logger.info(`checking history: @${k}`, _w);
    api.connection._ws.send(JSON.stringify({
      id: k + 1,
      command: 'account_tx',
      account: _w,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      count: false,
      limit: 1000,
      descending: true
    }));
  });
  api.connection.on('transaction', (t) => {
    const checktx = checkTransaction(t);
    if (checktx[0]) {      
      const tx = t.transaction;
      tx.ledger_index = t.ledger_index;
      _storeTransaction(tx,t.meta);
    }else{
        logger.info('checkTransaction Failed: '+ checktx[1])
    }
  });
  return api.connection.request({
    command: 'subscribe',
    accounts: wallets
  });
};