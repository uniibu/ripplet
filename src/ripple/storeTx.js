const db = require('../db');
const { notify } = require('../helpers');
exports._storeTransaction = (tx) => {
  const lastLedger = db.getLedger();
  if (lastLedger < tx.ledger_index) {
    const destinationTag = parseInt(tx.DestinationTag || 0);
    const transferAmount = (parseFloat(tx.Amount) / 1000 / 1000);
    const transactionJson = {
      hash: tx.hash,
      from: tx.Account,
      to: tx.Destination,
      amount: transferAmount,
      tag: destinationTag
    };
    db.updateLedger(tx.ledger_index);
    console.log('sending notification', tx.ledger_index, tx.hash);
    notify(transactionJson).catch(console.error);
  }
};