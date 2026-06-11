type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? 1;

function log(level: LogLevel, msg: string, data?: Record<string, any>) {
  if (LEVELS[level] < currentLevel) return;
  const ts = new Date().toISOString();
  const entry = { level, ts, msg, ...data };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

const logger = {
  debug: (msg: string, data?: Record<string, any>) => log('debug', msg, data),
  info: (msg: string, data?: Record<string, any>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, any>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, any>) => log('error', msg, data),
  child: (bindings: Record<string, any>) => ({
    debug: (msg: string, extra?: Record<string, any>) => log('debug', msg, { ...bindings, ...extra }),
    info: (msg: string, extra?: Record<string, any>) => log('info', msg, { ...bindings, ...extra }),
    warn: (msg: string, extra?: Record<string, any>) => log('warn', msg, { ...bindings, ...extra }),
    error: (msg: string, extra?: Record<string, any>) => log('error', msg, { ...bindings, ...extra }),
  }),
};

export default logger;
