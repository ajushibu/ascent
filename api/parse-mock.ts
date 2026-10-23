import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Reads a CAT mock scorecard screenshot and returns the numbers as JSON.
 * Requires a valid Supabase session (so only you can spend your API credit).
 */
const MODEL = 'claude-sonnet-5-5';
const MAX_B64 = 6_000_000; // ~4.5 MB of image

const PROMPT = `This is a screenshot or a photo of a CAT mock-test scorecard (it may be a photo of a laptop screen, so be careful with digits).
Extract the result and answer with ONE JSON object and nothing else:
{
  "name": string | null,            // mock / paper name if visible, e.g. "CAT 2025 Actual Paper Slot 1"
  "overall": { "score": number | null, "percentile": number | null },
  "varc":    { "score": number | null, "percentile": number | null },
  "dilr":    { "score": number | null, "percentile": number | null },
  "qa":      { "score": number | null, "percentile": number | null }
}
Rules: use null for anything you cannot read with confidence. "overall" is the TOTAL column. Scores can be negative or decimal. Percentiles are 0–100. Never guess.`;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const sec = (v: any) => ({ score: num(v?.score), percentile: num(v?.percentile) });

async function authorised(req: VercelRequest): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return false; // refuse to run unauthenticated in production
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: anon } });
  return r.ok;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server.' });
  if (!(await authorised(req))) return res.status(401).json({ error: 'Please sign in again.' });

  const { image, mediaType } = (req.body ?? {}) as { image?: string; mediaType?: string };
  if (!image || typeof image !== 'string' || image.length > MAX_B64) return res.status(400).json({ error: 'Image missing or too large.' });
  const mt = ['image/jpeg', 'image/png', 'image/webp'].includes(mediaType ?? '') ? mediaType! : 'image/jpeg';

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mt, data: image } }, { type: 'text', text: PROMPT }] }]
      })
    });
    if (!r.ok) return res.status(502).json({ error: `Reader failed (${r.status}). Enter the numbers manually.` });
    const data: any = await r.json();
    const text: string = (data.content ?? []).map((b: any) => b.text ?? '').join('');
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(422).json({ error: 'Could not read that image. Try a clearer screenshot or enter it manually.' });
    const j = JSON.parse(m[0]);
    return res.status(200).json({
      name: typeof j.name === 'string' ? j.name.slice(0, 80) : null,
      overall: sec(j.overall), varc: sec(j.varc), dilr: sec(j.dilr), qa: sec(j.qa)
    });
  } catch {
    return res.status(500).json({ error: 'Something went wrong reading the image. Enter the numbers manually.' });
  }
}
