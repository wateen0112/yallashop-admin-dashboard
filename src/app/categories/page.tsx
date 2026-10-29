"use client";

import { useEffect } from "react";
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
import { Modal } from "@yallashop/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@yallashop/ui/textarea";
import { Select } from "@yallashop/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import type { Column } from "@yallashop/ui/data-table";
import { Search, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, PlusCircle, Trash, GripVertical } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  sort_order?: number;
  is_active: boolean;
  status?: string;
  image?: string;
  products_count?: number;
  attributes?: CategoryAttribute[];
}

interface CategoryAttribute {
  id: number;
  category_id: number;
  name: string;
  type: "select" | "text";
  is_required: boolean;
  sort_order: number;
  options: CategoryAttributeOption[];
}

interface CategoryAttributeOption {
  id: number;
  attribute_id: number;
  value: string;
  sort_order: number;
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  image_file: File | null;
  image_preview: string;
  attributes: CategoryAttributeForm[];
}

interface CategoryAttributeForm {
  id?: number;
  name: string;
  type: "select" | "text";
  is_required: boolean;
  sort_order: number;
  options: { value: string; sort_order: number }[];
}

interface CategoryAttributeOptionForm {
  value: string;
  sort_order: number;
}

const emptyForm: CategoryForm = {
  name: "", slug: "", description: "", parent_id: null, sort_order: 0, is_active: true, image_file: null, image_preview: "", attributes: [],
};

const emptyAttribute: CategoryAttributeForm = {
  name: "",
  type: "select",
  is_required: true,
  sort_order: 0,
  options: [],
};

const emptyOption = { value: "", sort_order: 0 };

