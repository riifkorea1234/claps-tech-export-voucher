import { it, expect } from 'vitest';
import { monitoringResultSchema, monitoringGrade, type MonitoringItem } from '../../lib/contracts/monitoring-result';
import { resultIndexSchema, feedbackReportSchema, feedbackWithdrawSchema } from '../../lib/contracts/monitoring-feedback';
import { jobOutputSchema, parseMetadata } from '../../lib/contracts/metadata';
const factors={provider:'test engine',engineVersion:'v1',meaning:'similarity_percent' as const,character:0,color:null,composition:100};
const item:MonitoringItem={url:'https://public.com/a',source:'test',similarity:80,discoveredAt:'2026-10-01T00:00:00Z',factors};
const result={state:'results',sources:[{name:'test',status:'succeeded'}],items:[item]};
it('M01 reference 80/90 boundaries, zero, null and absent evidence never invent scores',()=>{
 for(const [score,grade] of [[0,'low'],[79.99,'low'],[80,'review'],[89.99,'review'],[90,'high'],[100,'high'],[null,'unknown']] as const)expect(monitoringGrade({...item,similarity:score})).toBe(grade);
 expect(monitoringGrade({...item,factors:undefined})).toBe('unknown');expect(monitoringGrade({...item,factors:{provider:'test',engineVersion:'v1',meaning:'similarity_percent',character:null}})).toBe('unknown');
});
it('M01 optional bounded provenance factors allow null/partial/zero and reject untrusted fields',()=>{
 expect(monitoringResultSchema.parse(result).items[0].factors).toEqual(factors);
 for(const values of [{character:-1},{logo:101},{provider:''},{engineVersion:''},{meaning:'infringement'},{character:Infinity},{unknown:1}])expect(monitoringResultSchema.safeParse({...result,items:[{...item,factors:{...factors,...values}}]}).success).toBe(false);
 const old={...item};delete old.factors;expect(monitoringResultSchema.parse({...result,items:[old]}).items[0].factors).toBeUndefined();
});
it('M01 schemaVersion1, source10/result50 and whole-output64KiB contract retained',()=>{
 const output={schemaVersion:1,kind:'monitoring',recordId:'test',result};expect(parseMetadata(jobOutputSchema,output).schemaVersion).toBe(1);
 expect(jobOutputSchema.safeParse({...output,schemaVersion:2}).success).toBe(false);
 expect(monitoringResultSchema.safeParse({...result,sources:Array.from({length:11},(_,i)=>({name:'s'+i,status:'succeeded'}))}).success).toBe(false);
 const items=Array.from({length:50},(_,i)=>({...item,url:'https://public.com/'+i}));expect(monitoringResultSchema.parse({...result,items}).items).toHaveLength(50);expect(monitoringResultSchema.safeParse({...result,items:[...items,{...item,url:'https://public.com/51'}]}).success).toBe(false);
 expect(()=>parseMetadata(jobOutputSchema,{...output,result:{...result,items:items.map((i,n)=>({...i,url:'https://public.com/'+String(n).padEnd(1800,'x')}))}})).toThrow();
});
it('M02 canonical path0..49, reason enum and action-specific strict bodies',()=>{
 for(const v of ['0','9','10','49'])expect(resultIndexSchema.parse(v)).toBe(Number(v));
 for(const v of ['50','-1','00','1.0','1e1','job:0',' 0',''])expect(resultIndexSchema.safeParse(v).success).toBe(false);
 expect(feedbackReportSchema.parse({reason:'licensed_use',idempotencyKey:'valid_key-1'}).reason).toBe('licensed_use');
 for(const body of [{reason:'private free text',idempotencyKey:'key'},{reason:'other',idempotencyKey:'x'.repeat(129)},{reason:'other',idempotencyKey:'a b'},{reason:'other',idempotencyKey:'a',reported:true}])expect(feedbackReportSchema.safeParse(body).success).toBe(false);
 expect(feedbackWithdrawSchema.safeParse({idempotencyKey:'key',reason:'other'}).success).toBe(false);
});

it('M1 attempt keys follow the server sequence, preserving only unresolved snapshot retries',async()=>{
 const {feedbackAttempt}=await import('../../lib/monitoring-view');let keys=0;const key=()=>String(++keys);
 const report=feedbackAttempt(null,'POST','other',0,key);
 expect(feedbackAttempt(report,'POST','other',0,key)).toBe(report);
 expect(feedbackAttempt(report,'POST','other',2,key).key).not.toBe(report.key);
 expect(feedbackAttempt(report,'POST','licensed_use',0,key).key).not.toBe(report.key);
 const withdraw=feedbackAttempt(null,'DELETE','other',1,key);
 expect(feedbackAttempt(withdraw,'DELETE','other',1,key)).toBe(withdraw);
 expect(feedbackAttempt(withdraw,'DELETE','other',3,key).key).not.toBe(withdraw.key);
});
it('n1 one decimal display leaves raw 80/90 grade boundaries and stored precision unchanged',async()=>{
 const {formatMonitoringPercent}=await import('../../lib/monitoring-view');
 for(const locale of ['ko','en','ja']){expect(formatMonitoringPercent(33.3333333,locale)).toBe('33.3%');expect(formatMonitoringPercent(0,locale)).toBe('0%');expect(formatMonitoringPercent(100,locale)).toBe('100%');}
 expect(formatMonitoringPercent(33.3333333,'de')).toBe('33,3%');
 expect(monitoringGrade({...item,similarity:79.9999})).toBe('low');expect(monitoringGrade({...item,similarity:89.9999})).toBe('review');expect(item.similarity).toBe(80);
});
it('m1 safe test database guard accepts fix/review names and rejects production/network/SQL targets',async()=>{
 const {phase15DatabaseUrl,phase15DatabaseName}=await import('../../scripts/phase15-db-guard');
 for(const name of ['claps_test','claps_test_fix15','claps_test_review15'])expect(phase15DatabaseUrl('postgres://127.0.0.1:55437/'+name).pathname).toBe('/'+name);
 for(const name of ['claps_product','claps_test_','claps_test_BAD','claps_test_x;drop','claps_test_x/y'])expect(()=>phase15DatabaseName(name)).toThrow();
 for(const url of [undefined,'postgres://remote:55437/claps_test_fix15','postgres://127.0.0.1:55433/claps_test_fix15','postgres://127.0.0.1:55437/claps_test_fix15?x=y','https://127.0.0.1:55437/claps_test_fix15'])expect(()=>phase15DatabaseUrl(url)).toThrow();
});
