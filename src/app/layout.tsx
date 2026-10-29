import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { PrefsProvider } from "@/lib/i18n/prefs";
import { BRAND } from "@/lib/brand";
import { COLORS } from "@/lib/colors";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: COLORS.accent,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <PrefsProvider>
          <ToastProvider>{children}</ToastProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
