import type { Metadata } from "next";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav } from "@/components/nav/bottom-nav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Household To Do List",
  description: "Shared household task management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable)}>
      <body className="antialiased font-sans">
        <Providers>
          <div className="min-h-screen bg-background">
            <main className="mx-auto max-w-lg px-6 pt-10 pb-28">{children}</main>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
