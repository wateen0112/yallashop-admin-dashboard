"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@yallashop/ui/card";
import { Button } from "@yallashop/ui/button";
import { StatusPill } from "@yallashop/ui/status-pill";
import { Modal } from "@yallashop/ui/modal";
import { Timeline, type TimelineStep } from "@yallashop/ui/timeline";
import { AdminLayout } from "@/components/admin-layout";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import { Package, Clock, CheckCircle, XCircle } from "lucide-react";

interface OrderItem {
  id: number;
  qty: number;
  unit_price: number;
  total_price: number;
  variant?: {
    id: number;
    name: string;
    product?: { id: number; name: string };
  };
}

interface CustomerOrder {
  id: number;
  order_number: string;
  status: string;
  grand_total: number;
  created_at: string;
  sub_orders?: Array<{
    id: number;
    status: string;
    store?: { name: string };
    items?: OrderItem[];
    delivery_code?: string;
    courier?: { name: string; phone?: string };
    delivery_address_snapshot?: { address?: string; city?: string; phone?: string };
  }>;
}

const TIMELINE_STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "waiting_for_driver",
  "with_driver",
  "delivered",
];

function buildTimeline(status: string, t: (k: string) => string): TimelineStep[] {
  if (status === "cancelled") {
    return [{ label: t("cancelled"), completed: true }];
  }

  const currentIdx = TIMELINE_STEPS.indexOf(status);
  const isTerminal = status === "delivered";

  return TIMELINE_STEPS.map((step, i) => ({
    label: t(step),
    completed: isTerminal || i < currentIdx,
    active: !isTerminal && i === currentIdx,
  }));
}

export default function MyOrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"ongoing" | "delivered" | "cancelled">("ongoing");
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);

  const { data: orders, isLoading, error } = useQuery<CustomerOrder[]>({
    queryKey: ["customer", "orders"],
    queryFn: () => api.getList<CustomerOrder>("/orders"),
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: number) => api.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "orders"] });
      setSelectedOrder(null);
    },
  });

  const canCancel = (status: string) =>
    ["pending", "confirmed", "preparing", "ready_for_pickup", "courier_assigned", "failed_delivery"].includes(status);

  const filteredOrders = (orders || []).filter((order) => {
    if (activeTab === "ongoing") {
      return !["delivered", "cancelled"].includes(order.status);
    }
    if (activeTab === "delivered") {
      return order.status === "delivered";
    }
    if (activeTab === "cancelled") {
      return order.status === "cancelled";
    }
    return true;
  });

  const formatCurrency = (val: number) =>
    `${Number(val).toLocaleString()} ${t("sar_currency")}`;

  const getStatusIcon = (status: string) => {
    if (status === "delivered") return <CheckCircle className="h-5 w-5 text-success" />;
    if (status === "cancelled") return <XCircle className="h-5 w-5 text-error" />;
    return <Clock className="h-5 w-5 text-info" />;
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">
          {t("my_orders")}
        </h1>
        <p className="text-sm text-on-surface-variant">
          {t("my_orders_desc")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "ongoing" ? "default" : "outline"}
          onClick={() => setActiveTab("ongoing")}
        >
          <Clock className="h-4 w-4 mr-2" />
          {t("pending")}
        </Button>
        <Button
          variant={activeTab === "delivered" ? "default" : "outline"}
          onClick={() => setActiveTab("delivered")}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {t("delivered")}
        </Button>
        <Button
          variant={activeTab === "cancelled" ? "default" : "outline"}
          onClick={() => setActiveTab("cancelled")}
        >
          <XCircle className="h-4 w-4 mr-2" />
          {t("cancelled")}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-container" />
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

      {!isLoading && filteredOrders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-outline mb-4" />
            <p className="text-on-surface-variant">{t("no_data")}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-secondary">
                      {formatCurrency(order.grand_total)}
                    </p>
                    <StatusPill status={order.status} label={t(order.status)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal
        open={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        title={t("order_detail")}
        footer={
          <div className="flex gap-2">
            {selectedOrder && canCancel(selectedOrder.status) && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedOrder) {
                    cancelMutation.mutate(selectedOrder.id);
                  }
                }}
                disabled={cancelMutation.isPending}
              >
                {t("cancel")}
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              {t("close")}
            </Button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-5">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                  {t("order_id")}
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  {selectedOrder.order_number}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                  {t("status")}
                </p>
                <div className="mt-1">
                  <StatusPill status={selectedOrder.status} label={t(selectedOrder.status)} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                  {t("date")}
                </p>
                <p className="mt-1 text-sm text-on-surface">
                  {new Date(selectedOrder.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                  {t("total")}
                </p>
                <p className="mt-1 text-lg font-bold text-secondary">
                  {formatCurrency(selectedOrder.grand_total)}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
                {t("order_timeline")}
              </p>
              <Timeline steps={buildTimeline(selectedOrder.status, t)} />
            </div>

            {/* Sub Orders */}
            {selectedOrder.sub_orders && selectedOrder.sub_orders.length > 0 && (
              <div className="space-y-3">
                {selectedOrder.sub_orders.map((subOrder) => (
                  <div key={subOrder.id} className="rounded-lg bg-surface-container-low p-3">
                    <div className="flex items-center justify-between mb-2">
                      {subOrder.store && (
                        <p className="text-sm font-medium text-on-surface">
                          {subOrder.store.name}
                        </p>
                      )}
                      <StatusPill status={subOrder.status} label={t(subOrder.status)} />
                    </div>

                    {/* Delivery Code */}
                    {subOrder.delivery_code && (
                      <div className="mt-2 rounded bg-surface-container p-2">
                        <p className="text-xs text-on-surface-variant mb-1">
                          {t("delivery_code")}
                        </p>
                        <p className="text-lg font-bold text-secondary tracking-widest">
                          {subOrder.delivery_code}
                        </p>
                      </div>
                    )}

                    {/* Courier */}
                    {subOrder.courier && (
                      <div className="mt-2 text-sm text-on-surface-variant">
                        <span className="font-medium">{t("courier")}:</span> {subOrder.courier.name}
                      </div>
                    )}

                    {/* Items */}
                    {subOrder.items && subOrder.items.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {subOrder.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">
                              {item.variant?.product?.name || item.variant?.name} x{item.qty}
                            </span>
                            <span className="text-on-surface">
                              {formatCurrency(Number(item.total_price))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}