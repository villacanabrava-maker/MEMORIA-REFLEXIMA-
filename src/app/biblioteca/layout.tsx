import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Biblioteca | Memória Reflexiva" };

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return <AppShell active="biblioteca" title="Sua biblioteca" eyebrow="Fontes sob sua autoria">{children}</AppShell>;
}
