// Cookie helpers for Cloudflare Workers (no Express dependency)

export function buildSetCookieHeader(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    path?: string;
  } = {}
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];

  if (options.path) parts.push(`Path=${options.path}`);
  else parts.push("Path=/");

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  return parts.join("; ");
}

export function buildClearCookieHeader(name: string): string {
  return buildSetCookieHeader(name, "", { maxAge: 0, path: "/" });
}
