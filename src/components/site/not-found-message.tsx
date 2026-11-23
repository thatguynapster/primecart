import Link from "next/link";

export function NotFoundMessage({
  body,
  href,
  label,
}: {
  body: string;
  href: string;
  label: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm leading-relaxed opacity-70">{body}</p>
      <Link href={href} className="mt-3 text-sm underline underline-offset-4">
        {label}
      </Link>
    </div>
  );
}
