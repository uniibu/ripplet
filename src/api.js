const Koa = require('koa');
const Router = require('koa-router');
const bouncer = require('koa-bouncer');
const logger = require('./logger');
const { validateKey, truncateSix, getKeyPairs } = require('./helpers.js');
const { withdraw, balance, validate, listTx, setrequired, toXaddress, fromXaddress } = require('./ripplet');
const busy = require('./busy');
const app = new Koa();
const router = new Router();
app.use(
  require('koa-bodyparser')({
    extendTypes: {
      json: ['text/plain']
    },
    enableTypes: ['json']
  })
);
app.use(bouncer.middleware());
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    logger.error(err.stack || err.message);
    busy.set(false);
    if (err instanceof bouncer.ValidationError) {
      ctx.status = 400;
      ctx.body = { success: false, error: err.message };
      return;
    } else {
      ctx.body = { success: false, error: err.message };
      return;
    }
  }
});
router.use(async (ctx, next) => {
  ctx.validateQuery('key').required('Missing key').isString().trim();
  if (!validateKey(ctx.vals.key)) {
    logger.error('invalid key');
    return ctx.throw(403, 'Forbidden');
  }
  await next();
});
router.get('/balance', async ctx => {
  logger.info('RPC /balance was called', ctx.request.query);
  const bal = await balance();
  ctx.body = { success: true, balance: bal };
});
router.get('/setrequiretag', async ctx => {
  logger.info('RPC /setrequiretag was called');
  const keypairs = getKeyPairs();
  if (!keypairs.privateKey) {
    logger.error('could not retrieve private key from keypairs');
    ctx.throw(403, 'Forbidden seed');
  }
  const [result, data] = await setrequired(keypairs);
  const payload = {success: result}
  if(!result) {
      payload.error = data;
  }else {
      payload.txid = data
  }
  ctx.body = payload;
});
router.get('/validate', async ctx => {
  logger.info('RPC /validate was called:', ctx.request.query);
  ctx.validateQuery('address').required('Missing address').isString().trim();
  const validAddress = await validate(ctx.vals.address);
  ctx.body = { success: validAddress };
});
router.get('/toxaddress', async ctx => {
  logger.info('RPC /toxaddress was called:', ctx.request.query);
  ctx.validateQuery('address').required('Missing address').isString().trim();
  ctx.validateQuery('tag').required('Missing tag').isString().trim();
  const xAddress = toXaddress(ctx.vals.address, ctx.vals.tag);
  ctx.body = { success: true, xaddress: xAddress };
});
router.get('/fromxaddress', async ctx => {
  logger.info('RPC /fromxaddress was called:', ctx.request.query);
  ctx.validateQuery('xaddress').required('Missing xaddress').isString().trim();
  const obj = fromXaddress(ctx.vals.xaddressg);
  ctx.body = { success: true, obj };
});
router.get('/gettransactions', async ctx => {
  logger.info('RPC /gettransactions was called:', ctx.request.query);
  ctx.validateQuery('limit').optional();
  ctx.validateQuery('filter').optional().isIn(['deposit', 'withdraw'], 'Invalid filter');
  const limit = +ctx.vals.limit || 100;
  const txs = await listTx(limit, ctx.vals.filter);
  ctx.body = { success: true, transactions: txs };
});
router.post('/withdraw', async (ctx) => {
  logger.info('RPC /withdraw was called:', ctx.request.body);
  if (busy.get()) {
    logger.warn('RPC /withdraw is busy');
    ctx.body = { success: false, error: 'busy' };
    return;
  }
  busy.set(true);
  ctx.validateBody('amount').required('Missing amount').toDecimal('Invalid amount').tap(n => truncateSix(n));
  ctx.validateBody('address').required('Missing address').isString().trim();
  ctx.validateBody('dtag').required().toInt('Invalid dtag');
  ctx.check(ctx.vals.amount && ctx.vals.amount >= 0.000001, 'Invalid amount');
  ctx.check(ctx.vals.address, 'Invalid address');
  logger.info(`sending withdrawal ${ctx.vals.address} ${ctx.vals.amount} XRP`);
  const validAddress = await validate(ctx.vals.address);
  ctx.check(validAddress, 'Inactive address');
  const keypairs = getKeyPairs();
  if (!keypairs.privateKey) {
    logger.error('could not retrieve private key from keypairs');
    ctx.throw(403, 'Forbidden seed');
  }
  const [result, data] = await withdraw(keypairs, ctx.vals.amount, ctx.vals.address, ctx.vals.dtag);
  const payload = { success: result };
  if (!result) {
    payload.error = data;
  } else {
    payload.txid = data.id;
    payload.fee = data.fee.toFixed(6);
  }
  busy.set(false);
  ctx.body = payload;
});
app.use(router.routes());
app.use(router.allowedMethods());
module.exports = app;