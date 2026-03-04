import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne, Poppins, DM_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { AnimatedBackground } from "@/components/animated-background";
import { AuthProvider } from "@/context/auth";
import { CheckoutTimerProvider, ExtensionModal } from "@/components/flow";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} ${poppins.variable} ${dmMono.variable} antialiased min-h-screen bg-black text-white relative`}
        suppressHydrationWarning
      >
        <AnimatedBackground />
        <AuthProvider>
          <CheckoutTimerProvider>
            <div className="relative z-10">
              <Header />
              <main>
                {children}
              </main>
            </div>
            <ExtensionModal />
          </CheckoutTimerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
