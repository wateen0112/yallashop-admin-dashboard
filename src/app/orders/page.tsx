"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { DataTable } from "@yallashop/ui/data-table";
import { StatusPill } from "@yallashop/ui/status-pill";
import { Button } from "@yallashop/ui/button";
import { Card, CardContent } from "@yallashop/ui/card";
import { Input } from "@yallashop/ui/input";
import { Select } from "@yallashop/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { OrderDetailModal } from "./order-detail-modal";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import type { Column } from "@yallashop/ui/data-table";
import { Search, Eye } from "lucide-react";

interface OrderItem {
  id: number;
  qty: number;
  unit_price: number;
  total_price: number;
  variant?: {
    id: number;
    sku: string;
    price: number;
    product?: {
      id: number;
      title: string;
      images?: { url: string; type: string }[];
    };
    images?: { url: string; type: string }[];
  };
}

interface OrderDetail {
  id: number;
  order_id?: string;
  status: string;
  customer_name?: string;
  customer_email?: string;
  vendor_name?: string;
  total_amount?: number;
  created_at: string;
  delivery_fee?: number;
  pickup_code?: string;
  delivery_code?: string;
  items?: OrderItem[];
  items_count?: number;
  courier?: { id: number; name?: string; phone?: string } | null;
  delivery_address_snapshot?: {
    address?: string;
    city?: string;
    phone?: string;
  } | null;
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  const user = api.getUser();
  const isVendor = user?.role === "vendor";
  const isAdmin = user?.role === "admin";

  const { data: orders, isLoading, error } = useQuery<OrderDetail[]>({
    queryKey: ["admin", "orders"],
    queryFn: () => api.getList<OrderDetail>("/admin/orders"),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      subOrderId,
      status,
    }: {
      subOrderId: number;
      status: string;
    }) => api.put(`/admin/orders/${subOrderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setSelectedOrder(null);
    },
  });

  const filtered = (orders || []).filter((o) => {
    const matchesSearch =
      !search ||
      String(o.order_id || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(o.customer_name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(o.vendor_name || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) =>
    `${Number(val).toLocaleString()} ${t("sar_currency")}`;

  const handleStatusChange = (subOrderId: number, status: string) => {
    statusMutation.mutate({ subOrderId, status });
  };

  const getAdminColumns = (): Column[] => [
    {
      key: "order_id",
      label: t("order_id"),
      sortable: true,
    },
    {
      key: "customer_name",
      label: t("customer"),
      sortable: true,
    },
    {
      key: "customer_email",
      label: t("customer_email"),
      render: (val) => String(val || "-"),
    },
    {
      key: "vendor_name",
      label: t("vendor"),
      sortable: true,
    },
    {
      key: "total_amount",
      label: t("total"),
      sortable: true,
      render: (val) =>
        val != null ? formatCurrency(Number(val)) : "-",
    },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (val) => (
        <StatusPill status={String(val)} label={t(String(val))} />
      ),
    },
    {
      key: "created_at",
      label: t("date"),
      sortable: true,
      render: (val) =>
        val ? new Date(String(val)).toLocaleDateString() : "-",
    },
    {
      key: "id",
      label: t("actions"),
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => setSelectedOrder(row as unknown as OrderDetail)}
        >
          <Eye className="h-3.5 w-3.5" />
          {t("view")}
        </Button>
      ),
    },
  ];

  const getVendorColumns = (): Column[] => [
    {
      key: "order_id",
      label: t("order_id"),
      sortable: true,
    },
    {
      key: "customer_name",
      label: t("customer"),
      sortable: true,
      render: (val) => String(val || "-"),
    },
    {
      key: "items_count",
      label: t("items"),
      sortable: true,
      render: (val) => String(val ?? 0),
    },
    {
      key: "total_amount",
      label: t("amount"),
      sortable: true,
      render: (val) =>
        val != null ? formatCurrency(Number(val)) : "-",
    },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (val) => (
        <StatusPill status={String(val)} label={t(String(val))} />
      ),
    },
    {
      key: "created_at",
      label: t("date"),
      sortable: true,
      render: (val) =>
        val ? new Date(String(val)).toLocaleDateString() : "-",
    },
    {
      key: "id",
      label: t("actions"),
      render: (_, row) => (
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setSelectedOrder(row as unknown as OrderDetail)}
          >
            <Eye className="h-3.5 w-3.5" />
            {t("view")}
          </Button>
        </div>
      ),
    },
  ];

  const columns = isVendor ? getVendorColumns() : getAdminColumns();

  const statusOptions = [
    { value: "all", label: t("all") },
    { value: "pending", label: t("pending") },
    { value: "confirmed", label: t("confirmed") },
    { value: "preparing", label: t("preparing") },
    { value: "ready_for_pickup", label: t("ready_for_pickup") },
    { value: "waiting_for_driver", label: t("waiting_for_driver") },
    { value: "with_driver", label: t("with_driver") },
    { value: "delivered", label: t("delivered") },
    { value: "cancelled", label: t("cancelled") },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t("orders")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {isVendor ? t("manage_incoming_orders") : t("view_manage_orders")}
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="h-10 w-40"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <Input
              placeholder={t("search_orders")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-64 pl-10"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-error">{t("error_description")}</p>
          </CardContent>
        </Card>
      )}

      {orders && (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filtered as unknown as Record<string, unknown>[]}
              emptyLabel={t("no_data")}
            />
          </CardContent>
        </Card>
      )}

      <OrderDetailModal
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        isVendor={isVendor}
        isAdmin={isAdmin}
        onStatusChange={handleStatusChange}
        statusLoading={statusMutation.isPending}
      />
    </AdminLayout>
  );
}