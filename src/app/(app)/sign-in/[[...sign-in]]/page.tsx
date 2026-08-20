import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign in — PrimeCart",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#F5F5F4] px-5 py-16">
      <SignIn
        // Where to land when Clerk has no prior destination in mind. Onboarding
        // forwards to the dashboard by itself once it is complete.
        fallbackRedirectUrl="/onboarding"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
