"use client";

import { useState } from "react";
import { StatusPill } from "@yallashop/ui/status-pill";
import { Button } from "@yallashop/ui/button";
import { Modal } from "@yallashop/ui/modal";
import { Timeline, type TimelineStep } from "@yallashop/ui/timeline";
import { VerificationCodeInput } from "@yallashop/ui/verification-code-input";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import { Package, MapPin, Phone, User } from "lucide-react";

interface CourierTask {
  id: number;
  order_id?: string;
  status: string;
  store?: { id: number; name: string };
  order?: {
    customer?: { name: string; phone?: string };
  };
  items?: Array<{
    id: number;
    qty: number;
    unit_price: number;
    total_price: number;
    variant?: { name: string; product?: { name: string } };
  }>;
  items_count?: number;
  total_amount?: number;
  delivery_fee?: number;
  created_at: string;
  delivery_address_snapshot?: {
    address?: string;
    city?: string;
    phone?: string;
  } | null;
}

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: CourierTask | null;
  isAvailable: boolean;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  onVerifyPickup: (id: number, code: string) => void;
  onVerifyDelivery: (id: number, code: string) => void;
  loading: boolean;
}

const TIMELINE_STEPS = [
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

export function TaskDetailModal({
  open,
  onClose,
  task,
  isAvailable,
  onAccept,
  onReject,
  onVerifyPickup,
  onVerifyDelivery,
  loading,
}: TaskDetailModalProps) {
  const { t } = useTranslation();
  const [codeError, setCodeError] = useState("");

  if (!task) return null;

  const formatCurrency = (val: number) =>
    `${Number(val).toLocaleString()} ${t("sar_currency")}`;

  const timelineSteps = buildTimeline(task.status, t);

  const handleCodeSubmit = (code: string) => {
    setCodeError("");
    if (task.status === "waiting_for_driver") {
      onVerifyPickup(task.id, code);
    } else if (task.status === "with_driver") {
      onVerifyDelivery(task.id, code);
    }
  };

  const renderActions = () => {
    if (isAvailable) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onAccept(task.id)}
            disabled={loading}
          >
            {t("accept_task")}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        {task.status === "waiting_for_driver" && (
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
        )}
        {task.status === "with_driver" && (
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
        )}
        {task.status !== "waiting_for_driver" && task.status !== "with_driver" && (
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("task_detail")}
      footer={renderActions()}
    >
      <div className="space-y-5">
        {/* Task Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              {t("order_id")}
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              {task.order_id || `#${task.id}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              {t("status")}
            </p>
            <div className="mt-1">
              <StatusPill status={task.status} label={t(task.status)} />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-lg bg-surface-container-low p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
            {t("order_timeline")}
          </p>
          <Timeline steps={timelineSteps} />
        </div>

        {/* Store Info */}
        {task.store && (
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
              {t("store_name_label")}
            </p>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-on-surface-variant" />
              <p className="text-sm text-on-surface">{task.store.name}</p>
            </div>
          </div>
        )}

        {/* Customer Info */}
        {task.order?.customer && (
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
              {t("customer")}
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-on-surface-variant" />
                <p className="text-sm text-on-surface">{task.order.customer.name}</p>
              </div>
              {task.order.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-on-surface-variant" />
                  <p className="text-xs text-on-surface-variant">{task.order.customer.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delivery Address */}
        {task.delivery_address_snapshot && (
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
              {t("delivery_address")}
            </p>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-on-surface-variant mt-0.5" />
              <div>
                <p className="text-sm text-on-surface">
                  {task.delivery_address_snapshot.address || "-"}
                </p>
                {task.delivery_address_snapshot.city && (
                  <p className="text-xs text-on-surface-variant">
                    {task.delivery_address_snapshot.city}
                  </p>
                )}
                {task.delivery_address_snapshot.phone && (
                  <p className="text-xs text-on-surface-variant">
                    {t("phone")}: {task.delivery_address_snapshot.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        {task.items && task.items.length > 0 && (
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">
              {t("order_items")}
            </p>
            <div className="space-y-2">
              {task.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-surface-container-low p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface">
                      {item.variant?.product?.name || item.variant?.name || `#${item.id}`}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {t("qty")}: {item.qty}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-on-surface">
                    {formatCurrency(Number(item.total_price))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pickup Code Entry */}
        {task.status === "waiting_for_driver" && !isAvailable && (
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
              {t("enter_pickup_code")}
            </p>
            <VerificationCodeInput
              onSubmit={handleCodeSubmit}
              error={codeError}
              loading={loading}
            />
          </div>
        )}

        {/* Delivery Code Entry */}
        {task.status === "with_driver" && !isAvailable && (
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
              {t("enter_delivery_code")}
            </p>
            <VerificationCodeInput
              onSubmit={handleCodeSubmit}
              error={codeError}
              loading={loading}
            />
          </div>
        )}

        {/* Price Summary */}
        <div className="rounded-lg bg-surface-container-low p-3 space-y-1">
          {task.delivery_fee != null && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">{t("delivery_fee")}</span>
              <span className="text-on-surface">
                {formatCurrency(Number(task.delivery_fee))}
              </span>
            </div>
          )}
          {task.total_amount != null && (
            <div className="flex justify-between text-base font-bold border-t border-outline-variant pt-1 mt-1">
              <span className="text-on-surface">{t("total")}</span>
              <span className="text-secondary">
                {formatCurrency(task.total_amount)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}