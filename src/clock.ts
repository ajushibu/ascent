import { supabase } from './supabase';

/**
 * Timer maths must not depend on how right a particular device's clock is: the start time is written by one device
 * and read by others. We measure each device's offset from the database's clock (half a round trip is the error,
 * well under a second) and use now() everywhere the timer needs the time. Without a backend the offset is 0.
 */
let offset = 0;
let bestRtt = Infinity;
let last = 0;

export const now = () => Date.now() + offset;

export async function syncClock(force = false): Promise<void> {
  if (!supabase) return;
  if (!force && Date.now() - last < 60_000) return;
  last = Date.now();
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc('server_time');
    const t1 = Date.now();
    const ms = Number(data);
    if (error || !Number.isFinite(ms)) return;
    const rtt = t1 - t0;
    if (rtt <= Math.max(bestRtt * 2, 800)) {
      offset = ms - (t0 + t1) / 2;
      bestRtt = Math.min(bestRtt, rtt);
    }
  } catch {
    /* offline or function missing: keep using the device clock */
  }
}
