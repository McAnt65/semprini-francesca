"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { getStudentPhoto, isStoredPhoto } from "../data/student-photos";

export function useStudentPhoto(source?: string): { source?: string; url?: string; error?: string } {
  const [loaded, setLoaded] = useState<{ source: string; url?: string; error?: string }>();
  useEffect(() => {
    if (!source || !isStoredPhoto(source)) return;
    let active = true;
    let objectUrl: string | undefined;
    getStudentPhoto(source).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setLoaded({ source, url: objectUrl });
    }).catch(() => {
      if (active) setLoaded({ source, error: "Fotografia non disponibile nell'archivio locale. Riapri la scheda per riprovare." });
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [source]);
  return isStoredPhoto(source)
    ? loaded && loaded.source === source ? loaded : { source }
    : { source, url: source };
}

export default function StudentPhoto({ src, alt, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  const photo = useStudentPhoto(src);
  if (photo.error) return <span role="status">{photo.error}</span>;
  return photo.url ? <Image {...props} src={photo.url} alt={alt} unoptimized /> : null;
}
