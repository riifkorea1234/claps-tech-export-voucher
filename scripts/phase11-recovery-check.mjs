// Synthetic recovery smoke; create the fixture with PHASE11_KEEP_RECOVERY_FIXTURE=1.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.CHECK_ORIGIN || 'http://127.0.0.1:3191';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local isolated origin required');
const fixture = JSON.parse(await readFile('/tmp/claps-p11-fixture.json', 'utf8'));
const state = JSON.parse(await readFile('/tmp/claps-p11-state.json', 'utf8'));
const Cookie = state.cookies.map(c => `${c.name}=${c.value}`).join('; ');
const get = async path => { const r = await fetch(base + path, { headers: { Cookie, 'X-Claps-Locale': 'en-GB' } }); assert.equal(r.status, 200, path); return r; };
assert.equal((await (await get('/api/health')).json()).data.status, 'ok');
assert.equal((await (await get('/api/me')).json()).data.locale, 'en-GB');
assert.equal((await (await get(`/api/partners/${fixture.partnerId}`)).json()).data.name, process.env.EXPECT_CONTENT_NAME || 'P11 published translation');
assert.deepEqual(Buffer.from(await (await get(`/api/monitoring-records/${fixture.recordId}/image`)).arrayBuffer()), Buffer.from(fixture.png, 'base64'));
const html = await (await get('/monitoring')).text();
assert.ok(html.includes(`lang="${process.env.EXPECT_LOCALE || 'en-GB'}"`));
console.log(JSON.stringify({ health: true, sessionPreference: true, contentResponseMatchesExpected: true, originalChecksum: true, ssrLocale: process.env.EXPECT_LOCALE || 'en-GB' }));
