"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { DataTable } from "@yallashop/ui/data-table";
import { StatusPill } from "@yallashop/ui/status-pill";
import { Button } from "@yallashop/ui/button";
import { Card, CardContent } from "@yallashop/ui/card";
import { Modal } from "@yallashop/ui/modal";
import { Input } from "@yallashop/ui/input";
import { Textarea } from "@yallashop/ui/textarea";
import { Select } from "@yallashop/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import type { Column } from "@yallashop/ui/data-table";
import { Search, Plus, Pencil, Trash2, Upload, X, Film, Image as ImageIcon } from "lucide-react";

interface CarouselAd {
  id: number;
  title: string;
  description?: string;
  media_type: "image" | "video";
  media_url: string;
  link_type: "external" | "product" | "category";
  link_target: string;
  duration_ms: number;
  sort_order: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

interface CarouselAdForm {
  title: string;
  description: string;
  media_file: File | null;
  link_type: "external" | "product" | "category";
  link_target: string;
  duration_ms: number;
  sort_order: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const emptyForm: CarouselAdForm = {
  title: "",
  description: "",
  media_file: null,
  link_type: "external",
  link_target: "",
  duration_ms: 3000,
  sort_order: 0,
  is_active: true,
  start_date: "",
  end_date: "",
};

export default function CarouselAdsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CarouselAd | null>(null);
  const [form, setForm] = useState<CarouselAdForm>(emptyForm);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: carouselAds, isLoading, error } = useQuery<CarouselAd[]>({
    queryKey: ["admin", "carousel-ads"],
    queryFn: () => api.getList<CarouselAd>("/admin/carousel-ads"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; form: CarouselAdForm }) => {
      const formData = new FormData();
      formData.append("title", data.form.title);
      if (data.form.description) formData.append("description", data.form.description);
      if (data.form.media_file) formData.append("media_file", data.form.media_file);
      formData.append("link_type", data.form.link_type);
      formData.append("link_target", data.form.link_target);
      formData.append("duration_ms", String(data.form.duration_ms));
      formData.append("sort_order", String(data.form.sort_order));
      formData.append("is_active", data.form.is_active ? "1" : "0");
      if (data.form.start_date) formData.append("start_date", data.form.start_date);
      if (data.form.end_date) formData.append("end_date", data.form.end_date);

      return data.id
        ? api.putForm(`/admin/carousel-ads/${data.id}`, formData)
        : api.postForm("/admin/carousel-ads", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel-ads"] });
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setPreviewUrl(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/carousel-ads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel-ads"] });
      setDeleteConfirm(null);
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setPreviewUrl(null);
    setModalOpen(true);
  };

  const openEdit = (ad: CarouselAd) => {
    setEditing(ad);
    setForm({
      title: ad.title,
      description: ad.description ?? "",
      media_file: null,
      link_type: ad.link_type,
      link_target: ad.link_target,
      duration_ms: ad.duration_ms ?? 3000,
      sort_order: ad.sort_order ?? 0,
      is_active: ad.is_active,
      start_date: ad.start_date ?? "",
      end_date: ad.end_date ?? "",
    });
    setPreviewUrl(ad.media_url);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm({ ...form, media_file: file });
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeFile = () => {
    setForm({ ...form, media_file: null });
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = (carouselAds || []).filter(
    (ad) => !search || ad.title?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column[] = [
    { key: "title", label: t("title"), sortable: true },
    {
      key: "media_type",
      label: t("media_type"),
      sortable: true,
      render: (val) => (
        <span className="capitalize">{String(val)}</span>
      ),
    },
    {
      key: "link_type",
      label: t("link_type"),
      sortable: true,
      render: (val) => (
        <span className="capitalize">{String(val)}</span>
      ),
    },
    {
      key: "is_active",
      label: t("status"),
      sortable: true,
      render: (val) => (
        <StatusPill
          status={val ? "active" : "suspended"}
          label={t(val ? "active" : "inactive")}
        />
      ),
    },
    {
      key: "sort_order",
      label: t("sort_order"),
      sortable: true,
      render: (val) => String(val ?? 0),
    },
    {
      key: "id",
      label: t("actions"),
      render: (_, row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row as unknown as CarouselAd)}>
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
            {t("carousel_ads")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {t("view_manage_carousel_ads")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <Input
              placeholder={t("search_carousel_ads")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-64 pl-10"
            />
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("add_carousel_ad")}
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

      {carouselAds && (
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
        onClose={() => { setModalOpen(false); setForm(emptyForm); setEditing(null); setPreviewUrl(null); }}
        title={editing ? t("edit_carousel_ad") : t("add_carousel_ad")}
        footer={
          <div className="flex justify-end gap-3 py-2 pb-1">
            <Button variant="outline" onClick={() => { setModalOpen(false); setForm(emptyForm); setEditing(null); setPreviewUrl(null); }}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ id: editing?.id, form })}
              disabled={saveMutation.isPending}
            >
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("title")} *
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("enter_title")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("description")}
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("enter_description")}
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("media_file")} *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <div className="relative rounded-lg border border-outline-variant overflow-hidden">
                {form.media_file?.type.startsWith("video/") || (!form.media_file && editing?.media_type === "video") ? (
                  <video src={previewUrl} className="w-full h-40 object-cover" controls />
                ) : (
                  <img src={previewUrl} className="w-full h-40 object-cover" alt="Preview" />
                )}
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {form.media_file?.type.startsWith("video/") || (!form.media_file && editing?.media_type === "video") ? (
                    <><Film className="h-3 w-3" /> {t("video")}</>
                  ) : (
                    <><ImageIcon className="h-3 w-3" /> {t("image")}</>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant rounded-lg p-8 text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">{t("upload_media")}</span>
                <span className="text-xs">{t("upload_media_hint")}</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("link_type")} *
              </label>
              <Select
                value={form.link_type}
                onChange={(e) => setForm({ ...form, link_type: e.target.value as "external" | "product" | "category" })}
              >
                <option value="external">{t("external")}</option>
                <option value="product">{t("product")}</option>
                <option value="category">{t("category")}</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("duration")} (ms)
              </label>
              <Input
                type="number"
                value={form.duration_ms}
                onChange={(e) => setForm({ ...form, duration_ms: Number(e.target.value) })}
                placeholder="3000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("link_target")} *
            </label>
            <Input
              value={form.link_target}
              onChange={(e) => setForm({ ...form, link_target: e.target.value })}
              placeholder={t("enter_link_target")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("sort_order")}
              </label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2 pb-1">
                <input
                  type="checkbox"
                  id="is_active"
                  className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary/30"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="text-sm font-medium text-on-surface cursor-pointer">
                  {t("is_active")}
                </label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("start_date")}
              </label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("end_date")}
              </label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t("delete_carousel_ad")}
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
          {t("confirm_delete_carousel_ad")}
        </p>
      </Modal>
    </AdminLayout>
  );
}
