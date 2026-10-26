import { notFound } from "next/navigation";
import { headers } from "next/headers";
import TestDataControls from "./TestDataControls";

export default async function TestDataPage() {
  const host = (await headers()).get("host") ?? "";
  if (process.env.NODE_ENV !== "development" || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
    notFound();
  }
  return <TestDataControls />;
}
