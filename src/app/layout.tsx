import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { auth } from "@/auth";
import { getAllLookups } from "@/lib/lookups";
import { EMPTY_LOOKUPS } from "@/lib/lookup-colors";
import { LookupProvider } from "@/components/lookups/lookup-provider";
import { Navbar } from "@/components/navbar";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { themeInitScript } from "@/components/theme-toggle";
import { SITE, PAGE_SEO } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: PAGE_SEO.home.title,
    template: `%s | ${SITE.name}`,
  },
  description: PAGE_SEO.home.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: SITE.url }],
  creator: SITE.author,
  publisher: SITE.author,
  category: "productivity",
  keywords: [
    "job application tracker",
    "job search organizer",
    "application tracking system",
    "kanban job board",
    "job hunt pipeline",
    "interview tracker",
    "job search dashboard",
    "career tracker",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    url: SITE.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d12" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;
  // Dropdown option values + colors now live in the DB; load once per request.
  const lookups = user ? await getAllLookups() : EMPTY_LOOKUPS;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} flex min-h-screen flex-col font-sans`}>
        <LookupProvider value={lookups}>
          {/* App chrome only renders for authenticated users (never on /login). */}
          {user && <Navbar user={user} />}
          <main className="flex-1">{children}</main>
          {user && (
            <footer className="border-t border-border/60 py-6">
              <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6">
                <p>
                  © {new Date().getFullYear()} {SITE.name} · Built by{" "}
                  {SITE.author}
                </p>
              </div>
            </footer>
          )}
          {user && <KeyboardShortcuts />}
        </LookupProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
