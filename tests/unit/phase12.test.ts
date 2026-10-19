import { expect, it, vi, afterEach } from "vitest";
import { normalizeInput, normalizeKana } from "../../lib/normalize-input";
import { profileSchema, validateProfile, passwordSchema } from "../../lib/server/auth/policy";
import { apiRequest } from "../../lib/api/client";
import { accountRequest } from "../../lib/account-store";
import { errorMessages } from "../../lib/contracts/errors";
import { requestContext, errorResponse, AppError } from "../../lib/server/errors/http";
import { adminQuery } from "../../lib/contracts/admin";
import { listQuery } from "../../lib/contracts/workspace";
import { z } from "zod";
afterEach(() => vi.unstubAllGlobals());
it("L05 normalizes only allowed widths/spaces, preserving compatibility symbols and Japanese names", () => {
 expect(normalizeInput("　山田　 ＡＢＣ１２３  ①㍿髙﨑　")).toBe("山田 ABC123 ①㍿髙﨑");
 expect(normalizeKana(" ﾔﾏﾀﾞ　ｶﾞｸ ")).toBe("ヤマダ ガク");
 expect(normalizeInput("ｶﾞ！＠")).toBe("ｶﾞ！＠");
 expect(passwordSchema.parse("ＡＢＣ１２３４５")).toBe("ＡＢＣ１２３４５");
});
it("L05 strict profile rejects injection, requires ja names and permits optional kana", () => {
 const parsed=profileSchema.parse({name:"",org:" Ａ社　", familyName:"　山田　",givenName:" 太郎 ",familyNameKana:"ﾔﾏﾀﾞ"});
 expect(validateProfile(parsed,"ja")).toMatchObject({org:"A社",familyName:"山田",givenName:"太郎",familyNameKana:"ヤマダ"});
 expect(()=>validateProfile(profileSchema.parse({name:"Legacy",org:"Org"}),"ja")).toThrow();
 expect(()=>validateProfile(profileSchema.parse({name:"",org:"Org"}),"en")).toThrow();
 expect(()=>profileSchema.parse({name:"X",org:"Y",appRole:"admin"})).toThrow();
 expect(()=>validateProfile(profileSchema.parse({name:"",org:"Y",familyName:"x".repeat(60),givenName:"y".repeat(60)}),"ja")).toThrow();
});
it("L04 normalizes server search q while leaving unrelated values alone", () => {
 expect(listQuery.parse({q:"　ＡＢＣ  １２３　"}).q).toBe("ABC 123");
 expect(adminQuery.parse({q:"　ＡＢＣ　"}).q).toBe("ABC");
});
it("L02 synchronous ja errors remain available when deployment pack loading fails", () => {
 const ctx=requestContext(new Request("http://localhost/api/me",{headers:{"X-Claps-Locale":"ja-JP"}}));
 expect(ctx.locale).toBe("ja");
 const response=errorResponse(new AppError("SERVICE_UNAVAILABLE"),ctx);
 expect(response.status).toBe(503);
 return expect(response.json()).resolves.toMatchObject({error:{message:errorMessages.ja.SERVICE_UNAVAILABLE}});
});
it("L02 API network fallback derives html locale and explicit locale wins", async () => {
 vi.stubGlobal("document",{documentElement:{lang:"ja"}});
 vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("secret")));
 await expect(apiRequest("/api/me",{schema:z.unknown()})).rejects.toMatchObject({message:errorMessages.ja.SERVICE_UNAVAILABLE});
 await expect(apiRequest("/api/me",{schema:z.unknown(),locale:"en"})).rejects.toMatchObject({message:errorMessages.en.SERVICE_UNAVAILABLE});
 await expect(accountRequest("/api/me")).rejects.toThrow(errorMessages.ja.SERVICE_UNAVAILABLE);
});
it("L02 malformed success and error envelopes use Japanese bundled fallback", async () => {
 vi.stubGlobal("document",{documentElement:{lang:"ja"}});
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({unexpected:true})));
 await expect(apiRequest("/api/me",{schema:z.strictObject({id:z.string()})})).rejects.toMatchObject({message:errorMessages.ja.INTERNAL_ERROR});
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({unexpected:true},{status:502})));
 await expect(apiRequest("/api/me",{schema:z.unknown()})).rejects.toMatchObject({message:errorMessages.ja.INTERNAL_ERROR});
});
it("L05 account DTO is strict and preserves nullable split names",async()=>{
 const {accountSchema}=await import("../../lib/contracts/account");
 const dto={id:"fixture",email:"fixture@example.test",name:"Name",org:"Org",status:"active",familyName:null,givenName:null,familyNameKana:null,givenNameKana:null};
 expect(accountSchema.parse(dto)).toEqual(dto);expect(()=>accountSchema.parse({...dto,token:"private"})).toThrow();
});

it("n1 combined Japanese name length errors map to visible split fields", () => {
 const parsed=profileSchema.parse({name:"",org:"Org",familyName:"山".repeat(50),givenName:"田".repeat(50)});
 try { validateProfile(parsed,"ja");throw Error("Expected length validation"); } catch(error) {
  expect(error).toBeInstanceOf(z.ZodError);
  expect((error as z.ZodError).issues.map(issue=>issue.path[0])).toEqual(["familyName","givenName"]);
 }
});
