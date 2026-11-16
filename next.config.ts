import type { NextConfig } from "next";

/**
 * Configuração do Next.
 *
 * `cacheComponents` (PPR) fica DESLIGADO de propósito: toda página deste app
 * depende da sessão (cookie), então não há "casca estática" para pré-renderizar.
 * Ligar exigiria <Suspense> em cada rota e `use cache: private` sem ganho real
 * para um sistema interno de igreja. Se um dia houver páginas públicas pesadas,
 * reavalie: https://nextjs.org/docs/app/guides/authentication-with-cache-components
 */
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
