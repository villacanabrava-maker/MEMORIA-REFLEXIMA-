import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Reflexões | Memória Reflexiva" };

export default function ReflectionsLayout({ children }: { children: ReactNode }) {
  return <AppShell active="reflexoes" title="Criar Reflexão" eyebrow="Versões, contexto e aprovação humana">{children}</AppShell>;
}
