import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Archivo, Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

// Body and UI. Bound to --font-sans, which globals.css expects.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Display. Archivo carries real weight at large sizes and tightens well, which
// is what the headline treatment needs; Geist stays for everything else so the
// two roles read as deliberately different rather than one family stretched.
const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The merchant dashboard's face. Nocturne specifies Inter 400/500/600, with
// headings never heavier than 500.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PrimeCart — stock, orders and your own shop link",
  description:
    "Keep inventory, orders and an online storefront in one place. Built for shops in Ghana. GHS 79/month, 30 days free.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Points Clerk's client components at this app's own auth screens. The
    // proxy's server-side guard is configured separately, in src/proxy.ts.
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html
        lang="en"
        className={`${geistSans.variable} ${archivo.variable} ${geistMono.variable} ${inter.variable} h-full antialiased motion-safe:scroll-smooth`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
