const Koa = require('koa');
const Router = require('koa-router');
const bouncer = require('koa-bouncer');
const { isHex, checkip, truncateSix, getKeyPairs } = require('./helpers.js');
const { withdraw } = require('./ripplet');
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
  if (!checkip(ctx.ip)) {
    return ctx.throw(403, `${ctx.ip} is Forbidden`);
  }
  await next();
});
router.post('/withdraw', async (ctx) => {
  if (busy.get()) {
    ctx.body = { success: false, error: 'busy' };
    return;
  }
  busy.set(true);
  ctx.validateQuery('key').required('Missing key').isString().trim();
  ctx.validateBody('amount').required('Missing amount').toDecimal('Invalid amount').tap(n => truncateSix(n));
  ctx.validateBody('address').required('Missing address').isString().trim();
  ctx.validateBody('dtag').optional().toInt('Invalid dtag');
  ctx.check(ctx.vals.amount, 'Invalid amount');
  ctx.check(ctx.vals.address, 'Invalid address');
  ctx.check(ctx.vals.key, 'Invalid key');
  if (!ctx.vals.key || !isHex(ctx.vals.key)) {
    ctx.throw(403, 'Forbidden key');
  }
  const keypairs = getKeyPairs();
  if (!keypairs.privateKey) {
    ctx.throw(403, 'Forbidden seed');
  }
  const [result, data] = await withdraw(keypairs, ctx.vals.amount, ctx.vals.address, ctx.vals.dtag);
  const payload = { success: result };
  if (!result) {
    payload.error = data;
  } else {
    payload.txid = data;
  }
  busy.set(false);
  ctx.body = payload;
});
app.use(router.routes());
app.use(router.allowedMethods());
module.exports = app;