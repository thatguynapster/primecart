import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Start your free trial — PrimeCart",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-[#F5F5F4] px-5 py-16">
      <div className="text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.03em] text-neutral-900">
          Start your free trial
        </h1>
        <p className="mt-2 text-[14px] text-neutral-600">
          14 days free. No payment details needed.
        </p>
      </div>
      <SignUp fallbackRedirectUrl="/onboarding" signInUrl="/sign-in" />
      <p className="max-w-sm text-center text-[12.5px] leading-relaxed text-neutral-500">
        By creating a shop you agree to the{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-900">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-neutral-900">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
