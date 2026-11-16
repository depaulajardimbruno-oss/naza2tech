/**
 * Layout raiz: fonte do sistema, idioma pt-BR, Toaster global.
 * Os layouts (auth) e (app) decidem a estrutura visual de cada área.
 */
import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Escalas", template: "%s · Escalas" },
  description: "Gestão de ministérios e escalas de voluntários",
};

export const viewport: Viewport = {
  themeColor: "#3b4bb3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
