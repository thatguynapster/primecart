import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Get started — PrimeCart",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#F5F5F4] px-5 py-16">
      <SignUp fallbackRedirectUrl="/onboarding" signInUrl="/sign-in" />
    </div>
  );
}
