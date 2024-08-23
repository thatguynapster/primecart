import { Montserrat } from "next/font/google";
import type { Metadata } from "next";

import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";
import { classNames } from "@/lib/helpers";
import { MapProvider } from "@/providers/map";
import { Toaster } from "react-hot-toast";

const font = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrimeCart",
  description:
    "PrimeCart is an e-commerce platform with a mission to empower SMEs in Africa and developing countries to establish and grow their online presence with minimal barriers. It offers an affordable, user-friendly solution with local currency support, a drag-and-drop store builder, and robust e-commerce tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: any;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={classNames(font.className, "bg-light")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MapProvider>{children}</MapProvider>

          <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
