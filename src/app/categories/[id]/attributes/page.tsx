"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { DataTable } from "@yallashop/ui/data-table";
import { Button } from "@yallashop/ui/button";
import { Card, CardContent } from "@yallashop/ui/card";
import { Modal } from "@yallashop/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@yallashop/ui/textarea";
import { Select } from "@yallashop/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import type { Column } from "@yallashop/ui/data-table";
import { Search, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
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

interface AttributeForm {
  name: string;
  type: "select" | "text";
  is_required: boolean;
  sort_order: number;
  options: { value: string; sort_order: number }[];
}

const emptyForm: AttributeForm = {
  name: "",
  type: "select",
  is_required: true,
  sort_order: 0,
  options: [],
};

const emptyOption = { value: "", sort_order: 0 };

export default function CategoryAttributesPage() {
  const { t, direction } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryAttribute | null>(null);
  const [form, setForm] = useState<AttributeForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["admin", "categories"],
    queryFn: () => api.getList<Category>("/admin/categories"),
  });

  const { data: attributes, isLoading: attrsLoading, error } = useQuery<CategoryAttribute[]>({
    queryKey: ["admin", "category-attributes", selectedCategory],
    queryFn: () => selectedCategory ? api.getList<CategoryAttribute>(`/admin/categories/${selectedCategory}/attributes`) : [],
    enabled: !!selectedCategory,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: number; form: AttributeForm }) => {
      const payload = {
        name: data.form.name,
        type: data.form.type,
        is_required: data.form.is_required,
        sort_order: data.form.sort_order,
        options: data.form.options,
      };
      return data.id
        ? api.put(`/admin/attributes/${data.id}`, payload)
        : api.postForm(`/admin/categories/${selectedCategory}/attributes`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "category-attributes", selectedCategory] });
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/attributes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "category-attributes", selectedCategory] });
      setDeleteConfirm(null);
    },
  });

  const addOptionMutation = useMutation({
    mutationFn: (data: { attributeId: number; value: string; sort_order: number }) =>
      api.post(`/admin/attributes/${data.attributeId}/options`, { value: data.value, sort_order: data.sort_order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "category-attributes", selectedCategory] });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/options/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "category-attributes", selectedCategory] });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (attr: CategoryAttribute) => {
    setEditing(attr);
    setForm({
      name: attr.name,
      type: attr.type,
      is_required: attr.is_required,
      sort_order: attr.sort_order,
      options: attr.options.map((o) => ({ value: o.value, sort_order: o.sort_order })),
    });
    setModalOpen(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addOption = () => {
    setForm((prev) => ({ ...prev, options: [...prev.options, { ...emptyOption }] }));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...form.options];
    updated[index] = { ...updated[index], value };
    setForm({ ...form, options: updated });
  };

  const removeOption = (index: number) => {
    const updated = [...form.options];
    updated.splice(index, 1);
    setForm({ ...form, options: updated });
  };

  const filteredCategories = (categories || []).filter(
    (c) => !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t("category_attributes")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {selectedCategory ? t("manage_attributes_for_category") : t("select_category_to_manage_attributes")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-on-surface mb-1">
                {t("category")}
              </label>
              <Select
                value={selectedCategory ? String(selectedCategory) : ""}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{t("select_category")}</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <Input
                placeholder={t("search_categories")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            <div className="max-h-96 overflow-y-auto mt-4 space-y-2">
              {categoriesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container" />
                  ))}
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    className="w-full justify-start text-left gap-2"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  >
                    <span className="flex-1 truncate">{cat.name}</span>
                    {selectedCategory === cat.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {selectedCategory && (
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-on-surface">
                    {t("attributes")}
                  </h2>
                  <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("add_attribute")}
                  </Button>
                </div>

                {attrsLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container" />
                    ))}
                  </div>
                )}

                {error && (
                  <Card className="border-error">
                    <CardContent className="py-8 text-center">
                      <p className="text-error">{t("error_description")}</p>
                    </CardContent>
                  </Card>
                )}

                {attributes && attributes.length === 0 && !attrsLoading && (
                  <Card className="border-outline-variant">
                    <CardContent className="py-8 text-center text-on-surface-variant">
                      {t("no_attributes_for_category")}
                    </CardContent>
                  </Card>
                )}

                {attributes && attributes.length > 0 && (
                  <div className="space-y-3">
                    {attributes.map((attr) => {
                      const isExpanded = expandedIds.includes(attr.id);
                      return (
                        <Card key={attr.id} className="border-outline-variant">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-medium text-on-surface flex-1">{attr.name}</h3>
                                  <span
                                    className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary-container text-on-secondary-container"
                                  >
                                    {attr.type === "select" ? t("select") : t("text")}
                                  </span>
                                  {attr.is_required && (
                                    <span
                                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-tertiary-container text-on-tertiary-container"
                                    >
                                      {t("required")}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-on-surface-variant">
                                  {t("sort_order")}: {attr.sort_order}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(attr)}
                                  className="text-on-surface-variant hover:text-secondary"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(attr.id)}
                                  className="text-error hover:text-error"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left text-on-surface-variant hover:text-secondary mb-3"
                              onClick={() => toggleExpand(attr.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  {t("hide_options")}
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  {t("show_options")} ({attr.options.length})
                                </>
                              )}
                            </Button>

                            {isExpanded && (
                              <div className="space-y-2 ml-4 border-l-2 border-outline-variant pl-4">
                                {attr.options.length === 0 ? (
                                  <p className="text-sm text-on-surface-variant">{t("no_options_defined")}</p>
                                ) : (
                                  attr.options.map((opt) => {
                                    const isColorAttr = attr.name.toLowerCase() === "color";
                                    return (
                                      <div key={opt.id} className="flex items-center gap-2">
                                        {isColorAttr ? (
                                          <span
                                            className="h-5 w-5 rounded-full border border-outline-variant flex-shrink-0"
                                            style={{ backgroundColor: opt.value }}
                                          />
                                        ) : null}
                                        <span className="flex-1 text-sm text-on-surface">{opt.value}</span>
                                        <span className="text-xs text-on-surface-variant">
                                          {t("sort_order")}: {opt.sort_order}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => deleteOptionMutation.mutate(opt.id)}
                                          className="text-error hover:text-error"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    );
                                  })
                                )}

                                {attr.type === "select" && (
                                  <AddOptionForm
                                    attributeId={attr.id}
                                    attributeName={attr.name}
                                    onAdd={(value, sort_order) =>
                                      addOptionMutation.mutate({ attributeId: attr.id, value, sort_order })
                                    }
                                    t={t}
                                  />
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedCategory && (
          <Card className="lg:col-span-2">
            <CardContent className="p-8 text-center">
              <p className="text-on-surface-variant">{t("select_category_to_manage_attributes")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setForm(emptyForm);
          setEditing(null);
        }}
        title={editing ? t("edit_attribute") : t("add_attribute")}
        footer={
          <div className="flex justify-end gap-3 py-2 pb-1">
            <Button variant="outline" onClick={() => { setModalOpen(false); setForm(emptyForm); setEditing(null); }}>
              {t("cancel")}
            </Button>
            <Button onClick={() => saveMutation.mutate({ id: editing?.id, form })} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("attribute_name")}
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("attribute_type")}
            </label>
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "select" | "text" })}
            >
              <option value="select">{t("select")}</option>
              <option value="text">{t("text")}</option>
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
                  checked={form.is_required}
                  onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                />
                <span className="text-sm font-medium text-on-surface">{t("is_required")}</span>
              </label>
            </div>
          </div>

          {form.type === "select" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-on-surface">
                  {t("options")}
                </label>
                <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  {t("add_option")}
                </Button>
              </div>
              {form.options.length === 0 ? (
                <p className="text-sm text-on-surface-variant">{t("no_options_defined")}</p>
              ) : (
                <div className="space-y-2">
                  {form.options.map((opt, index) => {
                    const isColorAttr = form.name.toLowerCase() === "color";
                    return (
                      <div key={index} className="flex gap-2 items-center">
                        {isColorAttr ? (
                          <>
                            <input
                              type="color"
                              value={opt.value || "#000000"}
                              onChange={(e) => updateOption(index, e.target.value)}
                              className="h-9 w-12 rounded border border-outline-variant cursor-pointer"
                            />
                            <Input
                              value={opt.value}
                              onChange={(e) => updateOption(index, e.target.value)}
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
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={t("option_value")}
                            className="flex-1"
                          />
                        )}
                        <Input
                          type="number"
                          value={opt.sort_order}
                          onChange={(e) => {
                            const updated = [...form.options];
                            updated[index] = { ...updated[index], sort_order: Number(e.target.value) };
                            setForm({ ...form, options: updated });
                          }}
                          className="w-24"
                          placeholder={t("sort_order")}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          className="text-error hover:text-error"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t("delete_attribute")}
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
          {t("confirm_delete_attribute")}
        </p>
      </Modal>
    </AdminLayout>
  );
}

function AddOptionForm({ attributeId, attributeName, onAdd, t }: { attributeId: number; attributeName: string; onAdd: (value: string, sort_order: number) => void; t: (key: string) => string }) {
  const [value, setValue] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const isColorAttr = attributeName.toLowerCase() === "color";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value.trim(), sortOrder);
    setValue("");
    setSortOrder(0);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-outline-variant items-center">
      {isColorAttr ? (
        <>
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 w-12 rounded border border-outline-variant cursor-pointer"
          />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#000000"
            className="w-28"
          />
        </>
      ) : (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("option_value")}
          className="flex-1"
        />
      )}
      <Input
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(Number(e.target.value))}
        placeholder={t("sort_order")}
        className="w-24"
      />
      <Button type="submit" size="sm" className="gap-1">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}