const ripple = require('./ripple');
const boxen = require('boxen');
const { getLedger } = require('./db');
const { getAddress, calcAfterBal, getPackage, getMaxFee } = require('./helpers');
const account = getAddress();
module.exports = async (wurl, key) => {
  console.log(boxen(`${getPackage()}
  Withdraw Callback Url: ${wurl}
  Wallet Address: ${account}
  Key: ${key}
  Last Synced Ledger: ${getLedger()}`.replace(/ {2,}/g, ''), { padding: 1, margin: 1, borderStyle: 'double' }));
  ripple.connect();
};
module.exports.balance = async () => {
  const balances = await ripple.api.getBalances(account);
  return balances.find((o) => o.currency == 'XRP');
};
module.exports.listTx = async (limit = 100, filter) => {
  const opts = { earliestFirst: false, limit, binary: false };
  if (filter === 'deposit') {
    opts.initiated = false;
  } else if (filter === 'withdraw') {
    opts.initiaed = true;
  }
  const txs = await ripple.api.getTransactions(account, opts);
  return txs;
};
module.exports.validate = async address => {
  try {
    const isValid = ripple.api.isValidAddress(address);
    if (!isValid) return false;
    await ripple.api.getBalances(account);
    return true;
  } catch (e) {
    return false;
  }
};
module.exports.withdraw = async (keypairs, amount, address, dtag = 0) => {
  try {
    const instructions = {};
    instructions.maxLedgerVersionOffset = 5;
    let fee = +(await ripple.api.getFee());
    const maxFee = getMaxFee();
    if (maxFee) {
      fee = fee >= maxFee ? maxFee : fee;
    }
    const balances = await ripple.api.getBalances(account);
    const xrpbal = balances.find((o) => o.currency == 'XRP');
    const balAfter = calcAfterBal(amount, fee, xrpbal.value);
    if (balAfter < 20) {
      return [false, 'insufficient_balance'];
    }
    instructions.fee = fee.toString();
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
    console.log('sending withdrawal', address, `${amount} XRP`);
    const prepared = await ripple.api.preparePayment(account, payment, instructions);
    const ledger = await ripple.api.getLedger();
    const { signedTransaction, id } = ripple.api.sign(prepared.txJSON, keypairs);
    await ripple.api.submit(signedTransaction);
    const options = {
      minLedgerVersion: ledger.ledgerVersion,
      maxLedgerVersion: prepared.instructions.maxLedgerVersion
    };
    let txr = await ripple.verifyTransaction(id, options);
    if (txr.outcome.result == 'tesSUCCESS') {
      console.log('withdrawal success', txr.id);
      return [true, { id: txr.id, fee }];
    } else {
      console.log('withdrawal failed to validate within 5 blocks', txr.id);
      return [false, 'withdrawal failed to validate within 5 blocks'];
    }
  } catch (e) {
    console.error(e.stack || e.message);
    return [false, 'internal_error'];
  }
};