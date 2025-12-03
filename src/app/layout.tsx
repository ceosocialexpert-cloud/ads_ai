import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GlobalHeader from "@/components/GlobalHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Creative Generator",
  description: "Генератор рекламних креативів на основі штучного інтелекту",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GlobalHeader />
        {children}
      </body>
    </html>
  );
}