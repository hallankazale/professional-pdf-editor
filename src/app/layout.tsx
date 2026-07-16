import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Professional PDF Editor",
  description: "Editor profissional de documentos PDF no navegador.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
