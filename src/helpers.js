const crypto = require('crypto');
const p = require('phin').promisified;
const elliptic = require('elliptic');
const Secp256k1 = elliptic.ec('secp256k1');
const queue = require('queuing');
const logger = require('./logger');
const q = queue({ autostart: true, retry: true, concurrency: 1, delay: 5000 });
const keypairs = require('ripple-keypairs');
const pkgjson = require('../package.json');
const got = async (method, uri, opts = {}) => {
  opts = Object.assign(opts, {
    url: uri,
    method,
    headers: {
      'User-Agent': `${pkgjson.name.charAt(0).toUpperCase() + pkgjson.name.substr(1)}/${pkgjson.version} (Node.js ${process.version})`
    }
  });
  try {
    const r = await p(opts);
    if (r.statusCode !== 200) {
      if (opts.url !== 'https://btslr.co/ip') {
        logger.error(`error sending notification statusCode: ${r.statusCode}. retrying...`);
      }
      return false;
    }
    return r.body || true;
  } catch (e) {
    if (opts.url !== 'https://btslr.co/ip') {
      logger.error(`error sending notification ${e.message || e.stack}. retrying...`);
    }
    return false;
  }
};
const getConf = () => {
  delete require.cache[require.resolve('../config.json')];
  return require('../config.json');
};
const isPlainObject = input => input && !Array.isArray(input) && typeof input === 'object';
const truncateSix = (num = 0) => {
  const str = parseFloat(num).toFixed(12);
  return Number(str.substr(0, str.indexOf('.') + 7));
};
const bytesToHex = a => a.map(byteValue => {
  const hex = byteValue.toString(16).toUpperCase();
  return hex.length > 1 ? hex : `0${hex}`;
}).join('');
const getPackage = () => `${pkgjson.name.charAt(0).toUpperCase() + pkgjson.name.substr(1)} version ${pkgjson.version}`;
const parseEnv = envstr => {
  const result = {};
  const lines = envstr.toString().split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=:#]+?)[=:](.*)/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      result[key] = [
        'secret', 'key', 'notify'
      ].includes(key) ? value : value.split(',');
    }
  }
  return result;
};
const genCode = () => crypto.randomBytes(8).toString('hex');
const crypt = {
  encrypt(secret, key) {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let crypted = cipher.update(secret, 'utf-8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  },
  decrypt(encrypted, key) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      return decrypted;
    } catch (e) {
      return false;
    }
  }
};
const getPubIp = async () => {
  const ip = await got('get', 'https://btslr.co/ip');
  if (!ip) {
    return 'localhost';
  }
  return ip;
};
const isHex = str => !isNaN(parseInt(str, 16));
const jsonToEnv = obj => {
  let envstr = '';
  if (!isPlainObject(obj)) {
    return envstr;
  }
  for (let [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      v = v.join(',');
    }
    envstr += `${k}=${v}\n`;
  }
  return envstr;
};
const notify = async txobj => {
  q.push(async retry => {
    const config = getConf();
    const r = await got('post', config.notify, { data: txobj });
    if (r) {
      logger.info('sending deposit notification success for txid', txobj.hash);
    }
    retry(!r);
  });
};
const validateKey = key => {
  const config = getConf();
  return key === config.key;
};
const getKeyPairs = () => {
  const config = getConf();
  const secret = crypt.decrypt(config.secret, config.key);
  const publicKey = bytesToHex(Secp256k1.keyFromPrivate(secret).getPublic().encodeCompressed());
  return { privateKey: secret, publicKey };
};
const getAddress = () => {
  const { publicKey } = getKeyPairs();
  const address = keypairs.deriveAddress(publicKey);
  return address;
};
const calcAfterBal = (amount, fee, currbal) => {
  amount = Number(amount);
  fee = Number(fee);
  currbal = Number(currbal);
  const left = currbal - (amount + fee);
  return truncateSix(left);
};
const getMaxFee = () => {
  const config = getConf();
  return config.maxfee;
};
module.exports = {
  truncateSix,
  getPackage,
  parseEnv,
  genCode,
  crypt,
  getPubIp,
  isHex,
  jsonToEnv,
  notify,
  validateKey,
  getKeyPairs,
  getAddress,
  calcAfterBal,
  getMaxFee
};