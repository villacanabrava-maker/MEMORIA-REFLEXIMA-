import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { LibraryTabs } from "@/components/library-tabs";
import "./importar/import.css";

export const metadata = { title: "Biblioteca | Memória Reflexiva" };

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return <AppShell active="biblioteca" title="Minha Biblioteca" eyebrow="Seu acervo organizado"><LibraryTabs />{children}</AppShell>;
}
