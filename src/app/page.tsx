"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { Button } from "@yallashop/ui/button";
import { StatusPill } from "@yallashop/ui/status-pill";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@yallashop/ui/card";
import { AdminLayout } from "@/components/admin-layout";
import { cn } from "@/lib/utils";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import {
  DollarSign,
  Store,
  Users,
  ShoppingCart,
  Truck,
  Clock,
  PlusCircle,
  Tags,
  Eye,
} from "lucide-react";

interface AdminOverview {
  total_vendors: number;
  total_customers: number;
  total_couriers: number;
  total_orders: number;
  total_revenue: number;
  pending_approvals?: number;
}

interface RecentOrder {
  id: number;
  order_id: string;
  customer_name: string;
  customer_email?: string;
  vendor_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const kpiConfig = [
  { key: "total_vendors", icon: Store, labelKey: "total_vendors", color: "bg-primary-fixed text-on-primary-fixed-variant" },
  { key: "total_customers", icon: Users, labelKey: "total_customers", color: "bg-secondary-container/40 text-on-secondary-container" },
  { key: "total_couriers", icon: Truck, labelKey: "total_couriers", color: "bg-warning-light text-warning-dark" },
  { key: "total_orders", icon: ShoppingCart, labelKey: "total_orders", color: "bg-primary-fixed/70 text-on-primary-fixed-variant" },
  { key: "total_revenue", icon: DollarSign, labelKey: "total_revenue", color: "bg-secondary-container/40 text-on-secondary-container", hero: true },
  { key: "pending_approvals", icon: Clock, labelKey: "pending_approvals", color: "bg-error-container/70 text-on-error-container" },
];

export default function AdminDashboard() {
  const { t, direction } = useTranslation();

  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery<AdminOverview>({
    queryKey: ["admin", "analytics", "overview"],
    queryFn: () => api.get("/admin/analytics/overview"),
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery<RecentOrder[]>({
    queryKey: ["admin", "orders", "recent"],
    queryFn: () => api.getList<RecentOrder>("/admin/orders?limit=5"),
  });

  const formatCurrency = (val: number) =>
    `${Number(val).toLocaleString()} ${t("sar_currency")}`;

  const isLoading = overviewLoading || ordersLoading;
  const error = overviewError;

  return (
    <AdminLayout>
      <div className="animate-fade-in mb-6">
        <h1 className="text-display  text-on-surface">
          {t("dashboard")}
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          {t("marketplace_overview")}
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-error">{t("error_description")}</p>
          </CardContent>
        </Card>
      )}

      {overview && !isLoading && (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpiConfig.map((kpi) => (
              <div
                key={kpi.key}
                className={cn(
                  "group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5",
                  kpi.hero
                    ? "bg-gradient-hero text-white shadow-secondary-glow border border-white/10"
                    : "bg-surface-container-lowest border border-outline-variant/50 shadow-card hover:shadow-card-hover"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-label-sm font-bold uppercase tracking-wider", kpi.hero ? "text-white/90" : "text-on-surface-variant")}>
                    {t(kpi.labelKey)}
                  </span>
                  <div className={cn("rounded-xl p-2.5 transition-all duration-300 group-hover:scale-110", kpi.color)}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className={cn("mt-3 text-3xl font-bold tracking-tight", kpi.hero ? "text-white" : "text-on-surface")}>
                  {kpi.key === "total_revenue"
                    ? formatCurrency(overview?.total_revenue ?? 0)
                    : String((overview as unknown as Record<string, number>)[kpi.key] ?? 0)}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>{t("recent_orders")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {ordersLoading ? (
                  <div className="h-48 animate-pulse rounded-lg bg-surface-container-low m-6" />
                ) : (
                  <div className="grid gap-3 p-6">
                    {(recentOrders ?? []).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 transition-all hover:border-outline-variant hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-on-surface">
                            #{order.order_id}
                          </span>
                          <span className="text-sm text-on-surface-variant">
                            {order.customer_name} → {order.vendor_name}
                          </span>
                          <span className="text-xs text-on-surface-variant/70">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold text-on-surface">
                            {formatCurrency(Number(order.total_amount))}
                          </span>
                          <StatusPill status={order.status} label={t(order.status)} />
                        </div>
                      </div>
                    ))}
                    {(recentOrders ?? []).length === 0 && (
                      <p className="text-center text-on-surface-variant py-8">
                        {t("no_data")}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>{t("revenue_overview")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center rounded-2xl bg-gradient-hero p-8 text-white shadow-secondary-glow">
                  <div className="text-center">
                    <p className="text-label-sm font-bold uppercase tracking-wider text-white/90">{t("total_revenue")}</p>
                    <p className="mt-2 text-4xl font-bold text-white">
                      {formatCurrency(overview?.total_revenue ?? 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>{t("quick_actions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  {t("add_vendor_short")}
                </Button>
                <Button variant="outline" className="gap-2">
                  <Tags className="h-4 w-4" />
                  {t("manage_categories")}
                </Button>
                <Button variant="outline" className="gap-2">
                  <Truck className="h-4 w-4" />
                  {t("view_couriers")}
                </Button>
                <Button variant="outline" className="gap-2">
                  <Eye className="h-4 w-4" />
                  {t("view_manage_orders")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
