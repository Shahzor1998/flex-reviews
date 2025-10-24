import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F8F5EF] text-[#1f2933] antialiased">
        <div className="min-h-screen">
          <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/The_Flex_Logo_Green.webp"
                  alt="The Flex"
                  width={120}
                  height={40}
                  priority
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
                <Link className="hover:text-emerald-700" href="/">
                  Overview
                </Link>
                <Link className="hover:text-emerald-700" href="/api/reviews/hostaway">
                  API
                </Link>
                <Link
                  className="hover:text-emerald-700"
                  href="https://theflex.global"
                  target="_blank"
                  rel="noreferrer"
                >
                  Website
                </Link>
              </nav>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">{children}</div>
        </div>
      </body>
    </html>
  );
}

