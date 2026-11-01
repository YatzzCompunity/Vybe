import { ApiValidationError } from "@/lib/api/response";

/**
 * Shared admin input parsing. Works for both JSON API bodies and HTML form posts
 * (see `formToRaw`). Semantics for every getter:
 *   - key absent (undefined)  -> returns undefined  (= "leave unchanged" on update)
 *   - empty string            -> required: 400; optional: null
 */
export type Raw = Record<string, unknown>;

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function bad(message: string): ApiValidationError {
  return new ApiValidationError(message);
}

export function notFound(what: string): ApiValidationError {
  return new ApiValidationError(`${what} not found.`, { status: 404, code: "NOT_FOUND" });
}

export function conflict(message: string, details?: Record<string, unknown>): ApiValidationError {
  return new ApiValidationError(message, { status: 409, code: "CONFLICT", details });
}

export function formToRaw(fd: FormData, boolKeys: string[] = []): Raw {
  const raw: Raw = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$ACTION")) raw[k] = v;
  });
  for (const k of boolKeys) raw[k] = fd.get(k) !== null;
  return raw;
}

interface StrOpts {
  required?: boolean;
  max?: number;
  min?: number;
  multiline?: boolean;
}

export function str(raw: Raw, key: string, o: StrOpts = {}): string | null | undefined {
  const v = raw[key];
  if (v === undefined) {
    if (o.required) throw bad(`'${key}' is required.`);
    return undefined;
  }
  if (v === null) {
    if (o.required) throw bad(`'${key}' is required.`);
    return null;
  }
  if (typeof v !== "string") throw bad(`'${key}' must be a string.`);
  const s = v.trim();
  if (s === "") {
    if (o.required) throw bad(`'${key}' is required.`);
    return null;
  }
  if (o.min && s.length < o.min) throw bad(`'${key}' must be at least ${o.min} characters.`);
  if (s.length > (o.max ?? 500)) throw bad(`'${key}' must be at most ${o.max ?? 500} characters.`);
  if (!o.multiline && CONTROL.test(s)) throw bad(`'${key}' contains invalid characters.`);
  return s;
}

/** Required-or-absent string (never null). */
export function reqStr(raw: Raw, key: string, o: StrOpts = {}, partial = false): string | undefined {
  const v = str(raw, key, { ...o, required: !partial || raw[key] !== undefined });
  return v === null ? undefined : v;
}

export function slugField(raw: Raw, key = "slug", partial = false): string | undefined {
  const s = reqStr(raw, key, { max: 120 }, partial);
  if (s !== undefined && !SLUG_RE.test(s)) {
    throw bad(`'${key}' must be lowercase letters, numbers and single hyphens.`);
  }
  return s;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function bool(raw: Raw, key: string): boolean | undefined {
  const v = raw[key];
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "on" || v === "1") return true;
  if (v === "false" || v === "0" || v === "") return false;
  throw bad(`'${key}' must be a boolean.`);
}

export function int(raw: Raw, key: string, min: number, max: number): number | null | undefined {
  const v = raw[key];
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`'${key}' must be an integer between ${min} and ${max}.`);
  return n;
}

export function num(raw: Raw, key: string, min: number, max: number): number | undefined {
  const v = raw[key];
  if (v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw bad(`'${key}' must be a number between ${min} and ${max}.`);
  return n;
}

export function oneOf<T extends string>(raw: Raw, key: string, allowed: readonly T[]): T | undefined {
  const v = raw[key];
  if (v === undefined || v === "") return undefined;
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    throw bad(`'${key}' must be one of: ${allowed.join(", ")}.`);
  }
  return v as T;
}

export function date(raw: Raw, key: string): Date | null | undefined {
  const v = raw[key];
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string") throw bad(`'${key}' must be an ISO date string.`);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw bad(`'${key}' is not a valid date.`);
  return d;
}

/** http(s) URL only (blocks javascript:/data: URLs). */
export function urlField(raw: Raw, key: string): string | null | undefined {
  const s = str(raw, key, { max: 500 });
  if (!s) return s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw bad(`'${key}' must be a valid http(s) URL.`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw bad(`'${key}' must be a valid http(s) URL.`);
  return s;
}

/** Accepts a string[] (JSON) or a comma/newline separated string (forms). */
export function slugList(raw: Raw, key: string): string[] | undefined {
  const v = raw[key];
  if (v === undefined) return undefined;
  const items = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\n]/) : null;
  if (!items) throw bad(`'${key}' must be an array of slugs.`);
  const out = new Set<string>();
  for (const item of items) {
    if (typeof item !== "string") throw bad(`'${key}' must be an array of slugs.`);
    const s = item.trim().toLowerCase();
    if (!s) continue;
    if (!SLUG_RE.test(s)) throw bad(`Invalid tag slug '${s.slice(0, 40)}'.`);
    out.add(s);
  }
  if (out.size > 20) throw bad(`At most 20 entries allowed in '${key}'.`);
  return Array.from(out);
}

export function idParam(v: unknown, name = "id"): string {
  if (typeof v !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(v)) throw bad(`Invalid '${name}'.`);
  return v;
}

export function pageParams(sp: URLSearchParams | Record<string, string | undefined>, defLimit = 20) {
  const get = (k: string) => (sp instanceof URLSearchParams ? sp.get(k) : sp[k]) ?? undefined;
  const page = Math.min(Math.max(parseInt(get("page") ?? "1", 10) || 1, 1), 1000);
  const limit = Math.min(Math.max(parseInt(get("limit") ?? String(defLimit), 10) || defLimit, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}
