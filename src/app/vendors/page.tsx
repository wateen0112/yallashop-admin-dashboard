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
import { Search, Plus, Pencil, Trash2, CheckCircle } from "lucide-react";

interface Vendor {
  id: number;
  name: string;
  email: string;
  status: string;
  commission?: number;
  city?: string;
  created_at?: string;
}

interface VendorForm {
  name: string;
  email: string;
  commission: number;
  city: string;
}

const emptyForm: VendorForm = { name: "", email: "", commission: 0, city: "" };

export default function VendorsPage() {
  const { t, direction } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: vendors, isLoading, error } = useQuery<Vendor[]>({
    queryKey: ["admin", "vendors"],
    queryFn: () => api.getList<Vendor>("/admin/vendors"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; form: VendorForm }) =>
      data.id
        ? api.put(`/admin/vendors/${data.id}`, data.form)
        : api.post("/admin/vendors", data.form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      setModalOpen(false);
      setEditingVendor(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
      setDeleteConfirm(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/vendors/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors"] });
    },
  });

  const openAdd = () => {
    setEditingVendor(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name,
      email: vendor.email,
      commission: vendor.commission ?? 0,
      city: vendor.city ?? "",
    });
    setModalOpen(true);
  };

  const filtered = (vendors || []).filter(
    (v) =>
      !search ||
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column[] = [
    { key: "name", label: t("store_name"), sortable: true },
    { key: "email", label: t("email"), sortable: true },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (val) => <StatusPill status={String(val)} label={t(String(val))} />,
    },
    {
      key: "commission",
      label: t("commission"),
      sortable: true,
      render: (val) => (val != null ? `${val}%` : "-"),
    },
    {
      key: "city",
      label: t("city"),
      sortable: true,
      render: (val) => String(val || "-"),
    },
    {
      key: "created_at",
      label: t("created_at"),
      sortable: true,
      render: (val) =>
        val ? new Date(String(val)).toLocaleDateString() : "-",
    },
    {
      key: "id",
      label: t("actions"),
      render: (_, row) => (
        <div className="flex gap-2">
          {row.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => approveMutation.mutate(Number(row.id))}
              disabled={approveMutation.isPending}
              className="gap-1"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {t("approve")}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openEdit(row as unknown as Vendor)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-error hover:text-error"
            onClick={() => setDeleteConfirm(Number(row.id))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t("vendors")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {t("view_manage_vendors")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <Input
              placeholder={t("search_vendors")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-64 pl-10"
            />
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("add_vendor")}
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

      {vendors && (
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
        onClose={() => { setModalOpen(false); setForm(emptyForm); setEditingVendor(null); }}
        title={editingVendor ? t("edit_vendor") : t("add_vendor")}
        footer={
          <div className="flex justify-end gap-3  py-2 pb-1">
            <Button variant="outline" onClick={() => { setModalOpen(false); setForm(emptyForm); setEditingVendor(null); }}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ id: editingVendor?.id, form })}
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
              {t("store_name")}
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("email")}
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("commission")} (%)
            </label>
            <Input
              type="number"
              value={form.commission}
              onChange={(e) => setForm({ ...form, commission: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("city")}
            </label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t("delete")}
        footer={
          <div className="flex justify-end gap-3  py-2 pb-1">
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
          {t("confirm_delete", { item: t("vendor") })}
        </p>
      </Modal>
    </AdminLayout>
  );
}
