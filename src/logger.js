const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const { combine, timestamp, printf } = format;
const logFormat = printf(info => {
  return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
});
const rtransport = new transports.DailyRotateFile({
  filename: 'ripplet-%DATE%.log',
  dirname: './logs',
  datePattern: 'YYYY-ww',
  zippedArchive: true,
  maxSize: null,
  maxFiles: null,
  handleExceptions: true
});
const ctransport = new transports.Console();
const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD hh:mm:ssZZ' }),
    logFormat
  ),
  transports: [rtransport, ctransport],
  exitOnError: false
});
const wrap = {};
const workerId = process.env.NODE_APP_INSTANCE == undefined ? 0 : process.env.NODE_APP_INSTANCE;
wrap.info = (...args) => {
  args = args.map(a => typeof a !== 'string' ? JSON.stringify(a) : a);
  logger.info(`[WORKER ${workerId}]` + args.join(' '));
};
wrap.boxen = (args) => {
  logger.info(args);
};
wrap.error = (...args) => {
  args = args.map(a => typeof a !== 'string' ? JSON.stringify(a) : a);
  logger.error(`[WORKER ${workerId}]` + args.join(' '));
};
wrap.warn = (...args) => {
  args = args.map(a => typeof a !== 'string' ? JSON.stringify(a) : a);
  logger.warn(`[WORKER ${workerId}]` + args.join(' '));
};
module.exports = wrap;