import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "#why", label: "Why PrimeCart" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-[#F5F5F4]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt=""
            width={26}
            height={26}
            className="rounded-[5px]"
            priority
          />
          <span className="font-display text-[17px] font-bold tracking-tight text-neutral-900">
            PrimeCart
          </span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13.5px] text-neutral-600 transition-colors hover:text-neutral-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden rounded-full px-3.5 py-2 text-[13.5px] text-neutral-600 transition-colors hover:text-neutral-900 sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-neutral-900 px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}
