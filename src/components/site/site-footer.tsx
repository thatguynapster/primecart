import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-[#F5F5F4]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt=""
            width={22}
            height={22}
            className="rounded-[4px]"
          />
          <span className="font-display text-[15px] font-bold tracking-tight text-neutral-900">
            PrimeCart
          </span>
          <span className="text-[13px] text-neutral-400">· Accra, Ghana</span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-neutral-500">
          <a href="#features" className="hover:text-neutral-900">
            Features
          </a>
          <a href="#pricing" className="hover:text-neutral-900">
            Pricing
          </a>
          <Link href="/sign-in" className="hover:text-neutral-900">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
