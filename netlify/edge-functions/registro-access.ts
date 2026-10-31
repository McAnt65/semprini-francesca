import { getUser, refreshSession } from "@netlify/identity";
import type { Context } from "@netlify/edge-functions";
import { protectRequest } from "../auth-policy.ts";

export default async function handler(request: Request, context: Context) {
  return protectRequest(request, Netlify.env.get("REGISTRO_OWNER_ID"), async () => {
    await refreshSession();
    return getUser();
  }, () => context.next());
}

declare const Netlify: { env: { get(name: string): string | undefined } };
