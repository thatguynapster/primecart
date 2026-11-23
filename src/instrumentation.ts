import type { Instrumentation } from "next";

/** Every unhandled server error: pages, actions, route handlers and proxy. */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { reportServerError } = await import("@/lib/notifications/error-alert");
  await reportServerError(error, request.method, context.routePath, context.routeType);
};
