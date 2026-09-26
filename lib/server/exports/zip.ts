import "server-only";
import { crc32 } from "node:zlib";
import { MAX_EXPORT_BYTES, MAX_EXPORT_FILES } from "../../contracts/exports";
// ZIP32 STORE: image files are already compressed. Names are generated ASCII, never user paths.
export function createZip(entries: { name: string; bytes: Buffer }[]) {
  if (!entries.length || entries.length > MAX_EXPORT_FILES || new Set(entries.map(e => e.name)).size !== entries.length || entries.reduce((n, e) => n + e.bytes.length, 0) > MAX_EXPORT_BYTES) throw new Error("ZIP_LIMIT");
  const local: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const entry of entries) {
    if (!/^[A-Za-z0-9_-]+\.(png|jpg|webp)$/.test(entry.name) || entry.name.length > 150) throw new Error("ZIP_NAME");
    const name = Buffer.from(entry.name), crc = crc32(entry.bytes), size = entry.bytes.length;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(33, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(size, 18); h.writeUInt32LE(size, 22); h.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(33, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(size, 20); c.writeUInt32LE(size, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    local.push(h, name, entry.bytes); central.push(c, name); offset += h.length + name.length + size;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
