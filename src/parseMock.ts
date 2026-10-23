import { supabase } from './supabase';
import type { SectionScore } from './types';

export interface ParsedMock {
  name: string | null;
  overall: SectionScore;
  varc: SectionScore;
  dilr: SectionScore;
  qa: SectionScore;
}

/** Downscale to ≤1600px JPEG so uploads stay small and fast on mobile data. */
export async function downscale(file: File, max = 1600, quality = 0.85): Promise<{ b64: string; mediaType: string }> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', quality);
  return { b64: url.split(',')[1], mediaType: 'image/jpeg' };
}

export async function parseMockImage(file: File): Promise<ParsedMock> {
  const { b64, mediaType } = await downscale(file);
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  const r = await fetch('/api/parse-mock', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ image: b64, mediaType })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? 'Could not read the screenshot. Enter the numbers manually.');
  return j as ParsedMock;
}
