import { getUser, refreshSession, type User } from "@netlify/identity";

let pending: Promise<User | null> | undefined;

// Both the root layout and login page can mount together. Share their refresh
// request so a rotated refresh token is not submitted concurrently by them.
export function resumeSession(): Promise<User | null> {
  if (!pending) {
    pending = (async () => {
      await refreshSession();
      return getUser();
    })().finally(() => { pending = undefined; });
  }
  return pending;
}
