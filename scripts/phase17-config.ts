// Only explicitly configured synthetic local runs; preflight performs no IO mutation.
import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { phase15DatabaseUrl, phase15DatabaseName } from './phase15-db-guard';
export { phase15DatabaseUrl as phase17DatabaseUrl };
export function privatePath(value: string | undefined, root: string) {
 if (!value || !isAbsolute(value) || resolve(value) !== value || !value.startsWith(root + '/')) throw Error('Explicit own private path required');
 let p = value;
 while (!existsSync(p)) p = dirname(p);
 if (lstatSync(p).isSymbolicLink() || realpathSync(p) !== p) throw Error('Symlink path rejected');
 return value;
}
export function phase17Config(env: Record<string,string|undefined> = process.env) {
 const url = phase15DatabaseUrl(env.TEST_DATABASE_URL);
 const root = env.PHASE17_RUN_DIR;
 if (!root || !/^\/tmp\/claps-phase17-[a-z0-9-]+$/.test(root) || !existsSync(root) || realpathSync(root) !== root) throw Error('Existing own PHASE17_RUN_DIR required');
 const output = privatePath(env.PHASE17_OUTPUT_DIR, root), fixture = privatePath(env.PHASE17_FIXTURE, root);
 const origin = new URL(env.APP_ORIGIN ?? '');
 if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || !/^33[0-9]{2}$/.test(origin.port) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw Error('Own local test origin required');
 return { url, root, output, fixture, origin: origin.origin };
}
export function roleNames(env: Record<string,string|undefined> = process.env) {
 const prefix = env.PHASE17_ROLE_PREFIX, db = env.PHASE17_ROLE_DATABASE;
 if (!prefix || !/^claps_fix17[a-z0-9]+$/.test(prefix) || prefix.length > 45 || !db) throw Error('Explicit unused synthetic role prefix/database required');
 phase15DatabaseName(db);
 if (!/^claps_test_fix17[a-z0-9]+$/.test(db)) throw Error('Own unused role database required');
 return { roles: ['migrator','app','reader'].map(s => prefix + '_' + s), db };
}
export function statistics(values: number[]) {
 if (!values.length) return { n: 0, p50: null, p95: null, max: null };
 if (values.some(v => !Number.isFinite(v))) throw Error('Finite samples required');
 const sorted = [...values].sort((a,b) => a-b);
 return { n: sorted.length, p50: sorted[Math.ceil(.5*sorted.length)-1], p95: sorted[Math.ceil(.95*sorted.length)-1], max: sorted.at(-1)! };
}
