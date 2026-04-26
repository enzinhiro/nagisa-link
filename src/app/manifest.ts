import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NAGISA Link",
    short_name: "NAGISA Link",
    description: "逗子・葉山・横須賀のママ向け地域リンクサービス",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf7",
    theme_color: "#ecf8ff",
    icons: [
      {
        src: "/branding/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
