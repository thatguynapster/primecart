import { Montserrat } from "next/font/google";
import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";

import { ThemeProvider } from "@/providers/theme-provider";
import ModalProvider from "@/providers/modal-provider";
import { MapProvider } from "@/providers/map";

import "tippy.js/animations/scale.css";
import "tippy.js/dist/tippy.css";
import "./globals.css";
import { classNames } from "@/lib/utils";

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
          <ModalProvider>
            <MapProvider>{children}</MapProvider>

            <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
