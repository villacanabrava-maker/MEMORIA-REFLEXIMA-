"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/biblioteca", label: "Meus textos" },
  { href: "/biblioteca/novo", label: "Adicionar texto" },
  { href: "/biblioteca/arquivos", label: "Arquivos" },
];

export function LibraryTabs() {
  const pathname = usePathname();
  return <nav className="content-tabs" aria-label="Ações da biblioteca">{tabs.map(({ href, label }) => <Link key={href} className="workspace-button neutral" href={href} aria-current={pathname === href || (href === "/biblioteca/arquivos" && pathname.startsWith("/biblioteca/arquivos/")) ? "page" : undefined}>{label}</Link>)}</nav>;
}
