import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blue Motors SGI",
  description: "Sistema de Gestión Integral — Blue Motors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground" style={{ fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
