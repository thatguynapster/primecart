/**
 * The hero's product preview.
 *
 * Built as markup rather than a screenshot: the real dashboard does not exist
 * yet (Phase 6). Replace with a real screenshot once it ships.
 *
 * It shows the moment after a storefront order lands — the order notice is
 * visible and the charger's stock has already dropped from 12 to 10 — because
 * that is the one thing PrimeCart does that a notebook cannot.
 *
 * Figures are illustrative sample data, not a customer's.
 */

type Row = {
  product: string;
  variant: string;
  stock: number;
  low?: boolean;
  justSold?: boolean;
};

const ROWS: Row[] = [
  { product: "Anker 20W charger", variant: "Black", stock: 10, justSold: true },
  { product: "iPhone 15 case", variant: "Clear", stock: 4, low: true },
  { product: "JBL Go 3 speaker", variant: "Grey", stock: 7 },
];

export function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative w-full overflow-hidden rounded-t-2xl border border-neutral-200/90 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_60px_-24px_rgb(0_0_0/0.22)] sm:rounded-t-3xl"
    >
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b border-neutral-200/80 px-4 py-3 sm:px-5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-neutral-200" />
          <span className="size-2.5 rounded-full bg-neutral-200" />
          <span className="size-2.5 rounded-full bg-neutral-200" />
        </div>
        <div className="ml-1 hidden items-center gap-2 rounded-md bg-neutral-100 px-2.5 py-1 font-mono text-[11px] text-neutral-500 sm:flex">
          kofi.primecart.app
        </div>
      </div>

      <div className="flex">
        {/* sidebar */}
        <div className="hidden w-44 shrink-0 border-r border-neutral-200/80 p-4 sm:block">
          <div className="mb-5 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-neutral-900 text-[10px] font-bold text-white">
              K
            </span>
            <span className="text-xs font-medium text-neutral-700">
              Kofi Electronics
            </span>
          </div>
          <nav className="space-y-1">
            {["Dashboard", "Inventory", "Orders", "Customers", "Reports"].map(
              (item) => (
                <div
                  key={item}
                  className={
                    item === "Inventory"
                      ? "rounded-md bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-900"
                      : "rounded-md px-2.5 py-1.5 text-xs text-neutral-500"
                  }
                >
                  {item}
                </div>
              )
            )}
          </nav>
        </div>

        {/* table */}
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <h3 className="font-display text-sm font-bold tracking-tight text-neutral-900">
              Inventory
            </h3>
            <span className="text-[11px] text-neutral-400">3 products</span>
          </div>

          <div className="flex items-center justify-between border-b border-neutral-100 pb-2 text-[10px] font-medium tracking-[0.12em] text-neutral-400 uppercase">
            <span>Product</span>
            <span>In stock</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {ROWS.map((row) => (
              <div
                key={row.product}
                className={
                  row.justSold
                    ? "-mx-2 flex items-center justify-between gap-4 rounded-md bg-neutral-50 px-2 py-3"
                    : "-mx-2 flex items-center justify-between gap-4 px-2 py-3"
                }
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-neutral-800">
                    {row.product}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    {row.variant}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {row.justSold && (
                    <span className="hidden rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white sm:inline">
                      −2 sold
                    </span>
                  )}
                  {row.low && (
                    <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                      Low
                    </span>
                  )}
                  <span className="w-6 text-right font-mono text-[13px] tabular-nums text-neutral-900">
                    {row.stock}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* the sale that caused it */}
      <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/95 px-3.5 py-2.5 shadow-[0_8px_30px_-8px_rgb(0_0_0/0.25)] backdrop-blur sm:right-6 sm:bottom-6">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-neutral-900 text-[11px] font-bold text-white">
          ₵
        </span>
        <div className="leading-tight">
          <p className="text-[12px] font-semibold text-neutral-900">
            New order · GHS 240
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Storefront · stock updated
          </p>
        </div>
      </div>
    </div>
  );
}
