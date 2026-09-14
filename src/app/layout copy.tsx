import type { Metadata } from "next";
import { Archivo, Spectral, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// next/font self-hosts these at build time, so there is no runtime egress to
// Google — consistent with Hey Nav running inside the customer's boundary.
const archivo = Archivo({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-archivo" });
const spectral = Spectral({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-spectral" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Hey Nav — Sign in",
  description: "The governed CUI workspace by MIKE LLC, powered by AsterionDB.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${spectral.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
