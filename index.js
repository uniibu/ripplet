const fs = require('fs-extra');
const logger = require('./src/logger');
if (!fs.existsSync('./config.json')) {
  fs.outputJsonSync('./config.json', {});
}
const { parseEnv, genCode, crypt, getPubIp, isHex, jsonToEnv } = require('./src/helpers');
const genEncrypt = async (parsed) => {
  if (isHex(parsed.secret) && parsed.secret.length == 64) {
    parsed.key = parsed.key || genCode();
    parsed.secret = crypt.encrypt(`00${parsed.secret.toUpperCase()}`, parsed.key);
  }
  if (parsed.maxfee) {
    parsed.maxfee = +parsed.maxfee;
  } else {
    parsed.maxfee = 0.000012;
  }
  await fs.outputJson('./config.json', parsed, { spaces: 2 });
  await fs.writeFile('./xrp.env', jsonToEnv(parsed));
  const pubIp = await getPubIp();
  return `http://${pubIp}:8899/withdraw?key=${parsed.key}`;
};
const initCheck = async () => {
  if (!await fs.pathExists('./xrp.env')) {
    logger.error('Error: Missing Environment file! Exiting...');
    process.exit();
  }
  const secret = await fs.readFile('./xrp.env');
  const parsed = parseEnv(secret);
  if (!parsed.secret) {
    logger.error('Error: Invalid Environment file, missing secret! Exiting...');
    process.exit();
  }
  if (!parsed.notify) {
    logger.error('Error: Invalid Environment file, missing notify! Exiting...');
    process.exit();
  }
  if (!parsed.key) {
    logger.error('Error: Invalid Environment file, missing key! Exiting...');
    process.exit();
  }
  if (parsed.maxfee && +parsed.maxfee < 0.000012) {
    logger.error('Error: Invalid Environment file, maxfee must be atleast 0.000012! Exiting...');
    process.exit();
  }
  const wurl = await genEncrypt(parsed);
  require('./src/db').cleanLock();
  require('./src/api').listen(8899);
  require('./src/ripplet')(wurl, parsed.key);
};
initCheck().catch((err) => {
  console.error(err);
  process.exit(1);
});