import { it, expect } from "vitest";
import { evidenceQuery, evidencePayloadSchema } from "../../lib/contracts/evidence";
import { strictEvidenceQuery } from "../../lib/contracts/evidence-query";
import { parseMetadata } from "../../lib/contracts/metadata";
it("E01 accepts bounded cursor pagination and rejects arbitrary client evidence fields", () => {
  expect(evidenceQuery.parse({cursor:"2147483647",limit:"100"})).toEqual({cursor:"2147483647",limit:100});
  for(const input of [{cursor:"0"},{cursor:"-1"},{cursor:"2147483648"},{limit:"101"},{limit:"0"},{actorId:"spoof"}])expect(evidenceQuery.safeParse(input).success).toBe(false);
});
it("E01 payload is strict and keeps prompt exclusively in the job input", () => {
  const payload={schemaVersion:1,kind:"generate.requested",actorType:"user",guide:null};
  expect(parseMetadata(evidencePayloadSchema,payload)).toEqual(payload);
  for(const extra of [{prompt:"private"},{actorId:"client"},{at:"client"},{resultCount:3}])expect(()=>parseMetadata(evidencePayloadSchema,{...payload,...extra})).toThrow();
});
it("E01 enforces UTF8 64KiB on full verification evidence before parsing", () => {
  expect(()=>parseMetadata(evidencePayloadSchema,{schemaVersion:1,kind:"verify.run",actorType:"worker",verification:{ruleResults:Array.from({length:200},()=>({reason:"漢".repeat(500)}))}})).toThrow("METADATA_TOO_LARGE");
});
it("E01 refuses fabricated success, arbitrary codes, and collapsed verification verdicts", () => {
  for(const payload of [{schemaVersion:1,kind:"generate.run",actorType:"user"},{schemaVersion:1,kind:"generate.succeeded",actorType:"worker",resultCount:-1},{schemaVersion:1,kind:"generate.failed",actorType:"worker",errorCode:"private"}])expect(evidencePayloadSchema.safeParse(payload).success).toBe(false);
});

it("E01 query accepts only decimal strings and refuses duplicate keys", () => {
 for (const limit of ["1e1", "0x10", " 5", "5 ", "5.0", "+7", "01", "0", "101", "", 5]) expect(evidenceQuery.safeParse({limit}).success).toBe(false);
 for (const limit of ["1", "99", "100"]) expect(evidenceQuery.parse({limit}).limit).toBe(Number(limit));
 expect(evidenceQuery.parse({}).limit).toBe(30);
 for (const q of ["limit=abc&limit=1", "limit=1&limit=abc", "cursor=1&cursor=2", "x=1&x=2"]) expect(()=>strictEvidenceQuery(new URLSearchParams(q))).toThrow();
});
