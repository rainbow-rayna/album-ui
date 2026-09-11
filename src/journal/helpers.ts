export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function dataUrlToParts(dataUrl: string): { mimeType: string; base64: string } | null {
  const m = /^data:(.*?);base64,(.*)$/.exec(dataUrl || '');
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  const parts = dataUrlToParts(dataUrl);
  if (!parts) return null;
  const byteChars = atob(parts.base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: parts.mimeType });
}

// Walks an arbitrary JSON object looking for an inline base64 image block
// (shape not hard-guaranteed by the Gemini Interactions API docs at time of writing,
// so we search rather than assume one exact path).
export function findInlineImage(node: unknown, depth: number): { mimeType: string; base64: string } | null {
  if (!node || depth > 8) return null;
  if (typeof node === 'object') {
    if (!Array.isArray(node)) {
      const obj = node as Record<string, unknown>;
      const mime = (obj.mime_type ?? obj.mimeType) as string | undefined;
      const data = obj.data;
      if (typeof data === 'string' && data.length > 100 && typeof mime === 'string' && mime.indexOf('image/') === 0) {
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
