import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Meu Cérebro | Memória Reflexiva" };

export default function BrainLayout({ children }: { children: ReactNode }) {
  return <AppShell active="cerebro" title="Meu Cérebro" eyebrow="Interpretações rastreáveis do seu acervo">{children}</AppShell>;
}
