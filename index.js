const fs = require('fs-extra');
const logger = require('./src/logger');
const keypairs = require('ripple-keypairs');
if (!fs.existsSync('./config.json')) {
  fs.outputJsonSync('./config.json', {});
}
const { parseEnv, genCode, crypt, getPubIp, isHex, jsonToEnv } = require('./src/helpers');
const genEncrypt = async (parse) => {
    if(!isHex(parse.secret)) {
        parse.secret = keypairs.deriveKeypair( parse.secret ).privateKey
        parse.secret = parse.secret.substring(2,parse.secret.length)

    }
  if (isHex(parse.secret) && parse.secret.length == 64) {
    parse.key = parse.key || genCode();
    parse.secret = crypt.encrypt(`00${parse.secret.toUpperCase()}`, parse.key);
  }
  if (parse.maxfee) {
    parse.maxfee = +parse.maxfee;
  } else {
    parse.maxfee = 0.000012;
  }
  await fs.outputJson('./config.json', parse, { spaces: 2 });
  await fs.writeFile('./xrp.env', jsonToEnv(parse));
  const pubIp = await getPubIp();
  return `http://${pubIp}:8899/withdraw?key=${parse.key}`;
};

const initCheck = async () => {
    logger.info("starting ripplet workers.. please wait")
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