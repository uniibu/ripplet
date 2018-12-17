const low = require('lowdb');
const fs = require('fs-extra');
const { resolve, extname } = require('path');
const lockFileRsolve = (str) => resolve(__dirname, `${str.slice(0, 6)}.lock`);
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('src/db/db.json');
const db = low(adapter);

let connected = false;

const connect = () => {
  if (connected) return true;
  db.defaults({ ledger: 0, last_worker: 0 }).write();
  connected = true;
  return;
};

exports.updateLedger = ledgerIndex => {
  connect();
  db.set('ledger', ledgerIndex).write();
  return;
};
exports.getLedger = () => {
  connect();
  return db.get('ledger').value();
};

exports.lock = (str) => {
  fs.ensureFileSync(lockFileRsolve(str));
};
exports.unlock = (str) => {
  fs.removeSync(lockFileRsolve(str));
};
exports.isLock = (str) => {
  return fs.pathExistsSync(lockFileRsolve(str));
};
exports.cleanLock = () => {
  const rdir = fs.readdirSync(__dirname);
  for (const f of rdir) {
    const ext = extname(f);
    if (ext == '.lock') {
      fs.removeSync(resolve(__dirname, f));
    }
  }
};