"use client";

import { StatusPill } from "@yallashop/ui/status-pill";
import { Button } from "@yallashop/ui/button";
import { Modal } from "@yallashop/ui/modal";
import { Timeline, type TimelineStep } from "@yallashop/ui/timeline";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";

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
    attributes?: {
      id: number;
      value: string;
      attribute?: { id: number; name: string };
      option?: { id: number; value: string };
    }[];
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

interface OrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  order: OrderDetail | null;
  isVendor: boolean;
  isAdmin: boolean;
  onStatusChange?: (subOrderId: number, status: string) => void;
  statusLoading?: boolean;
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

export function OrderDetailModal({
  open,
  onClose,
  order,
  isVendor,
  isAdmin,
  onStatusChange,
  statusLoading,
}: OrderDetailModalProps) {
  const { t } = useTranslation();
  const router = useRouter();

  if (!order) return null;

  const formatCurrency = (val: number) =>
    `${Number(val).toLocaleString()} ${t("sar_currency")}`;

  const timelineSteps = buildTimeline(order.status, t);
  const subOrderId = order.id;

  const renderActions = () => {
    if (!onStatusChange) return null;
    const status = order.status;

    return (
      <div className="flex gap-2">
        {status === "pending" && (
          <>
            <Button
              variant="outline"
              onClick={() => onStatusChange(subOrderId, "confirmed")}
              disabled={statusLoading}
            >
              {t("accept")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => onStatusChange(subOrderId, "cancelled")}
              disabled={statusLoading}
            >
              {t("reject")}
            </Button>
          </>
        )}
        {status === "confirmed" && (
          <Button
            variant="outline"
            onClick={() => onStatusChange(subOrderId, "preparing")}
            disabled={statusLoading}
          >
            {t("start_preparing")}
          </Button>
        )}
        {status === "preparing" && (
          <Button
            variant="outline"
            onClick={() => onStatusChange(subOrderId, "ready_for_pickup")}
            disabled={statusLoading}
          >
            {t("ready_for_pickup")}
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("order_detail")}
      footer={renderActions()}
    >
      <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-2">
        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              {t("order_id")}
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              {order.order_id || `#${order.id}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              {t("status")}
            </p>
            <div className="mt-1">
              <StatusPill status={order.status} label={t(order.status)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              {t("customer")}
            </p>
            <p className="mt-1 text-sm text-on-surface">
              {order.customer_name || "-"}
            </p>
            {order.customer_email && (
              <p className="text-xs text-on-surface-variant">
                {order.customer_email}
              </p>
            )}
          </div>
          {(isAdmin || isVendor) && order.vendor_name && (
            <div>
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                {t("vendor")}
              </p>
              <p className="mt-1 text-sm text-on-surface">
                {order.vendor_name}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              {t("date")}
            </p>
            <p className="mt-1 text-sm text-on-surface">
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-lg bg-surface-container-low p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
            {t("order_timeline")}
          </p>
          <Timeline steps={timelineSteps} />
        </div>

        {/* Delivery Address */}
        {order.delivery_address_snapshot && (
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
              {t("delivery_address")}
            </p>
            <p className="text-sm text-on-surface">
              {order.delivery_address_snapshot.address || "-"}
            </p>
            {order.delivery_address_snapshot.city && (
              <p className="text-xs text-on-surface-variant">
                {order.delivery_address_snapshot.city}
              </p>
            )}
            {order.delivery_address_snapshot.phone && (
              <p className="text-xs text-on-surface-variant">
                {t("phone")}: {order.delivery_address_snapshot.phone}
              </p>
            )}
          </div>
        )}

        {/* Pickup Code */}
        {order.pickup_code && (
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
              {t("pickup_code")}
            </p>
            <p className="text-lg font-bold text-secondary tracking-widest">
              {order.pickup_code}
            </p>
          </div>
        )}

        {/* Delivery Code */}
        {order.delivery_code && (
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
              {t("delivery_code")}
            </p>
            <p className="text-lg font-bold text-secondary tracking-widest">
              {order.delivery_code}
            </p>
          </div>
        )}

        {/* Courier Info */}
        {order.courier && (
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
              {t("courier_info")}
            </p>
            <p className="text-sm text-on-surface">
              {order.courier.name || "-"}
            </p>
            {order.courier.phone && (
              <p className="text-xs text-on-surface-variant">
                {order.courier.phone}
              </p>
            )}
          </div>
        )}

        {/* Items */}
        <div>
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">
            {t("order_items")}
          </p>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-2">
              {order.items.map((item) => {
                const images = (item.variant?.images && item.variant.images.length > 0) ? item.variant.images : item.variant?.product?.images;
                const imageUrl = images && images.length > 0 ? images[0].url : null;
                const attributes = item.variant?.attributes || [];
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 cursor-pointer hover:bg-surface-container transition-colors"
                    onClick={() => item.variant?.product?.id && router.push("/products/" + item.variant.product.id)}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-container">
                        <span className="text-xl">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {item.variant?.product?.title || "#" + item.id}
                        </p>
                        {item.variant?.product?.id && (
                          <ExternalLink className="h-3 w-3 text-on-surface-variant flex-shrink-0" />
                        )}
                      </div>
                      {item.variant?.sku && (
                        <p className="text-xs text-on-surface-variant">SKU: {item.variant.sku}</p>
                      )}
                      {attributes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {attributes.map((attr) => (
                            <span key={attr.id} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {attr.attribute?.name || attr.option?.value || attr.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-on-surface-variant mt-1">
                        {t("qty")}: {item.qty} x {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-on-surface whitespace-nowrap">
                      {formatCurrency(Number(item.total_price))}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">
              {order.items_count} {t("items")}
            </p>
          )}
        </div>

        {/* Price Breakdown */}
        <div className="rounded-lg bg-surface-container-low p-3 space-y-1">
          {order.items && order.items.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">{t("subtotal")}</span>
              <span className="text-on-surface">
                {formatCurrency(
                  order.items.reduce((sum, item) => sum + Number(item.total_price), 0)
                )}
              </span>
            </div>
          )}
          {order.delivery_fee != null && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">{t("delivery_fee")}</span>
              <span className="text-on-surface">
                {formatCurrency(Number(order.delivery_fee))}
              </span>
            </div>
          )}
          {order.total_amount != null && (
            <div className="flex justify-between text-base font-bold border-t border-outline-variant pt-1 mt-1">
              <span className="text-on-surface">{t("total")}</span>
              <span className="text-secondary">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}