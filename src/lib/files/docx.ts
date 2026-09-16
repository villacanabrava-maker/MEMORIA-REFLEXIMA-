import { inflateRawSync } from "node:zlib";
import { MAX_CONTENT, MAX_TITLE, characterCount, type SourceInput } from "@/lib/sources/validation";

export const MAX_DOCX_PROCESS_BYTES = 8_000_000;
const MAX_DOCX_XML_BYTES = 4_000_000;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

type DocxResult =
  | { ok: true; value: SourceInput }
  | { ok: false; code: "invalid" | "too_large" | "empty"; message: string };

function readU16(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 2 > bytes.byteLength) throw new Error("bounds");
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 4 > bytes.byteLength) throw new Error("bounds");
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function findEocd(bytes: Uint8Array): number {
  const minimum = 22;
  if (bytes.byteLength < minimum) return -1;
  const start = Math.max(0, bytes.byteLength - 65_557);
  for (let offset = bytes.byteLength - minimum; offset >= start; offset -= 1) {
    if (readU32(bytes, offset) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (entity) => {
    if (entity === "&amp;") return "&";
    if (entity === "&lt;") return "<";
    if (entity === "&gt;") return ">";
    if (entity === "&quot;") return '"';
    if (entity === "&apos;") return "'";
    const hex = /^&#x([0-9a-f]+);$/i.exec(entity);
    const dec = /^&#(\d+);$/.exec(entity);
    const code = hex ? Number.parseInt(hex[1], 16) : dec ? Number.parseInt(dec[1], 10) : -1;
    if (!Number.isSafeInteger(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return "�";
    return String.fromCodePoint(code);
  });
}

function documentXmlToText(xml: string): string {
  const withLayout = xml
    .replace(/<w:tab\b[^>]*\/>/gi, "\t")
    .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, "\n")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<\/w:tr>/gi, "\n");
  const withoutTags = withLayout.replace(/<[^>]+>/g, "");
  return decodeXmlEntities(withoutTags)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractDocumentXml(bytes: Uint8Array): Uint8Array {
  const eocd = findEocd(bytes);
  if (eocd < 0) throw new Error("eocd");
  const entryCount = readU16(bytes, eocd + 10);
  const centralSize = readU32(bytes, eocd + 12);
  const centralOffset = readU32(bytes, eocd + 16);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error("zip64");
  if (centralOffset + centralSize > bytes.byteLength) throw new Error("central-bounds");

  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (readU32(bytes, cursor) !== CENTRAL_SIGNATURE) throw new Error("central-signature");
    const flags = readU16(bytes, cursor + 8);
    const method = readU16(bytes, cursor + 10);
    const compressedSize = readU32(bytes, cursor + 20);
    const uncompressedSize = readU32(bytes, cursor + 24);
    const nameLength = readU16(bytes, cursor + 28);
    const extraLength = readU16(bytes, cursor + 30);
    const commentLength = readU16(bytes, cursor + 32);
    const localOffset = readU32(bytes, cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.byteLength) throw new Error("name-bounds");
    const filename = new TextDecoder("utf-8").decode(bytes.subarray(nameStart, nameEnd));

    if (filename === "word/document.xml") {
      if ((flags & 0x1) !== 0) throw new Error("encrypted");
      if (uncompressedSize > MAX_DOCX_XML_BYTES || compressedSize > MAX_DOCX_PROCESS_BYTES) throw new Error("xml-too-large");
      if (readU32(bytes, localOffset) !== LOCAL_SIGNATURE) throw new Error("local-signature");
      const localNameLength = readU16(bytes, localOffset + 26);
      const localExtraLength = readU16(bytes, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataStart < 0 || dataEnd > bytes.byteLength) throw new Error("data-bounds");
      const compressed = bytes.subarray(dataStart, dataEnd);
      if (method === 0) return compressed.slice();
      if (method === 8) {
        const inflated = inflateRawSync(compressed, { maxOutputLength: MAX_DOCX_XML_BYTES });
        if (inflated.byteLength !== uncompressedSize) throw new Error("size-mismatch");
        return new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.byteLength);
      }
      throw new Error("compression");
    }

    cursor = nameEnd + extraLength + commentLength;
    if (cursor > centralOffset + centralSize) throw new Error("central-overflow");
  }
  throw new Error("missing-document");
}

export function extractDocxText(name: string, bytes: Uint8Array): DocxResult {
  if (!/\.docx$/i.test(name)) return { ok: false, code: "invalid", message: "Este arquivo não é um DOCX reconhecido." };
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_DOCX_PROCESS_BYTES) {
    return { ok: false, code: "too_large", message: "Para visualizar DOCX, o arquivo precisa ter até 8 MB. O original continua preservado." };
  }
  try {
    const xmlBytes = extractDocumentXml(bytes);
    const xml = new TextDecoder("utf-8", { fatal: true }).decode(xmlBytes);
    const content = documentXmlToText(xml);
    if (!content) return { ok: false, code: "empty", message: "O DOCX não contém texto principal que possa ser exibido." };
    if (characterCount(content) > MAX_CONTENT) {
      return { ok: false, code: "too_large", message: "O texto deste DOCX ultrapassa 100.000 caracteres. O original continua preservado sem cortes." };
    }
    const stem = name.replace(/\.docx$/i, "").trim();
    const title = Array.from(stem || "Documento Word").slice(0, MAX_TITLE).join("");
    return { ok: true, value: { title, content } };
  } catch (error) {
    if (error instanceof Error && (error.message === "xml-too-large" || error.message.includes("maxOutputLength"))) {
      return { ok: false, code: "too_large", message: "O conteúdo interno deste DOCX é grande demais para leitura segura. O original continua preservado." };
    }
    return { ok: false, code: "invalid", message: "Não foi possível ler este DOCX com segurança. O original continua preservado e disponível para download." };
  }
}
