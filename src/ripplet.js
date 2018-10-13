const ripple = require('./ripple');
const boxen = require('boxen');
const { getAddress, calcAfterBal, getPackage } = require('./helpers');
const account = getAddress();
module.exports = async (wurl) => {
  console.log(boxen(`${`${getPackage()}\n`}Withdraw Callback Url: ${`${wurl}\n`}Wallet Address: ${account}`, { padding: 1, margin: 1, borderStyle: 'double' }));
  ripple.connect();
};
module.exports.withdraw = async (secret, amount, address, dtag = 0) => {
  try {
    const instructions = {};
    instructions.maxLedgerVersionOffset = 5;
    const fee = await ripple.api.getFee();
    const balances = await ripple.api.getBalances(account);
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
    const prepared = await ripple.api.preparePayment(account, payment, instructions);
    const ledger = await ripple.api.getLedger();
    const { signedTransaction, id } = ripple.api.sign(prepared.txJSON, secret);
    await ripple.api.submit(signedTransaction);
    const options = {
      minLedgerVersion: ledger.ledgerVersion,
      maxLedgerVersion: prepared.instructions.maxLedgerVersion
    };
    let txr = await ripple.verifyTransaction(id, options);
    if (txr.outcome.result == 'tesSUCCESS') {
      return [true, txr.id];
    }
  } catch (e) {
    console.error(e.stack || e.message);
    return [false, 'internal_error'];
  }
};