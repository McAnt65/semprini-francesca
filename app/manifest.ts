import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Il Registro di Francesca",
    short_name: "Il Registro",
    description: "Il registro delle lezioni di Francesca Semprini",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4eddf",
    theme_color: "#663139",
    icons: [
      { src: "/registro-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/registro-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/registro-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
