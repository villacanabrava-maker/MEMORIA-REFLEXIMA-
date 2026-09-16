"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LibraryTabs() {
  const pathname = usePathname();
  return <nav className="content-tabs" aria-label="Ações da biblioteca"><Link className="workspace-button primary" href="/biblioteca/arquivos/novo" aria-current={pathname === "/biblioteca/arquivos/novo" ? "page" : undefined}>＋ Adicionar arquivo</Link></nav>;
}
