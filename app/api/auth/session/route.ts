// The Netlify edge guard answers this route after verifying the authenticated owner.
// Direct Next.js execution never grants access in the absence of that guard.
export function GET() {
  return Response.json({ authorized: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
