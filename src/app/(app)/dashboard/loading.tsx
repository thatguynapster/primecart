import { Skeleton } from "@/components/dashboard/nocturne/ui";

/**
 * Overview skeleton: 4 × 96px KPI cards, a 300px block, a 200px block.
 *
 * The prototype faked this with a timer; here it is a real Suspense boundary,
 * so it shows for exactly as long as the aggregations take.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-3.5 px-4 pt-19 pb-10 sm:px-6">
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-75" />
      <Skeleton className="h-50" />
    </div>
  );
}
