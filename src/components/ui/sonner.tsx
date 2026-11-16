/** Toaster — notificações flutuantes (sonner). Montado uma vez no layout raiz. */
"use client";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return <Sonner position="top-center" richColors closeButton {...props} />;
}

export { Toaster };
