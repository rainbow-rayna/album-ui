/**
 * Data-URL helpers, server-side.
 *
 * Photos arrive from the browser as `data:image/...;base64,...` strings inside
 * the request body, so the server has to take them apart again before handing
 * them to a provider. Ported from the browser-side helpers, with `Buffer`
 * replacing `atob`/`Uint8Array` for the blob conversion.
 */

export function dataUrlToParts(dataUrl: string): { mimeType: string; base64: string } | null {
  const m = /^data:(.*?);base64,(.*)$/.exec(dataUrl || "");
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

/** Node 18+ ships Blob/FormData globally, so OpenAI's multipart edits endpoint works unchanged. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const parts = dataUrlToParts(dataUrl);
  if (!parts) return null;
  return new Blob([Buffer.from(parts.base64, "base64")], { type: parts.mimeType });
}

// Walks an arbitrary JSON object looking for an inline base64 image block
// (shape not hard-guaranteed by the Gemini Interactions API docs at time of writing,
// so we search rather than assume one exact path).
export function findInlineImage(node: unknown, depth: number): { mimeType: string; base64: string } | null {
  if (!node || depth > 8) return null;
  if (typeof node === "object") {
    if (!Array.isArray(node)) {
      const obj = node as Record<string, unknown>;
      const mime = (obj.mime_type ?? obj.mimeType) as string | undefined;
      const data = obj.data;
      if (typeof data === "string" && data.length > 100 && typeof mime === "string" && mime.indexOf("image/") === 0) {
        return { mimeType: mime, base64: data };
      }
    }
    const items = Array.isArray(node) ? node : Object.values(node as Record<string, unknown>);
    for (const item of items) {
      const found = findInlineImage(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}
