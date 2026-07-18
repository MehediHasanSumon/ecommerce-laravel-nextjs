import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { ToastProvider } from "@/components/ui/toast-provider";
import { getRuntimeSettings } from "@/lib/public-api";
import { defaultMetadata } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return defaultMetadata();
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSettings = await getRuntimeSettings();

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider defaultTheme="system" enableSystem>
          <SettingsProvider initialSettings={initialSettings}>{children}</SettingsProvider>
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
