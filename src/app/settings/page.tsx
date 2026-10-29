"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { DataTable } from "@yallashop/ui/data-table";
import { StatusPill } from "@yallashop/ui/status-pill";
import { Button } from "@yallashop/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@yallashop/ui/card";
import { AdminLayout } from "@/components/admin-layout";
import { Modal } from "@yallashop/ui/modal";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import type { Column } from "@yallashop/ui/data-table";
import { Search, Plus, Pencil, Trash2, Star, Settings } from "lucide-react";

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
  created_at?: string;
}

interface CurrencyForm {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
}

const emptyForm: CurrencyForm = {
  code: "",
  name: "",
  symbol: "",
  exchange_rate: 1.0,
  is_default: false,
};

export default function SettingsPage() {
  const { t, direction } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [form, setForm] = useState<CurrencyForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: currencies, isLoading, error } = useQuery<Currency[]>({
    queryKey: ["admin", "currencies"],
    queryFn: () => api.getList<Currency>("/admin/currencies"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; form: CurrencyForm }) =>
      data.id
        ? api.put(`/admin/currencies/${data.id}`, data.form)
        : api.post("/admin/currencies", data.form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "currencies"] });
      setModalOpen(false);
      setEditingCurrency(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/currencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "currencies"] });
      setDeleteConfirm(null);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/currencies/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "currencies"] });
    },
  });

  const openAdd = () => {
    setEditingCurrency(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    setForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchange_rate: currency.exchange_rate,
      is_default: currency.is_default,
    });
    setModalOpen(true);
  };

  const filtered = (currencies || []).filter(
    (c) =>
      !search ||
      c.code?.toLowerCase().includes(search.toLowerCase()) ||
      c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column[] = [
    { key: "code", label: t("currency_code"), sortable: true },
    { key: "name", label: t("currency_name"), sortable: true },
    {
      key: "symbol",
      label: t("currency_symbol"),
      sortable: true,
      render: (val) => (
        <span className="text-lg font-bold text-on-surface">{String(val)}</span>
      ),
    },
    {
      key: "exchange_rate",
      label: t("exchange_rate"),
      sortable: true,
      render: (val) => String(val),
    },
    {
      key: "is_default",
      label: t("default_currency"),
      sortable: true,
      render: (val, row) =>
        val ? (
          <StatusPill status="active" label={t("default_currency")} />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDefaultMutation.mutate(Number(row.id))}
            disabled={setDefaultMutation.isPending}
            className="gap-1"
          >
            <Star className="h-3.5 w-3.5" />
            {t("set_default")}
          </Button>
        ),
    },
    {
      key: "id",
      label: t("actions"),
      render: (_, row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row as unknown as Currency)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!row.is_default && (
            <Button
              variant="ghost"
              size="sm"
              className="text-error hover:text-error"
              onClick={() => setDeleteConfirm(Number(row.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t("currencies")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {t("view_manage_currencies")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <Input
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-64 pl-10"
            />
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("add_currency")}
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

      {currencies && (
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
        onClose={() => {
          setModalOpen(false);
          setForm(emptyForm);
          setEditingCurrency(null);
        }}
        title={editingCurrency ? t("edit_currency") : t("add_currency")}
        footer={
          <div className="flex justify-end gap-3 py-2 pb-1">
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setForm(emptyForm);
                setEditingCurrency(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ id: editingCurrency?.id, form })}
              disabled={saveMutation.isPending}
            >
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("currency_code")}
            </label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="USD"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("currency_name")}
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="US Dollar"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("currency_symbol")}
            </label>
            <Input
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              placeholder="$"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("exchange_rate")}
            </label>
            <Input
              type="number"
              step="0.000001"
              value={form.exchange_rate}
              onChange={(e) => setForm({ ...form, exchange_rate: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="h-4 w-4 rounded border-outline-variant"
            />
            <label htmlFor="is_default" className="text-sm font-medium text-on-surface">
              {t("default_currency")}
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t("delete")}
        footer={
          <div className="flex justify-end gap-3 py-2 pb-1">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {t("delete")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-on-surface-variant">
          {t("confirm_delete", { item: t("currency") })}
        </p>
      </Modal>
    </AdminLayout>
  );
}
