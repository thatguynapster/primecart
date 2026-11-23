import { NotFoundMessage } from "@/components/site/not-found-message";

export default function NotFound() {
  return (
    <NotFoundMessage
      body="This page doesn't exist, or the link has changed."
      href="/"
      label="Go to the home page"
    />
  );
}
