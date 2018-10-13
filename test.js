const db = require('./src/db');
const start = async () => {
  
  await db.updateLedger(1);

  const m = await db.getLedger();
  console.log(m);
  await db.updateLedger(2);
  const n = await db.getLedger();
  console.log(n);
};

start().catch(console.error);