"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@yallashop/ui/card";
import { Button } from "@yallashop/ui/button";
import { StatusPill } from "@yallashop/ui/status-pill";
import { AdminLayout } from "@/components/admin-layout";
import { TaskDetailModal } from "./task-detail-modal";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import { Package, MapPin, Clock } from "lucide-react";

interface CourierTask {
  id: number;
  order_id?: string;
  status: string;
  store?: { id: number; name: string };
  order?: {
    customer?: { name: string; phone?: string };
  };
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

export default function CourierTasksPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"available" | "active">("available");
  const [selectedTask, setSelectedTask] = useState<CourierTask | null>(null);

  const { data: availableTasks, isLoading: loadingAvailable } = useQuery<CourierTask[]>({
    queryKey: ["courier", "tasks"],
    queryFn: () => api.getList<CourierTask>("/courier/tasks"),
  });

  const { data: activeTasks, isLoading: loadingActive } = useQuery<CourierTask[]>({
    queryKey: ["courier", "tasks", "active"],
    queryFn: () => api.getList<CourierTask>("/courier/tasks/active"),
  });

  const acceptMutation = useMutation({
    mutationFn: (subOrderId: number) => api.acceptCourierTask(subOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["courier", "tasks", "active"] });
      setSelectedTask(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (subOrderId: number) => api.rejectCourierTask(subOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["courier", "tasks", "active"] });
      setSelectedTask(null);
    },
  });

  const pickupMutation = useMutation({
    mutationFn: ({ subOrderId, code }: { subOrderId: number; code: string }) =>
      api.verifyPickupCode(subOrderId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["courier", "tasks", "active"] });
      setSelectedTask(null);
    },
  });

  const deliveryMutation = useMutation({
    mutationFn: ({ subOrderId, code }: { subOrderId: number; code: string }) =>
      api.verifyDeliveryCode(subOrderId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["courier", "tasks", "active"] });
      setSelectedTask(null);
    },
  });

  const formatCurrency = (val: number) =>
    `${Number(val).toLocaleString()} ${t("sar_currency")}`;

  const isLoading = activeTab === "available" ? loadingAvailable : loadingActive;
  const tasks = activeTab === "available" ? availableTasks : activeTasks;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">
          {t("courier_tasks")}
        </h1>
        <p className="text-sm text-on-surface-variant">
          {t("view_manage_couriers")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "available" ? "default" : "outline"}
          onClick={() => setActiveTab("available")}
          className="gap-2"
        >
          <Package className="h-4 w-4" />
          {t("available_tasks")}
          {availableTasks && (
            <span className="ml-1 rounded-full bg-secondary-container px-2 py-0.5 text-xs">
              {availableTasks.length}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === "active" ? "default" : "outline"}
          onClick={() => setActiveTab("active")}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          {t("active_tasks")}
          {activeTasks && (
            <span className="ml-1 rounded-full bg-secondary-container px-2 py-0.5 text-xs">
              {activeTasks.length}
            </span>
          )}
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-surface-container" />
          ))}
        </div>
      )}

      {!isLoading && tasks && tasks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-outline mb-4" />
            <p className="text-on-surface-variant">
              {activeTab === "available" ? t("no_available_tasks") : t("no_active_tasks")}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && tasks && tasks.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTask(task)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {task.order_id || `#${task.id}`}
                  </CardTitle>
                  <StatusPill status={task.status} label={t(task.status)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {task.store && (
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Package className="h-4 w-4" />
                      <span>{task.store.name}</span>
                    </div>
                  )}
                  {task.delivery_address_snapshot?.city && (
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <MapPin className="h-4 w-4" />
                      <span>{task.delivery_address_snapshot.city}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                    <span className="text-xs text-on-surface-variant">
                      {task.items_count} {t("items")}
                    </span>
                    {task.total_amount != null && (
                      <span className="text-sm font-semibold text-on-surface">
                        {formatCurrency(task.total_amount)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TaskDetailModal
        open={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        isAvailable={activeTab === "available"}
        onAccept={(id) => acceptMutation.mutate(id)}
        onReject={(id) => rejectMutation.mutate(id)}
        onVerifyPickup={(id, code) => pickupMutation.mutate({ subOrderId: id, code })}
        onVerifyDelivery={(id, code) => deliveryMutation.mutate({ subOrderId: id, code })}
        loading={acceptMutation.isPending || rejectMutation.isPending || pickupMutation.isPending || deliveryMutation.isPending}
      />
    </AdminLayout>
  );
}