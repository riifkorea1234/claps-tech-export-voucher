import { test, expect } from 'vitest';
import { phase17DatabaseUrl, statistics, phase17Config, roleNames } from '../../scripts/phase17-config';
test('standard and independently named synthetic DBs pass without IO; unsafe URLs fail before connection',()=>{
 for(const n of ['claps_test','claps_test_fix17','claps_test_review17']) expect(phase17DatabaseUrl('postgresql://u:p@127.0.0.1:55437/'+n).pathname).toBe('/'+n);
 for(const u of [undefined,'invalid','postgresql://u:p@remote:55437/claps_test','postgresql://u:p@127.0.0.1:5432/claps_test','postgresql://u:p@127.0.0.1:55437/claps_product','postgresql://u:p@127.0.0.1:55437/claps_test?x=1']) expect(()=>phase17DatabaseUrl(u)).toThrow();
});
test('nearest rank p95 uses sample 19 of 20, maximum of four, boundaries and never mutates input',()=>{
 const input=Array.from({length:20},(_,i)=>20-i);expect(statistics(input)).toEqual({n:20,p50:10,p95:19,max:20});expect(input[0]).toBe(20);
 expect(statistics([4,1,3,2]).p95).toBe(4);expect(statistics([7])).toEqual({n:1,p50:7,p95:7,max:7});expect(statistics([]).p95).toBe(null);expect(()=>statistics([NaN])).toThrow();
});
test('missing configuration and non-owned output or role names fail closed before mkdir or DB mutation',()=>{
 expect(()=>phase17Config({})).toThrow();expect(()=>roleNames({PHASE17_ROLE_PREFIX:'postgres',PHASE17_ROLE_DATABASE:'claps_test_fix17x'})).toThrow();
 expect(()=>phase17Config({TEST_DATABASE_URL:'postgresql://u:p@127.0.0.1:55437/claps_test',PHASE17_RUN_DIR:'/tmp',PHASE17_OUTPUT_DIR:'/mnt/f/claps-product/md/evidence/phase17',PHASE17_FIXTURE:'/tmp/f.json'})).toThrow();
});
