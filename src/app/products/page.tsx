"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { DataTable } from "@yallashop/ui/data-table";
import { StatusPill } from "@yallashop/ui/status-pill";
import { Button } from "@yallashop/ui/button";
import { Card, CardContent } from "@yallashop/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@yallashop/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import type { Column } from "@yallashop/ui/data-table";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface ProductMedia {
  url: string;
  type: string;
  sort_order: number;
}

interface Product {
  id: number;
  title: string;
  base_price: number;
  category_id?: number;
  category_name?: string;
  status: string;
  rating?: number;
  store_name?: string;
  store_id?: number;
  images?: ProductMedia[];
}

interface Category {
  id: number;
  name: string;
}

interface Store {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const { t, direction } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const user = api.getUser();
  const isVendor = user?.role === "vendor";

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ["admin", "products"],
    queryFn: () => api.getList<Product>("/admin/products"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setDeleteConfirm(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.updateProductStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  const filtered = (products || []).filter(
    (p) =>
      !search ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.store_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number) =>
    `${Number(val).toLocaleString()} ${t("sar_currency")}`;

  const columns: Column[] = [
    { key: "id", label: t("id"), sortable: true },
    {
      key: "images",
      label: t("image"),
      render: (val) => {
        const imgs = val as ProductMedia[] | undefined;
        if (!imgs || imgs.length === 0) return <span className="text-outline">-</span>;
        const first = imgs[0];
        return (
          <div className="relative">
            <img src={first.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            {imgs.length > 1 && (
              <span className="absolute -bottom-1 -right-1 bg-surface text-on-surface text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center border border-outline-variant">
                {imgs.length}
              </span>
            )}
          </div>
        );
      },
    },
    { key: "title", label: t("product_title"), sortable: true },
    {
      key: "base_price",
      label: t("base_price"),
      sortable: true,
      render: (val) => (val != null ? formatCurrency(Number(val)) : "-"),
    },
    {
      key: "category_name",
      label: t("category"),
      sortable: true,
      render: (val) => String(val || "-"),
    },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (val) => (
        <StatusPill
          status={String(val)}
          label={t(String(val))}
        />
      ),
    },
    {
      key: "rating",
      label: t("rating"),
      sortable: true,
      render: (val) => (val != null ? `${Number(val).toFixed(1)} ★` : "-"),
    },
    {
      key: "store_name",
      label: t("store"),
      sortable: true,
      render: (val) => String(val || "-"),
    },
    {
      key: "id",
      label: t("actions"),
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {!isVendor && (
            <Select
              value={String(row.status || "active")}
              onChange={(e) =>
                statusMutation.mutate({ id: Number(row.id), status: e.target.value })
              }
              disabled={statusMutation.isPending}
              className="h-8 w-32 text-xs"
            >
              <option value="active">{t("active")}</option>
              <option value="pending">{t("pending")}</option>
              <option value="draft">{t("draft")}</option>
              <option value="rejected">{t("rejected")}</option>
              <option value="archived">{t("archived")}</option>
            </Select>
          )}
          {isVendor && (
            <StatusPill
              status={String(row.status || "active")}
              label={t(String(row.status || "active"))}
            />
          )}
          <Link href={`/products/${row.id}`}>
            <Button variant="ghost" size="sm">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
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
            {t("products")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {t("view_manage_products")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <Input
              placeholder={t("search_products")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-64 pl-10"
            />
          </div>
          <Link href="/products/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("add_product")}
            </Button>
          </Link>
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

      {products && (
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

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ${deleteConfirm !== null ? "block" : "hidden"}`}
        onClick={() => setDeleteConfirm(null)}
      >
        <div className="bg-surface rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold text-on-surface mb-4">{t("delete_product")}</h3>
          <p className="text-sm text-on-surface-variant mb-6">{t("confirm_delete_product")}</p>
          <div className="flex justify-end gap-3">
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
        </div>
      </div>
    </AdminLayout>
  );
}