import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis usa módulos de Node: no debe empaquetarse, sino resolverse
  // como externo en el servidor.
  serverExternalPackages: ["googleapis"],
  // La app actual vive en public/index.html y se sirve en la raíz "/".
  // El backend son las rutas bajo app/api/*.
  async rewrites() {
    return [{ source: "/", destination: "/index.html" }];
  },
};

export default nextConfig;
