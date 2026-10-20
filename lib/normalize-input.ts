// Apply only to approved human name, organization and search fields.
// Avoid broad NFKC: passwords, tokens, emails, URLs and prompts stay untouched.
export function normalizeInput(value: string) {
  return value.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s\u3000]+/g, " ").trim();
}
export function normalizeKana(value: string) {
  return normalizeInput(value).replace(/[\uFF61-\uFF9F]+/g, (kana) => kana.normalize("NFKC")).normalize("NFC");
}

export function validSplitName(familyName: string, givenName: string) {
  const family = normalizeInput(familyName), given = normalizeInput(givenName);
  return !!family && !!given && `${family} ${given}`.length <= 100;
}
