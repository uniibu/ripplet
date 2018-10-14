const crypto = require('crypto');
const needle = require('needle');
const Big = require('big.js');
const elliptic = require('elliptic');
const Secp256k1 = elliptic.ec('secp256k1');
var queue = require('queuing');
var q = queue({ autostart:true,retry:true,concurrency:1,delay:5000 });
const keypairs = require('ripple-keypairs');
const pkgjson = require('../package.json');
needle.defaults({
  user_agent: `${pkgjson.name.charAt(0).toUpperCase() + pkgjson.name.substr(1)}/${pkgjson.version} (Node.js ${process.version})`
});
function getConf() {
  delete require.cache[require.resolve('../config.json')];
  return require('../config.json');
}

function isPlainObject(input) {
  return input && !Array.isArray(input) && typeof input === 'object';
}
const truncateSix = exports.truncateSix = num => {
  const numPower = 10 ** 6;
  return ~~(num * numPower) / numPower;
};
function bytesToHex(a) {
  return a.map(function(byteValue) {
    const hex = byteValue.toString(16).toUpperCase();
    return hex.length > 1 ? hex : '0' + hex;
  }).join('');
}
exports.getPackage = function(){
  return `${pkgjson.name.charAt(0).toUpperCase() + pkgjson.name.substr(1)} version ${pkgjson.version}`;
};
exports.parseEnv = envstr => {
  const result = {};
  const lines = envstr.toString().split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=:#]+?)[=:](.*)/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      result[key] = ['secret', 'key', 'notify'].includes(key) ? value : value.split(',');
    }
  }
  return result;
};
exports.genCode = () => crypto.randomBytes(8).toString('hex');
const crypt = {
  'encrypt': function (secret, key) {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let crypted = cipher.update(secret, 'utf-8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  },
  'decrypt': function (encrypted, key) {
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
exports.crypt = crypt;
exports.getPubIp = async () => {
  const ip = await needle('get', 'https://btslr.co/ip');
  return ip.body;
};
exports.isHex = str => !isNaN(parseInt(str, 16));
exports.jsonToEnv = obj => {
  if (!isPlainObject(obj)) {
    return '';
  }
  let envstr = '';
  for (let [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      v = v.join(',');
    }
    envstr += `${k}=${v}\n`;
  }
  return envstr;
};
exports.conf = getConf;
exports.checkip = ip => {
  const config = getConf();
  if (!config.ip_lock || config.ip_lock == '*') {
    return true;
  }
  return config.ip_lock.includes(ip);
};
const sendnotify = async (txobj) => {
  const config = getConf();
  const r = await needle('post', config.notify, txobj, { json: true });
  return r;
};

exports.notify = async function(txobj){
  q.push(async function(cb){
    try{
      const r = await sendnotify(txobj);
      if(r.statusCode !== 200){
        console.error('retrying failed notification tx', txobj);
        return cb(r);
      }
      cb();
    }catch(e){
      console.error('retrying failed notification tx', txobj);
      cb(e);
    }
  });
};
exports.getKeyPairs = function(){
  const config = getConf();
  const secret = crypt.decrypt(config.secret, config.key);  
  const publicKey = bytesToHex(Secp256k1.keyFromPrivate(secret).getPublic().encodeCompressed());
  return { privateKey:secret, publicKey:publicKey };
};
exports.getAddress = () => {
  const config = getConf();
  const secret = crypt.decrypt(config.secret, config.key);  
  const publicKey = bytesToHex(Secp256k1.keyFromPrivate(secret).getPublic().encodeCompressed());
  // const kp = keypairs.deriveKeypair(secret);
  return keypairs.deriveAddress(publicKey);
};
exports.dropsToXrp = drops => {
  const amt = new Big(drops);
  return amt.times(0.000001).toString();
};
exports.calcAfterBal = (amount, fee, currbal) => {
  let amt = new Big(amount);
  currbal = new Big(currbal);
  amt = amt.plus(fee);
  const left = currbal.minus(amt).toString();
  return truncateSix(left);
};