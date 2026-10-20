// Synthetic databases only, on the dedicated local test instance.
export function phase15DatabaseName(name: string) {
  if (name.length > 63 || !/^claps_test(?:_[a-z0-9]+)?$/.test(name)) throw Error("Unsafe synthetic database name");
  return name;
}
export function phase15DatabaseUrl(address: string | undefined) {
  if (!address) throw Error("TEST_DATABASE_URL required");
  const url = new URL(address);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || url.port !== "55437" || url.search || url.hash) throw Error("Dedicated local test instance required");
  phase15DatabaseName(url.pathname.slice(1));
  return url;
}
