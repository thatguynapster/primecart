import { NotFoundMessage } from "@/components/site/not-found-message";

export default function DashboardNotFound() {
  return (
    <NotFoundMessage
      body="This order, product or customer doesn't exist in your shop."
      href="/dashboard"
      label="Go to overview"
    />
  );
}
