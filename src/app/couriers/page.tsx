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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import type { Column } from "@yallashop/ui/data-table";
import { Search, CheckCircle, Pencil, Trash2 } from "lucide-react";

interface Courier {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  completed_deliveries?: number;
  rating?: number;
  created_at?: string;
}

interface CourierForm {
  name: string;
  email: string;
  phone: string;
  status: string;
}

const emptyForm: CourierForm = { name: "", email: "", phone: "", status: "active" };

export default function CouriersPage() {
  const { t, direction } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [form, setForm] = useState<CourierForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: couriers, isLoading, error } = useQuery<Courier[]>({
    queryKey: ["admin", "couriers"],
    queryFn: () => api.getList<Courier>("/admin/couriers"),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/couriers/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "couriers"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id: number; form: CourierForm }) =>
      api.put(`/admin/couriers/${data.id}`, data.form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "couriers"] });
      setModalOpen(false);
      setEditingCourier(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/couriers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "couriers"] });
      setDeleteConfirm(null);
    },
  });

  const openEdit = (courier: Courier) => {
    setEditingCourier(courier);
    setForm({
      name: courier.name,
      email: courier.email,
      phone: courier.phone ?? "",
      status: courier.status,
    });
    setModalOpen(true);
  };

  const filtered = (couriers || []).filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column[] = [
    { key: "name", label: t("courier_name"), sortable: true },
    { key: "email", label: t("email"), sortable: true },
    {
      key: "phone",
      label: t("phone"),
      sortable: true,
      render: (val) => String(val || "-"),
    },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (val) => <StatusPill status={String(val)} label={t(String(val))} />,
    },
    {
      key: "completed_deliveries",
      label: t("completed_deliveries"),
      sortable: true,
      render: (val) => String(val ?? 0),
    },
    {
      key: "rating",
      label: t("rating"),
      sortable: true,
      render: (val) => (val != null ? `${Number(val).toFixed(1)} ★` : "-"),
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
          <Button variant="ghost" size="sm" onClick={() => openEdit(row as unknown as Courier)}>
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
            {t("couriers")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {t("view_manage_couriers")}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <Input
            placeholder={t("search_couriers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-64 pl-10"
          />
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

      {couriers && (
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
        onClose={() => { setModalOpen(false); setForm(emptyForm); setEditingCourier(null); }}
        title={t("edit_courier")}
        footer={
          <div className="flex justify-end gap-3  py-2 pb-1">
            <Button variant="outline" onClick={() => { setModalOpen(false); setForm(emptyForm); setEditingCourier(null); }}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => editingCourier && saveMutation.mutate({ id: editingCourier.id, form })}
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
              {t("courier_name")}
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
              {t("phone")}
            </label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("status")}
            </label>
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">{t("active")}</option>
              <option value="suspended">{t("suspended")}</option>
            </Select>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t("delete_courier")}
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
          {t("confirm_delete_courier")}
        </p>
      </Modal>
    </AdminLayout>
  );
}
