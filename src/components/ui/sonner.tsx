/** Toaster — notificações flutuantes (sonner). Montado uma vez no layout raiz. */
"use client";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return <Sonner
      position="top-center"
      richColors
      closeButton
      theme="dark"
      // whitespace-pre-line: mensagens com várias linhas (ex.: lista do que impede uma exclusão)
      toastOptions={{ classNames: { title: "whitespace-pre-line" } }}
      {...props}
    />;
}

export { Toaster };
