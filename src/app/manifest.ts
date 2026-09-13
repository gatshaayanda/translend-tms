import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Translend TMS · Truck Division",
    short_name: "Translend",
    description: "Transport management for real trucking operations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f2ea",
    theme_color: "#0b8b85",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "My Trip", short_name: "My Trip", url: "/", icons: [{ src: "/icons/icon.svg", sizes: "any" }] },
    ],
  };
}
