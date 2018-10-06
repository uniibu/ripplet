const Ripple = require('./Ripple');
const api = new Ripple();
const boxen = require('boxen');
const log = (...args) => {
  console.log(`[[${new Date().toUTCString()}]]`, ...args);
};
const { getAddress, notify, dropsToXrp, calcAfterBal, getPackage } = require('./helpers');
const account = getAddress();
module.exports = async (wurl) => {
  console.log(boxen(`${`${getPackage()}\n`}Withdraw Callback Url: ${`${wurl}\n`}Wallet Address: ${account}`, { padding: 1, margin: 1, borderStyle: 'double' }));
  await api.listen('transaction', (event) => {
    if (event.engine_result === 'tesSUCCESS' && event.status === 'closed' && event.validated === true && event.transaction.TransactionType === 'Payment') {
      if (event.transaction.Account !== account) {
        notify(dropsToXrp(event.transaction.Amount), event.transaction.DestinationTag, event.transaction.hash);
        log('Transaction[IN]', `Amount: ${dropsToXrp(event.transaction.Amount)}`, `DTag: ${event.transaction.DestinationTag}`, `TxId: ${event.transaction.hash}`, `From: ${event.transaction.Account}`);
      } else {
        log('Transaction[OUT]', `Amount: ${dropsToXrp(event.transaction.Amount)}`, `DTag: ${event.transaction.DestinationTag}`, `TxId: ${event.transaction.hash}`, `To: ${event.transaction.Destination}`);
      }
    }
  });
  await api.request('subscribe', {
    accounts: [account]
  });
};
const verifyTransaction = async (hash, options) => {
  const polltx = async (h, o) => {
    try {
      const data = await api.method('getTransaction', hash, options);
      return data;
    } catch (e) {
      if (e instanceof api.errors.PendingLedgerVersionError) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            polltx(h, o).then(resolve, reject);
          }, 1000);
        });
      }
      throw e;
    }
  };
  const r = await polltx(hash, options);
  return r;
};
module.exports.withdraw = async (secret, amount, address, dtag = 0) => {
  try {
    const instructions = {};
    instructions.maxLedgerVersionOffset = 5;
    const fee = await api.method('getFee');
    const balances = await api.method('getBalances', account);
    const xrpbal = balances.find((o) => o.currency == 'XRP');
    const balAfter = calcAfterBal(amount, fee, xrpbal.value);
    if (balAfter < 20) {
      return [false, 'insufficient_balance'];
    }
    const payment = {
      source: {
        address: account,
        maxAmount: {
          value: amount.toString(),
          currency: 'XRP'
        }
      },
      destination: {
        address,
        amount: {
          value: amount.toString(),
          currency: 'XRP'
        },
        tag: dtag
      }
    };
    const prepared = await api.method('preparePayment', account, payment, instructions);
    const ledger = await api.method('getLedger');
    const { signedTransaction, id } = await api.method('sign', prepared.txJSON, secret);
    await api.method('submit', signedTransaction);
    const options = {
      minLedgerVersion: ledger.ledgerVersion,
      maxLedgerVersion: prepared.instructions.maxLedgerVersion
    };
    let txr = await verifyTransaction(id, options);
    if (txr.outcome.result == 'tesSUCCESS') {
      return [true, txr.id];
    }
  } catch (e) {
    console.error(e.stack || e.message);
    return [false, 'internal_error'];
  }
};