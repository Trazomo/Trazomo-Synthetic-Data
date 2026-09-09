// A minimal reader for a ZIP written with STORED (uncompressed) entries, which
// is the only shape the REV-10 deck template is allowed to take: no deflate in
// the write path means no zlib-version variance in the committed bytes.
//
// It is deliberately strict rather than forgiving. A real unzip recovers from a
// missing central directory, a data descriptor or a mismatched local header,
// and recovering is exactly the wrong behavior here: the point of the check is
// that the generator wrote a well-formed archive, so anything the reader has to
// paper over is a finding. Every structural expectation below throws with the
// entry it failed on.
//
// CRC32 is recomputed for every entry, by an implementation that is not the
// generator's. The generator builds the standard reflected table once and runs
// bytes through it; this file prefers Node's own `zlib.crc32` where the runtime
// has it (20.15+, 22+) and otherwise falls back to a bit-at-a-time reference
// loop. A table transcribed wrong in the generator therefore fails here instead
// of agreeing with itself.
import zlib from "node:zlib";

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;
const STORED = 0;

/**
 * @param {Buffer} buffer the whole archive
 * @returns {{entries: Entry[], byPath: Map<string, Entry>, comment: Buffer}}
 *
 * @typedef {object} Entry
 * @property {string} path entry name, as written
 * @property {Buffer} data the stored bytes
 * @property {string} text the same bytes decoded as UTF-8
 * @property {number} method compression method (0 for stored)
 * @property {number} crc32 the CRC the archive states, already verified
 * @property {number} size uncompressed size
 * @property {number} compressedSize
 * @property {number} dosTime
 * @property {number} dosDate
 * @property {number} offset local header offset
 */
export function readStoredZip(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error("readStoredZip: expected a Buffer");
  const end = findEndOfCentralDirectory(buffer);

  const total = buffer.readUInt16LE(end + 10);
  const onThisDisk = buffer.readUInt16LE(end + 8);
  if (total !== onThisDisk) throw new Error(`readStoredZip: the archive spans disks (${onThisDisk} of ${total})`);
  const centralSize = buffer.readUInt32LE(end + 12);
  const centralOffset = buffer.readUInt32LE(end + 16);
  const commentLength = buffer.readUInt16LE(end + 20);
  if (end + 22 + commentLength !== buffer.length) {
    throw new Error("readStoredZip: trailing bytes after the end-of-central-directory record");
  }

  const entries = [];
  let cursor = centralOffset;
  for (let i = 0; i < total; i++) {
    if (buffer.readUInt32LE(cursor) !== CENTRAL_SIG) {
      throw new Error(`readStoredZip: central directory entry ${i} carries no header signature`);
    }
    const method = buffer.readUInt16LE(cursor + 10);
    const dosTime = buffer.readUInt16LE(cursor + 12);
    const dosDate = buffer.readUInt16LE(cursor + 14);
    const crc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const size = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLen = buffer.readUInt16LE(cursor + 32);
    const offset = buffer.readUInt32LE(cursor + 42);
    const path = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);

    const data = readLocalEntry(buffer, {
      path, offset, method, crc, compressedSize, size, dosTime, dosDate,
    });
    entries.push({ path, data, text: data.toString("utf8"), method, crc32: crc, size, compressedSize, dosTime, dosDate, offset });
    cursor += 46 + nameLength + extraLength + commentLen;
  }
  if (cursor !== centralOffset + centralSize) {
    throw new Error(`readStoredZip: the central directory is ${cursor - centralOffset} bytes, not the stated ${centralSize}`);
  }

  const byPath = new Map();
  for (const entry of entries) {
    if (byPath.has(entry.path)) throw new Error(`readStoredZip: ${entry.path} appears twice`);
    byPath.set(entry.path, entry);
  }
  return { entries, byPath, comment: buffer.subarray(end + 22) };
}

/** The local header at `offset`, checked against what the central directory said. */
function readLocalEntry(buffer, expected) {
  const { path, offset } = expected;
  if (buffer.readUInt32LE(offset) !== LOCAL_SIG) {
    throw new Error(`readStoredZip: ${path} has no local file header at offset ${offset}`);
  }
  const flags = buffer.readUInt16LE(offset + 6);
  // Bit 3 is the data-descriptor flag: sizes live after the data, not in the
  // header. A generator that sets it has stopped writing a fixed-layout archive.
  if (flags & 0x08) throw new Error(`readStoredZip: ${path} carries a data descriptor`);
  const method = buffer.readUInt16LE(offset + 8);
  if (method !== STORED) throw new Error(`readStoredZip: ${path} uses compression method ${method}, not stored`);
  if (method !== expected.method) {
    throw new Error(`readStoredZip: ${path} local method ${method} disagrees with the central directory's ${expected.method}`);
  }
  const dosTime = buffer.readUInt16LE(offset + 10);
  const dosDate = buffer.readUInt16LE(offset + 12);
  if (dosTime !== expected.dosTime || dosDate !== expected.dosDate) {
    throw new Error(`readStoredZip: ${path} local timestamp disagrees with the central directory`);
  }
  const crc = buffer.readUInt32LE(offset + 14);
  const compressedSize = buffer.readUInt32LE(offset + 18);
  const size = buffer.readUInt32LE(offset + 22);
  if (crc !== expected.crc || compressedSize !== expected.compressedSize || size !== expected.size) {
    throw new Error(`readStoredZip: ${path} local crc/size fields disagree with the central directory`);
  }
  if (compressedSize !== size) {
    throw new Error(`readStoredZip: ${path} is stored but its compressed size differs from its size`);
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const localName = buffer.toString("utf8", offset + 30, offset + 30 + nameLength);
  if (localName !== path) {
    throw new Error(`readStoredZip: local header names ${localName} where the central directory names ${path}`);
  }
  const start = offset + 30 + nameLength + extraLength;
  const data = buffer.subarray(start, start + size);
  if (data.length !== size) throw new Error(`readStoredZip: ${path} is truncated`);
  const actual = crc32(data);
  if (actual !== crc) {
    throw new Error(`readStoredZip: ${path} states crc ${hex(crc)} but its bytes compute ${hex(actual)}`);
  }
  return data;
}

/** The end-of-central-directory record, found the way an unzip finds it. */
function findEndOfCentralDirectory(buffer) {
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === END_SIG) return i;
  }
  throw new Error("readStoredZip: no end-of-central-directory record");
}

/**
 * CRC32 of `buffer`, from Node where it offers one and from a bit-at-a-time
 * reference loop where it does not. Never the generator's table.
 */
export function crc32(buffer) {
  if (typeof zlib.crc32 === "function") return zlib.crc32(buffer) >>> 0;
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const hex = (n) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;

/** A DOS date/time pair back to "YYYY-MM-DDTHH:MM:SS", so a test can pin it. */
export function dosStamp(dosDate, dosTime) {
  const pad = (n) => String(n).padStart(2, "0");
  const year = 1980 + ((dosDate >> 9) & 0x7f);
  const month = (dosDate >> 5) & 0x0f;
  const day = dosDate & 0x1f;
  const hour = (dosTime >> 11) & 0x1f;
  const minute = (dosTime >> 5) & 0x3f;
  const second = (dosTime & 0x1f) * 2;
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
}
