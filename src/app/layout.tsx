import type { Metadata, Viewport } from "next";
import { NativeAppSetup } from "./NativeAppSetup";
import "./globals.css";
import "./home-redesign.css";
import "./mobile-editor.css";
import "./native-android.css";

export const metadata: Metadata = {
  title: "Professional PDF Editor",
  description: "Editor profissional de documentos PDF no navegador.",
  applicationName: "Professional PDF Editor",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#050b14",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <NativeAppSetup />
        {children}
      </body>
    </html>
  );
}
