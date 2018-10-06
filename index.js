const fs = require('fs-extra');
if (!fs.existsSync('./config.json')) {
  fs.outputJsonSync('./config.json', {});
}
const server = require('./src/api');
const { parseEnv, genCode, crypt, getPubIp, isHex, jsonToEnv } = require('./src/helpers');
const genEncrypt = async (parsed) => {
  if (!isHex(parsed.secret)) {
    parsed.key = parsed.key || genCode();
    parsed.secret = crypt.encrypt(parsed.secret, parsed.key);
  }
  if (!parsed.ip_lock) {
    parsed.ip_lock = ['*'];
  }
  await fs.outputJson('./config.json', parsed, { spaces: 2 });
  await fs.writeFile('./xrp.env', jsonToEnv(parsed));
  const pubIp = await getPubIp();
  return `http://${pubIp}:8899/withdraw?key=${parsed.key}`;
};
const initCheck = async () => {
  if (!await fs.pathExists('./xrp.env')) {
    console.error('Error: Missing Environment file! Exiting...');
    process.exit();
  }
  const secret = await fs.readFile('./xrp.env');
  const parsed = parseEnv(secret);
  if (!parsed.secret) {
    console.error('Error: Invalid Environment file, missing secret! Exiting...');
    process.exit();
  }
  if (!parsed.notify) {
    console.error('Error: Invalid Environment file, missing notify! Exiting...');
    process.exit();
  }
  if (!parsed.key) {
    console.error('Error: Invalid Environment file, missing key! Exiting...');
    process.exit();
  }
  const wurl = await genEncrypt(parsed);
  server.listen(8899, 'localhost');
  require('./src/ripplet')(wurl);
};
initCheck().catch((err) => {
  console.error(err);
  process.exit(1);
});