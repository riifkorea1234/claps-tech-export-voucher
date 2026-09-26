import { it, expect } from "vitest";
import { demoPartners, demoCriteria } from "../../lib/server/demo/data";
import { scoreMatches } from "../../lib/server/matching/engine";
import { matchingCriteriaSchema } from "../../lib/contracts/matching-data";
it('reviews bilingual fictional profiles without unverifiable contacts and ranks the relevant category',()=>{
 expect(demoPartners).toHaveLength(6);
 for(const p of demoPartners){expect(p.ko).toMatch(/^샘플/);expect(p.en).toMatch(/^Sample/);expect(p.koDescription).toContain('가상');expect(p.enDescription).toContain('Fictional');expect(p.tags.length).toBeGreaterThan(3);}
 const candidates=demoPartners.map(p=>({id:p.key,version:1,name:p.ko,description:p.koDescription,tags:[...p.tags],ipNames:[],marketDescription:p.marketKo}));
 const result=scoreMatches({revision:1,engineVersion:'rules-v1',criteria:matchingCriteriaSchema.parse({worldView:demoCriteria.worldView,industries:demoCriteria.industries}),candidates});
 expect(result.results[0]).toMatchObject({partnerId:'stationery',score:100});
 const sport=scoreMatches({revision:1,engineVersion:'rules-v1',criteria:matchingCriteriaSchema.parse({worldView:'스포츠 sport',industries:['의류','apparel']}),candidates});
 expect(sport.results[0]).toMatchObject({partnerId:'apparel',score:100});
});
