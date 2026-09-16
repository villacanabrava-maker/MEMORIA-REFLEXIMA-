import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Minha Memória | Memória Reflexiva" };

export default function MemoryLayout({ children }: { children: ReactNode }) {
  return <AppShell active="memoria" title="Minha Memória" eyebrow="Conhecimento com origem">{children}</AppShell>;
}
