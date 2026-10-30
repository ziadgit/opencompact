import { Redis } from "@upstash/redis";

/**
 * Daily AI spend cap for the public app. Every model call reports its token usage here;
 * once the UTC day's total passes DAILY_LIMIT_USD the app drops to rules-only until midnight UTC.
 * The counter lives in Upstash Redis so all serverless instances share it. Without Redis
 * (local dev) it falls back to this process's memory.
 */

export const DAILY_LIMIT_USD = Number(process.env.DAILY_LIMIT_USD ?? 5);
export const RUNS_PER_IP = Number(process.env.RUNS_PER_IP ?? 20);

// Claude Haiku 5.5, $ per token. Prompts over 100K tokens use the higher rate card.
const RATES = {
  short: { input: 0.1e-6, output: 0.5e-6 },
  long: { input: 0.5e-6, output: 2.5e-6 },
};

export type Usage = { input: number; output: number; cacheRead?: number; cacheWrite?: number };

export function costOf(u: Usage): number {
  const prompt = u.input + (u.cacheRead ?? 0) + (u.cacheWrite ?? 0);
  const r = prompt > 100_000 ? RATES.long : RATES.short;
  return u.input * r.input + (u.cacheWrite ?? 0) * r.input * 1.25 + (u.cacheRead ?? 0) * r.input * 0.1 + u.output * r.output;
}

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const memory = new Map<string, number>();

const day = () => new Date().toISOString().slice(0, 10);
const TTL = 60 * 60 * 48;

async function incr(key: string, by: number): Promise<number> {
  if (!redis) {
    const next = (memory.get(key) ?? 0) + by;
    memory.set(key, next);
    return next;
  }
  const next = await redis.incrby(key, by);
  if (next === by) await redis.expire(key, TTL);
  return next;
}

async function read(key: string): Promise<number> {
  if (!redis) return memory.get(key) ?? 0;
  return Number((await redis.get<number>(key)) ?? 0);
}

/** Spend is stored in micro-dollars so Redis can use integer increments. */
export async function spentToday(): Promise<number> {
  try {
    return (await read(`spend:${day()}`)) / 1e6;
  } catch {
    return 0;
  }
}

export async function canSpend(): Promise<boolean> {
  return (await spentToday()) < DAILY_LIMIT_USD;
}

export async function recordUsage(u: Usage): Promise<void> {
  const micro = Math.ceil(costOf(u) * 1e6);
  if (micro <= 0) return;
  try {
    const total = await incr(`spend:${day()}`, micro);
    if (process.env.BUDGET_DEBUG) console.log(`[budget] +$${(micro / 1e6).toFixed(5)} (${u.input} in, ${u.output} out) · today $${(total / 1e6).toFixed(4)}`);
  } catch (e) {
    console.warn("[budget] could not record usage:", (e as Error).message);
  }
}

/** Counts one agent run for this IP; returns false once the IP is over its daily limit. */
export async function takeRun(ip: string): Promise<boolean> {
  try {
    return (await incr(`runs:${day()}:${ip}`, 1)) <= RUNS_PER_IP;
  } catch {
    return true;
  }
}
