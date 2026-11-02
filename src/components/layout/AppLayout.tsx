import { NavLink, Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useHealth } from "@/lib/queries";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/orders", label: "Đơn hàng" },
  { to: "/chat", label: "Trợ lý AI" },
  { to: "/products", label: "Sản phẩm" },
  { to: "/knowledge", label: "Chính sách" },
];

function ConnectionBanner() {
  const health = useHealth();

  if (!health.isError) return null;

  return (
    <div
      role="alert"
      className="bg-status-amber-tint py-2 text-sm font-semibold text-status-amber"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
        <span>{health.error.message}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={health.isFetching}
          onClick={() => health.refetch()}
        >
          Kiểm tra lại
        </Button>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5">
          <NavLink to="/" className="text-lg font-extrabold text-primary">
            ShopMate AI
          </NavLink>
          <nav aria-label="Điều hướng chính" className="flex flex-wrap gap-0.5 sm:gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-2.5 py-1 text-sm font-semibold whitespace-nowrap sm:px-3",
                    isActive
                      ? "bg-accent font-bold text-accent-foreground"
                      : "text-soft hover:bg-mint hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <ConnectionBanner />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
