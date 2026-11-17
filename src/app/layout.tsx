/**
 * Layout raiz: fontes da marca (Unbounded + Manrope, mesmas do site da Naza2),
 * idioma pt-BR, tema escuro e Toaster global.
 *
 * As fontes são carregadas por <link> em vez de next/font para não depender de
 * acesso ao Google Fonts em tempo de build (o ambiente de build pode ser offline).
 * Os layouts (auth) e (app) decidem a estrutura visual de cada área.
 */
import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Escalas · Naza2 Campinas", template: "%s · Naza2 Campinas" },
  description: "Gestão de ministérios e escalas de voluntários da 2ª Igreja do Nazareno de Campinas",
};

export const viewport: Viewport = {
  themeColor: "#04060b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- layout raiz do App Router: carrega uma vez para todo o app */}
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@300;500;700;800&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
