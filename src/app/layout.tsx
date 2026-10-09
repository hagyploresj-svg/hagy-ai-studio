import "./globals.css";
import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "HAGY AI Creative Studio", description: "AI-powered cinematic video creation." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <I18nProvider><Navbar />{children}<Footer /></I18nProvider>
    </body></html>
  );
}
