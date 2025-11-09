import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { AnimatedBackground } from "@/components/animated-background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Riviera Ticket - The Odyssey IMAX 70mm",
  description: "Experience The Odyssey in IMAX 70mm. Premium tickets for the ultimate cinematic experience.",
  keywords: ["IMAX", "70mm", "The Odyssey", "movie tickets", "premium cinema"],
  openGraph: {
    title: "Riviera Ticket - The Odyssey IMAX 70mm",
    description: "Experience The Odyssey in IMAX 70mm. Premium tickets for the ultimate cinematic experience.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-black text-white relative`}
      >
        <AnimatedBackground />
        <div className="relative z-10">
          <Header />
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
