import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F8F5EF] text-[#1f2933] antialiased">
        <div className="min-h-screen">
          <header className="border-b border-emerald-100 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
              <Link
                href="/"
                className="text-lg font-semibold text-emerald-800 transition hover:text-emerald-600"
              >
                the flex.
              </Link>
              <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
                <Link className="hover:text-emerald-700" href="/dashboard">
                  Dashboard
                </Link>
                <Link className="hover:text-emerald-700" href="/api/reviews/hostaway">
                  API
                </Link>
                <Link className="hover:text-emerald-700" href="https://theflex.global" target="_blank" rel="noreferrer">
                  Website
                </Link>
              </nav>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
