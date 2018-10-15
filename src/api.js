const Koa = require('koa');
const Router = require('koa-router');
const bouncer = require('koa-bouncer');
const { validateKey, truncateSix, getKeyPairs } = require('./helpers.js');
const { withdraw, balance, validate, listTx } = require('./ripplet');
const busy = require('./busy');
const app = new Koa();
const router = new Router();
app.use(
  require('koa-bodyparser')({
    extendTypes: { json: ['text/plain'] },
    enableTypes: ['json']
  })
);
app.use(bouncer.middleware());
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(err.message);
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
    return ctx.throw(403, 'Forbidden');
  }
  await next();
});
router.get('/balance', async ctx => {
  const bal = await balance();
  ctx.body = { success: true, balance: bal };
});
router.get('/validate', async ctx => {
  ctx.validateQuery('address').required('Missing address').isString().trim();
  const validAddress = await validate(ctx.vals.address);
  ctx.body = { success: validAddress };
});
router.get('/gettransactions', async ctx => {
  ctx.validateQuery('limit').optional();
  ctx.validateQuery('filter').optional().isIn(['deposit', 'withdraw'], 'Invalid filter');
  const limit = +ctx.vals.limit || 100;
  const txs = await listTx(limit, ctx.vals.filter);
  ctx.body = { success: true, transactions: txs };
});
router.post('/withdraw', async (ctx) => {
  if (busy.get()) {
    ctx.body = { success: false, error: 'busy' };
    return;
  }
  busy.set(true);
  ctx.validateBody('amount').required('Missing amount').toDecimal('Invalid amount').tap(n => truncateSix(n));
  ctx.validateBody('address').required('Missing address').isString().trim();
  ctx.validateBody('dtag').optional().toInt('Invalid dtag');
  ctx.check(ctx.vals.amount, 'Invalid amount');
  ctx.check(ctx.vals.address, 'Invalid address');
  const validAddress = await validate(ctx.vals.address);
  ctx.check(validAddress, 'Inactive address');
  const keypairs = getKeyPairs();
  if (!keypairs.privateKey) {
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