export default function CategoriesPage() {
  const { t, direction } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const user = api.getUser();
  const isVendor = user?.role === "vendor";

  const { data: categories, isLoading, error } = useQuery<Category[]>({
    queryKey: ["admin", "categories"],
    queryFn: () => api.getList<Category>("/admin/categories"),
  });

  // Fetch category attributes when editing
  useEffect(() => {
    if (editing?.id) {
      setIsLoadingAttributes(true);
      api.getList<CategoryAttribute>(`/admin/categories/${editing.id}/attributes`)
        .then((result) => {
          // api.getList returns the data array directly
          setForm(prev => ({
            ...prev,
            attributes: result.map(attr => ({
              id: attr.id,
              name: attr.name,
              type: attr.type,
              is_required: attr.is_required,
              sort_order: attr.sort_order,
              options: attr.options.map(opt => ({ value: opt.value, sort_order: opt.sort_order })),
            }))
          }));
        })
        .catch(() => {})
        .finally(() => setIsLoadingAttributes(false));
    } else if (!editing) {
      setForm({ ...emptyForm, attributes: [] });
    }
  }, [editing]);

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: number; form: CategoryForm }) => {
      const processedAttributes = data.form.attributes.map(attr => ({
        ...attr,
        options: attr.options.filter(o => o.value.trim()),
      }));

      if (data.form.image_file) {
        const fd = new FormData();
        fd.append("name", data.form.name);
        fd.append("slug", data.form.slug);
        fd.append("description", data.form.description);
        if (data.form.parent_id) fd.append("parent_id", String(data.form.parent_id));
        fd.append("sort_order", String(data.form.sort_order));
        fd.append("is_active", data.form.is_active ? "1" : "0");
        fd.append("image_file", data.form.image_file);
        fd.append("attributes", JSON.stringify(processedAttributes));

        return data.id
          ? api.putForm(`/admin/categories/${data.id}`, fd)
          : api.postForm("/admin/categories", fd);
      }

      const payload = {
        name: data.form.name,
        slug: data.form.slug,
        description: data.form.description,
        parent_id: data.form.parent_id || null,
        sort_order: data.form.sort_order,
        is_active: data.form.is_active,
        attributes: processedAttributes,
      };

      return data.id
        ? api.put(`/admin/categories/${data.id}`, payload)
        : api.post("/admin/categories", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setDeleteConfirm(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.updateCategoryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, attributes: [] });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      parent_id: cat.parent_id ?? null,
      sort_order: cat.sort_order ?? 0,
      is_active: cat.is_active,
      image_file: null,
      image_preview: cat.image ?? "",
      attributes: [],
    });
    setModalOpen(true);
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const filtered = (categories || []).filter(
    (c) => !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column[] = [
    {
      key: "image",
      label: t("image"),
      render: (val) =>
        val ? (
          <img src={String(val)} alt="" className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <span className="text-outline">-</span>
        ),
    },
    { key: "name", label: t("category_name"), sortable: true },
    { key: "slug", label: t("slug"), sortable: true },
    {
      key: "description",
      label: t("description"),
      render: (val) => {
        const s = String(val || "");
        return s.length > 40 ? s.slice(0, 40) + "..." : s || "-";
      },
    },
    {
      key: "parent_id",
      label: t("parent_category"),
      render: (val) => {
        if (!val || !categories) return "-";
        const parent = categories.find((c) => c.id === Number(val));
        return parent?.name ?? "-";
      },
    },
    {
      key: "sort_order",
      label: t("sort_order"),
      sortable: true,
      render: (val) => String(val ?? 0),
    },
    {
      key: "is_active",
      label: t("active"),
      sortable: true,
      render: (val) => (
        <StatusPill
          status={val ? "active" : "suspended"}
          label={t(val ? "active" : "inactive")}
        />
      ),
    },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      render: (val) => (
        <StatusPill
          status={String(val || "approved")}
          label={t(String(val || "approved"))}
        />
      ),
    },
    {
      key: "products_count",
      label: t("products_count"),
      sortable: true,
      render: (val) => String(val ?? 0),
    },
    {
      key: "id",
      label: t("actions"),
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {!isVendor && (
            <Select
              value={String(row.status || "approved")}
              onChange={(e) =>
                statusMutation.mutate({ id: Number(row.id), status: e.target.value })
              }
              disabled={statusMutation.isPending}
              className="h-8 w-32 text-xs"
            >
              <option value="pending">{t("pending")}</option>
              <option value="approved">{t("approved")}</option>
              <option value="rejected">{t("rejected")}</option>
              <option value="disabled">{t("disabled")}</option>
            </Select>
          )}
          {isVendor && (
            <StatusPill
              status={String(row.status || "approved")}
              label={t(String(row.status || "approved"))}
            />
          )}
          <Button variant="ghost" size="sm" onClick={() => openEdit(row as unknown as Category)}>
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

  // Helper functions for attribute management
  const addAttribute = () => {
    setForm(prev => ({ ...prev, attributes: [...prev.attributes, { ...emptyAttribute }] }));
  };

  const removeAttribute = (aIndex: number) => {
    const updated = [...form.attributes];
    updated.splice(aIndex, 1);
    setForm({ ...form, attributes: updated });
  };

  const updateAttribute = (aIndex: number, field: keyof CategoryAttributeForm, value: string | number | boolean) => {
    const updated = [...form.attributes];
    updated[aIndex] = { ...updated[aIndex], [field]: value };
    setForm({ ...form, attributes: updated });
  };

  const addAttributeOption = (aIndex: number) => {
    const updated = [...form.attributes];
    updated[aIndex] = {
      ...updated[aIndex],
      options: [...updated[aIndex].options, { ...emptyOption }],
    };
    setForm({ ...form, attributes: updated });
  };

  const removeAttributeOption = (aIndex: number, oIndex: number) => {
    const updated = [...form.attributes];
    updated[aIndex] = {
      ...updated[aIndex],
      options: updated[aIndex].options.filter((_, i) => i !== oIndex),
    };
    setForm({ ...form, attributes: updated });
  };

  const updateAttributeOption = (aIndex: number, oIndex: number, field: "value" | "sort_order", value: string | number) => {
    const updated = [...form.attributes];
    updated[aIndex] = {
      ...updated[aIndex],
      options: updated[aIndex].options.map((opt, i) =>
        i === oIndex ? { ...opt, [field]: value } : opt
      ),
    };
    setForm({ ...form, attributes: updated });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t("categories")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {t("view_manage_categories")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <Input
              placeholder={t("search_categories")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-64 pl-10"
            />
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("add_category")}
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

      {categories && (
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
        onClose={() => { setModalOpen(false); setForm(emptyForm); setEditing(null); }}
        title={editing ? t("edit_category") : t("add_category")}
        footer={
          <div className="flex justify-end gap-3  py-2 pb-1">
            <Button variant="outline" onClick={() => { setModalOpen(false); setForm(emptyForm); setEditing(null); }}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ id: editing?.id, form })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("category_name")}
            </label>
            <Input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm({ ...form, name, slug: editing ? form.slug : generateSlug(name) });
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("slug")}
            </label>
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("description")}
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("parent_category")}
            </label>
            <Select
              value={form.parent_id ?? ""}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">{t("none")}</option>
              {(categories || [])
                .filter((c) => c.id !== editing?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("sort_order")}
              </label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary/30"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span className="text-sm font-medium text-on-surface">{t("is_active")}</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("image")}
            </label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-container file:px-4 file:py-2 file:text-sm file:font-medium file:text-on-secondary-container hover:file:bg-secondary-container/80"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) {
                  setForm({
                    ...form,
                    image_file: file,
                    image_preview: URL.createObjectURL(file),
                  });
                }
              }}
            />
            {form.image_preview && (
              <img
                src={form.image_preview}
                alt="Preview"
                className="mt-2 h-20 w-20 rounded-lg object-cover border border-outline-variant"
              />
            )}
          </div>

          {/* Attributes Section */}
          <div className="border-t border-outline-variant pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-on-surface">
                {t("attributes")}
              </h3>
              <Button variant="outline" size="sm" onClick={addAttribute} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                {t("add_attribute")}
              </Button>
            </div>

            {isLoadingAttributes && (
              <div className="text-center py-4 text-on-surface-variant">
                {t("loading")}
              </div>
            )}

            {form.attributes.length === 0 && !isLoadingAttributes && (
              <div className="text-center py-8 text-on-surface-variant border-2 border-dashed border-outline-variant rounded-lg">
                <p className="mb-2">{t("no_attributes_added")}</p>
                <Button variant="outline" onClick={addAttribute} className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  {t("add_first_attribute")}
                </Button>
              </div>
            )}

            {form.attributes.map((attr, aIndex) => (
              <Card key={aIndex} className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-on-surface mb-1">
                            {t("attribute_name")}
                          </label>
                          <Input
                            value={attr.name}
                            onChange={(e) => updateAttribute(aIndex, "name", e.target.value)}
                            placeholder={t("enter_attribute_name")}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-on-surface mb-1">
                            {t("attribute_type")}
                          </label>
                          <Select
                            value={attr.type}
                            onChange={(e) => updateAttribute(aIndex, "type", e.target.value as "select" | "text")}
                          >
                            <option value="select">{t("select")}</option>
                            <option value="text">{t("text")}</option>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-on-surface mb-1">
                            {t("sort_order")}
                          </label>
                          <Input
                            type="number"
                            value={attr.sort_order}
                            onChange={(e) => updateAttribute(aIndex, "sort_order", Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-on-surface mb-1">
                            {t("is_required")}
                          </label>
                          <Select
                            value={String(attr.is_required)}
                            onChange={(e) => updateAttribute(aIndex, "is_required", e.target.value === "true")}
                          >
                            <option value="true">{t("yes")}</option>
                            <option value="false">{t("no")}</option>
                          </Select>
                        </div>
                      </div>

                      {attr.type === "select" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-on-surface mb-1">
                              {t("options")}
                            </label>
                            <Button variant="outline" size="sm" onClick={() => addAttributeOption(aIndex)} className="gap-2">
                              <PlusCircle className="h-4 w-4" />
                              {t("add_option")}
                            </Button>
                          </div>

                          {attr.options.length === 0 ? (
                            <p className="text-sm text-on-surface-variant">{t("no_options_defined")}</p>
                          ) : (
                            <div className="space-y-2">
                              {attr.options.map((opt, oIndex) => {
                                const isColorAttr = attr.name.toLowerCase() === "color";
                                return (
                                  <div key={oIndex} className="flex gap-2 items-center">
                                    {isColorAttr ? (
                                      <>
                                        <input
                                          type="color"
                                          value={opt.value || "#000000"}
                                          onChange={(e) => updateAttributeOption(aIndex, oIndex, "value", e.target.value)}
                                          className="h-9 w-12 rounded border border-outline-variant cursor-pointer"
                                        />
                                        <Input
                                          value={opt.value}
                                          onChange={(e) => updateAttributeOption(aIndex, oIndex, "value", e.target.value)}
                                          placeholder="#000000"
                                          className="w-28"
                                        />
                                        <span
                                          className="h-6 w-6 rounded-full border border-outline-variant flex-shrink-0"
                                          style={{ backgroundColor: opt.value || "#000000" }}
                                        />
                                      </>
                                    ) : (
                                      <Input
                                        value={opt.value}
                                        onChange={(e) => updateAttributeOption(aIndex, oIndex, "value", e.target.value)}
                                        placeholder={t("option_value")}
                                        className="flex-1"
                                      />
                                    )}
                                    <Input
                                      type="number"
                                      value={opt.sort_order}
                                      onChange={(e) => updateAttributeOption(aIndex, oIndex, "sort_order", Number(e.target.value))}
                                      className="w-24"
                                      placeholder={t("sort_order")}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeAttributeOption(aIndex, oIndex)}
                                      className="text-error hover:text-error"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:text-error"
                          onClick={() => removeAttribute(aIndex)}
                        >
                          <Trash className="h-4 w-4" />
                          {t("delete_attribute")}
                        </Button>
                        <GripVertical className="h-5 w-5 text-outline cursor-grab" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t("delete_category")}
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
          {t("confirm_delete_category")}
        </p>
      </Modal>
    </AdminLayout>
  );
}
