"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { DataTable } from "@yallashop/ui/data-table";
import { StatusPill } from "@yallashop/ui/status-pill";
import { Button } from "@yallashop/ui/button";
import {
  Card,
  CardContent,
} from "@yallashop/ui/card";
import { AdminLayout } from "@/components/admin-layout";
import { Modal } from "@yallashop/ui/modal";
import { Input } from "@yallashop/ui/input";
import { Select } from "@yallashop/ui/select";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import type { Column } from "@yallashop/ui/data-table";
import { Search, Plus } from "lucide-react";

interface Payout {
  id: number;
  payee_type: string;
  payee_name: string;
  amount: number;
  period_start?: string;
  period_end?: string;
  status: string;
  created_at: string;
}

interface PayoutForm {
  payee_type: string;
  payee_id: number | null;
  amount: number;
  period_start: string;
  period_end: string;
}

const emptyForm: PayoutForm = {
  payee_type: "vendor", payee_id: null, amount: 0, period_start: "", period_end: "",
};

export default function PayoutsPage() {
  const { t, direction } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PayoutForm>(emptyForm);

  const { data: payouts, isLoading, error } = useQuery<Payout[]>({
    queryKey: ["admin", "payouts"],
    queryFn: () => api.getList<Payout>("/admin/payouts"),
  });

  const createMutation = useMutation({
    mutationFn: (form: PayoutForm) =>
      api.post("/admin/payouts", { ...form, payee_id: Number(form.payee_id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      setModalOpen(false);
      setForm(emptyForm);
    },
  });

  const filtered = (payouts || []).filter(
    (p) =>
      !search ||
      p.payee_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.payee_type?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number) =>
    `${Number(val).toLocaleString()} ${t("sar_currency")}`;

  const columns: Column[] = [
    { key: "id", label: t("id"), sortable: true },
    {
      key: "payee_type",
      label: t("payee_type"),
      sortable: true,
      render: (val) => <StatusPill status={String(val)} label={t(String(val))} />,
    },
    { key: "payee_name", label: t("payee_name"), sortable: true },
    {
      key: "amount",
      label: t("amount"),
      sortable: true,
      render: (val) => (val != null ? formatCurrency(Number(val)) : "-"),
    },
    {
      key: "period",
      label: t("period"),
      render: (_, row) => {
        const start = row.period_start ? new Date(String(row.period_start)).toLocaleDateString() : "?";
        const end = row.period_end ? new Date(String(row.period_end)).toLocaleDateString() : "?";
        return `${start} - ${end}`;
      },
    },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (val) => <StatusPill status={String(val)} label={t(String(val))} />,
    },
    {
      key: "created_at",
      label: t("date"),
      sortable: true,
      render: (val) =>
        val ? new Date(String(val)).toLocaleDateString() : "-",
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t("payouts")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {t("view_manage_payouts")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <Input
              placeholder={t("search_payouts")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-64 pl-10"
            />
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("create_payout")}
          </Button>
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

      {payouts && (
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

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setForm(emptyForm); }}
        title={t("create_payout")}
        footer={
          <div className="flex justify-end gap-3  py-2 pb-1">
            <Button variant="outline" onClick={() => { setModalOpen(false); setForm(emptyForm); }}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
            >
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("payee_type")}
            </label>
            <Select
              value={form.payee_type}
              onChange={(e) => setForm({ ...form, payee_type: e.target.value })}
            >
              <option value="vendor">{t("vendor")}</option>
              <option value="courier">{t("courier")}</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("payee_name")} ID
            </label>
            <Input
              type="number"
              value={form.payee_id ?? ""}
              onChange={(e) => setForm({ ...form, payee_id: e.target.value ? Number(e.target.value) : null })}
              placeholder="Enter payee ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("amount")} (SAR)
            </label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("period")} Start
              </label>
              <Input
                type="date"
                value={form.period_start}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("period")} End
              </label>
              <Input
                type="date"
                value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
