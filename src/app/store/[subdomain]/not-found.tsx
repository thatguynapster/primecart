import { NotFoundMessage } from "@/components/site/not-found-message";

export default function StoreNotFound() {
  return (
    <NotFoundMessage
      body="This item or order isn't available. It may have been removed from the shop."
      href="/"
      label="Back to the shop"
    />
  );
}
