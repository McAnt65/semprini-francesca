export type VerifiedUser = { id: string } | null;

// Only installation assets and the authentication entry points are public.
// Never allow arbitrary extensions: /studenti/private.png is still a private route.
const publicPaths = new Set([
  "/", "/accesso", "/manifest.webmanifest", "/favicon.ico", "/icon.png",
  "/apple-icon.png", "/Homepage.png", "/icona-app-192.png",
  "/icona-app-512.png", "/icona-app-maskable-512.png",
]);

export function isPublicPath(path: string): boolean {
  return publicPaths.has(path) || path.startsWith("/_next/static/") ||
    path === "/_next/image" || path.startsWith("/fonts/") ||
    path.startsWith("/.netlify/identity/");
}

export async function protectRequest(
  request: Request,
  ownerId: string | undefined,
  verify: () => Promise<VerifiedUser>,
  next: () => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url);
  if (isPublicPath(url.pathname)) return next();
  const headers = { "Cache-Control": "private, no-store", "Netlify-CDN-Cache-Control": "no-store", "Vary": "Cookie, Authorization" };
  if (!ownerId?.trim()) return new Response("Accesso non ancora configurato.", { status: 503, headers });
  let user: VerifiedUser = null;
  try { user = await verify(); } catch { /* Deny on Identity/network failure. */ }
  if (!user) {
    if (url.pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method)) {
      return new Response("Accesso richiesto.", { status: 401, headers });
    }
    return new Response(null, { status: 303, headers: { ...headers, Location: "/accesso" } });
  }
  if (user.id !== ownerId.trim()) return new Response("Account non autorizzato.", { status: 403, headers });
  if (url.pathname === "/api/auth/session") return Response.json({ authorized: true }, { headers });
  const response = await next();
  const result = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) result.headers.set(key, value);
  return result;
}
