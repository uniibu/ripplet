const db = require('../db');
const logger = require('../logger');
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
    logger.info('sending deposit notification', `txid: ${tx.hash}`, `amount: ${transferAmount}`, `tag: ${destinationTag}`);
    notify(transactionJson).catch(logger.error);
  }
};