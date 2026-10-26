"use client";

import { useEffect, useState } from "react";
import { readTopicCatalog, TOPIC_CATALOG_CHANGED, type TopicCatalog } from "./topic-catalog";

export function useTopicCatalog() {
  const [catalog, setCatalog] = useState<TopicCatalog | null>(null);
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (!mounted) return;
      try { setCatalog(readTopicCatalog(window.localStorage)); }
      catch { setCatalog({ status: "error" }); }
    };
    queueMicrotask(refresh);
    window.addEventListener(TOPIC_CATALOG_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      mounted = false;
      window.removeEventListener(TOPIC_CATALOG_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  return catalog;
}
