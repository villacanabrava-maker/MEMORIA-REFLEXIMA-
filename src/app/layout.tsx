import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memória Reflexiva",
  description: "Um espaço privado para organizar fontes, reencontrar memórias e criar reflexões com autoria.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
