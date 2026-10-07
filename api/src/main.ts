import { pino } from 'pino';
import { acmePricingRules } from './acme-widget-co.ts';
import { HttpApi } from './http/http-api.ts';
import { createApiServer } from './http/server.ts';

const log = pino();
const port = Number(process.env['PORT'] ?? 8000);

const server = createApiServer(new HttpApi(acmePricingRules()), log);

server.listen(port, () => log.info({ port }, 'basket API listening'));

function shutDown(signal: NodeJS.Signals): void {
  log.info({ signal }, 'shutting down');
  server.close((err) => {
    if (err) log.error({ err }, 'server did not close cleanly');
    process.exit(err ? 1 : 0);
  });
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

for (const event of ['unhandledRejection', 'uncaughtException'] as const) {
  process.on(event, (err: unknown) => {
    log.fatal({ err }, event);
    process.exit(1);
  });
}
