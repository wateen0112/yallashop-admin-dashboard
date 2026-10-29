"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@yallashop/api-client";
import { DataTable } from "@yallashop/ui/data-table";
import { StatusPill } from "@yallashop/ui/status-pill";
import { Button } from "@yallashop/ui/button";
import { Card, CardContent } from "@yallashop/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@yallashop/ui/textarea";
import { Select } from "@yallashop/ui/select";
import { AdminLayout } from "@/components/admin-layout";
import { useTranslation } from "@yallashop/ui/i18n-provider";
import { Search, Plus, Pencil, Trash2, X, Film, Image as ImageIcon, Upload, PlusCircle, Trash, XCircle, GripVertical, ChevronLeft, ChevronDown, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProductMedia {
  url: string;
  type: string;
  sort_order: number;
}

interface Product {
  id: number;
  title: string;
  description: string;
  base_price: number;
  currency_id?: number;
  category_id?: number;
  category_name?: string;
  status: string;
  rating?: number;
  store_name?: string;
  store_id?: number;
  images?: ProductMedia[];
  variants?: ProductVariant[];
}

interface Category {
  id: number;
  name: string;
}

interface Store {
  id: number;
  name: string;
}

interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
}

interface CategoryAttribute {
  id: number;
  name: string;
  type: "select" | "text";
  is_required: boolean;
  options: CategoryAttributeOption[];
}

interface CategoryAttributeOption {
  id: number;
  value: string;
  sort_order: number;
}

interface VariantAttribute {
  attribute_id: number;
  option_id?: number;
  value?: string;
  attribute?: CategoryAttribute;
}

interface ProductVariant {
  id?: number;
  sku: string;
  price: number;
  stock_qty: number;
  attributes: VariantAttribute[];
  images?: ProductVariantImage[];
}

interface ProductVariantImage {
  id: number;
  product_variant_id: number;
  url: string;
  type: string;
  sort_order: number;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
}

interface ProductForm {
  title: string;
  description: string;
  base_price: number;
  currency_id: number | null;
  category_id: number | null;
  store_id: number | null;
  status: string;
  mediaFiles: MediaFile[];
  existingImages: ProductMedia[];
  variants: ProductVariant[];
}

const emptyForm: ProductForm = {
  title: "",
  description: "",
  base_price: 0,
  currency_id: null,
  category_id: null,
  store_id: null,
  status: "active",
  mediaFiles: [],
  existingImages: [],
  variants: [],
};

const emptyVariant: ProductVariant = {
  sku: "",
  price: 0,
  stock_qty: 0,
  attributes: [],
  images: [],
};

export default function ProductFormPage() {
  const { t, direction } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const isEditing = params.id !== "new";
  const productId = isEditing ? Number(params.id) : null;
  const user = api.getUser();
  const isVendor = user?.role === "vendor";
  const vendorStoreId = user?.store_id;

  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [newOptionValue, setNewOptionValue] = useState("");
  const [addingOptionForAttributeId, setAddingOptionForAttributeId] = useState<number | null>(null);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories, stores, currencies
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["admin", "categories"],
    queryFn: () => api.getList<Category>("/admin/categories"),
  });

  const { data: stores } = useQuery<Store[]>({
    queryKey: ["admin", "vendors"],
    queryFn: () => api.getList<Store>("/admin/vendors"),
  });

  const { data: currencies } = useQuery<Currency[]>({
    queryKey: ["admin", "currencies"],
    queryFn: () => api.getList<Currency>("/admin/currencies"),
  });

  // Fetch product if editing
  useEffect(() => {
    if (isEditing && productId) {
      setIsLoadingProduct(true);
      api.get<Product>(`/admin/products/${productId}`)
        .then((data) => {
          setForm({
            title: data.title,
            description: data.description ?? "",
            base_price: data.base_price,
            currency_id: data.currency_id ?? null,
            category_id: data.category_id ?? null,
            store_id: data.store_id ?? null,
            status: data.status,
            mediaFiles: [],
            existingImages: data.images ?? [],
            variants: data.variants ?? [],
          });
        })
        .catch(() => router.push("/products"))
        .finally(() => setIsLoadingProduct(false));
    } else {
      setForm({
        ...emptyForm,
        store_id: isVendor && vendorStoreId ? vendorStoreId : null,
      });
    }
  }, [isEditing, productId, router, isVendor, vendorStoreId]);

  // Fetch category attributes when category changes
  useEffect(() => {
    if (form.category_id) {
      setIsLoadingAttributes(true);
      api.getList<CategoryAttribute>(`/admin/categories/${form.category_id}/attributes`)
        .then((data) => setCategoryAttributes(data))
        .catch(() => setCategoryAttributes([]))
        .finally(() => setIsLoadingAttributes(false));
    } else {
      setCategoryAttributes([]);
    }
  }, [form.category_id]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const uploadedImages: ProductMedia[] = [...data.existingImages];

      for (const media of data.mediaFiles) {
        const fd = new FormData();
        fd.append("file", media.file);
        fd.append("folder", "products");
        const response = await api.postForm<{ url: string }>("/admin/upload", fd);
        uploadedImages.push({
          url: response.data.url,
          type: media.type,
          sort_order: uploadedImages.length,
        });
      }

      // Upload variant images
      const variantsWithImages = await Promise.all(data.variants.map(async (variant) => {
        const variantImages = [...(variant.images ?? [])];
        if (variant.images) {
          for (const media of variant.images) {
            if (media.file) { // new file
              const fd = new FormData();
              fd.append("file", media.file);
              fd.append("folder", "products");
              const response = await api.postForm<{ url: string }>("/admin/upload", fd);
              variantImages.push({
                id: 0,
                product_variant_id: 0,
                url: response.data.url,
                type: media.type,
                sort_order: variantImages.length,
              });
            }
          }
        }
        return { ...variant, images: variantImages };
      }));

      const payload = {
        title: data.title,
        description: data.description,
        base_price: data.base_price,
        currency_id: data.currency_id,
        category_id: data.category_id,
        store_id: data.store_id,
        status: data.status,
        images: uploadedImages,
        variants: variantsWithImages,
      };

      return isEditing && productId
        ? api.put(`/admin/products/${productId}`, payload)
        : api.post("/admin/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      router.push("/products");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: MediaFile[] = Array.from(files).map((file) => {
      const isVideo = file.type.startsWith("video/");
      return {
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
      };
    });

    // Check video limit (1 video total for product images)
    const videoCount = newMedia.filter((m) => m.type === "video").length +
      form.existingImages.filter((m) => m.type === "video").length +
      form.mediaFiles.filter((m) => m.type === "video").length;

    const filtered = videoCount > 1
      ? newMedia.filter((m) => m.type !== "video")
      : newMedia;

    setForm({ ...form, mediaFiles: [...form.mediaFiles, ...filtered] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewMedia = (index: number) => {
    const updated = [...form.mediaFiles];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    setForm({ ...form, mediaFiles: updated });
  };

  const removeExistingMedia = (index: number) => {
    const updated = [...form.existingImages];
    updated.splice(index, 1);
    setForm({ ...form, existingImages: updated });
  };

  // Variant management functions
  const addVariant = () => {
    const basePrice = form.base_price;
    const initialAttributes = categoryAttributes.map(attr => ({
      attribute_id: attr.id,
      option_id: undefined,
      value: attr.type === "text" ? "" : undefined,
    }));
    setForm({
      ...form,
      variants: [...form.variants, { ...emptyVariant, price: basePrice, attributes: initialAttributes }],
    });
  };

  const generateVariants = () => {
    if (categoryAttributes.length === 0) return;

    const selectAttributes = categoryAttributes.filter(a => a.type === 'select');
    if (selectAttributes.length === 0) {
      addVariant();
      return;
    }

    const combinations: any[][] = [[]];

    for (const attr of selectAttributes) {
      const newCombinations: any[][] = [];
      for (const combo of combinations) {
        for (const option of attr.options) {
          newCombinations.push([...combo, { attribute_id: attr.id, option_id: option.id, value: undefined }]);
        }
      }
      combinations.splice(0, combinations.length, ...newCombinations);
    }

    const newVariants: ProductVariant[] = combinations.map((combo, index) => ({
      sku: `VAR-${Date.now()}-${index}`,
      price: form.base_price,
      stock_qty: 0,
      attributes: combo,
      images: [],
    }));

    setForm({
      ...form,
      variants: [...form.variants, ...newVariants],
    });
  };

  const removeVariant = (index: number) => {
    const updated = [...form.variants];
    updated.splice(index, 1);
    setForm({ ...form, variants: updated });
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updated = [...form.variants];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, variants: updated });
  };

  const addVariantAttribute = (variantIndex: number, attributeId: number) => {
    const updated = [...form.variants];
    const attr = categoryAttributes.find((a) => a.id === attributeId);
    updated[variantIndex] = {
      ...updated[variantIndex],
      attributes: [
        ...updated[variantIndex].attributes,
        { attribute_id: attributeId, option_id: undefined, value: attr?.type === "text" ? "" : undefined },
      ],
    };
    setForm({ ...form, variants: updated });
  };

  const removeVariantAttribute = (variantIndex: number, attrIndex: number) => {
    const updated = [...form.variants];
    updated[variantIndex] = {
      ...updated[variantIndex],
      attributes: updated[variantIndex].attributes.filter((_, i) => i !== attrIndex),
    };
    setForm({ ...form, variants: updated });
  };

  const updateVariantAttribute = (variantIndex: number, attrIndex: number, field: "option_id" | "value", value: string | number) => {
    const updated = [...form.variants];
    const attr = { ...updated[variantIndex].attributes[attrIndex] };
    if (field === "option_id") {
      attr.option_id = value as number;
      attr.value = undefined;
    } else {
      attr.value = value as string;
      attr.option_id = undefined;
    }
    updated[variantIndex].attributes[attrIndex] = attr;
    setForm({ ...form, variants: updated });
  };

  const addAttributeOption = async (attributeId: number, value: string) => {
    try {
      const response = await api.post<{ id: number; value: string }>(
        `/admin/attributes/${attributeId}/options`,
        { attribute_id: attributeId, value }
      );
      setCategoryAttributes((prev) =>
        prev.map((attr) =>
          attr.id === attributeId
            ? { ...attr, options: [...(attr.options || []), response.data] }
            : attr
        )
      );
      return response.data;
    } catch (error) {
      console.error("Failed to add attribute option:", error);
      throw error;
    }
  };

  const handleSaveNewOption = async (attributeId: number) => {
    if (!newOptionValue) return;
    try {
      await addAttributeOption(attributeId, newOptionValue);
      setNewOptionValue("");
      setAddingOptionForAttributeId(null);
    } catch (e) {
      console.error("Failed to add option:", e);
    }
  };

  const handleVariantImageChange = (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: MediaFile[] = Array.from(files).map((file) => {
      const isVideo = file.type.startsWith("video/");
      return {
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
      };
    });

    const variant = form.variants[variantIndex];
    const existingImages = variant.images ?? [];
    const videoCount = newImages.filter((m) => m.type === "video").length +
      existingImages.filter((m: ProductVariantImage) => m.type === "video").length;

    const filtered = videoCount > 1
      ? newImages.filter((m) => m.type !== "video")
      : newImages;

    const updated = [...form.variants];
    updated[variantIndex] = {
      ...updated[variantIndex],
      images: [...(updated[variantIndex].images ?? []), ...filtered.map(m => ({
        id: 0,
        product_variant_id: 0,
        url: m.preview,
        type: m.type,
        sort_order: (updated[variantIndex].images ?? []).length + 1,
        file: m.file,
      }))],
    };
    setForm({ ...form, variants: updated });
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    const updated = [...form.variants];
    const variantImages = [...(updated[variantIndex].images ?? [])];
    if (variantImages[imageIndex].file) {
      URL.revokeObjectURL(variantImages[imageIndex].url);
    }
    variantImages.splice(imageIndex, 1);
    updated[variantIndex].images = variantImages;
    setForm({ ...form, variants: updated });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (form.base_price <= 0) {
      newErrors.base_price = "Price must be greater than 0";
    }
    if (!form.category_id) {
      newErrors.category_id = "Category is required";
    }
    if (!isVendor && !form.store_id) {
      newErrors.store_id = "Store is required";
    }
    if (!form.currency_id) {
      newErrors.currency_id = "Currency is required";
    }
    if (form.variants.length === 0) {
      newErrors.variants = "At least one variant is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  const totalMediaCount = form.mediaFiles.length + form.existingImages.length;
  const hasVideo = form.mediaFiles.some((m) => m.type === "video") ||
    form.existingImages.some((m) => m.type === "video");

  const handleBack = () => {
    form.mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview));
    router.push("/products");
  };

  if (isLoadingProduct) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              {isEditing ? t("edit_product") : t("add_product")}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {isEditing ? t("edit_product_desc") : t("add_product_desc")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t("back_to_products")}
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-on-surface">{t("general_information")}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    {t("product_title")}
                  </label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t("enter_product_title")}
                    className={errors.title ? "border-error" : ""}
                  />
                  {errors.title && <p className="text-xs text-error mt-1">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    {t("description")}
                  </label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    placeholder={t("enter_description")}
                    className={errors.description ? "border-error" : ""}
                  />
                  {errors.description && <p className="text-xs text-error mt-1">{errors.description}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1">
                      {t("category")}
                    </label>
                    <Select
                      value={form.category_id ?? ""}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : null })}
                      className={errors.category_id ? "border-error" : ""}
                    >
                      <option value="">{t("select_category")}</option>
                      {(categories || []).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                    {errors.category_id && <p className="text-xs text-error mt-1">{errors.category_id}</p>}
                  </div>
                  {!isVendor && (
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-1">
                        {t("store")}
                      </label>
                      <Select
                        value={form.store_id ?? ""}
                        onChange={(e) => setForm({ ...form, store_id: e.target.value ? Number(e.target.value) : null })}
                        className={errors.store_id ? "border-error" : ""}
                      >
                        <option value="">{t("select_store")}</option>
                        {(stores || []).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </Select>
                      {errors.store_id && <p className="text-xs text-error mt-1">{errors.store_id}</p>}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1">
                      {t("base_price")}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.base_price}
                      onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
                      className={errors.base_price ? "border-error" : ""}
                    />
                    {errors.base_price && <p className="text-xs text-error mt-1">{errors.base_price}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1">
                      {t("currency")}
                    </label>
                    <Select
                      value={form.currency_id ?? ""}
                      onChange={(e) => setForm({ ...form, currency_id: e.target.value ? Number(e.target.value) : null })}
                      className={errors.currency_id ? "border-error" : ""}
                    >
                      <option value="">{t("select_currency")}</option>
                      {(currencies || []).map((c) => (
                        <option key={c.id} value={c.id}>{c.symbol} {c.name} ({c.code})</option>
                      ))}
                    </Select>
                    {errors.currency_id && <p className="text-xs text-error mt-1">{errors.currency_id}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1">
                      {t("status")}
                    </label>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="draft">{t("draft")}</option>
                      <option value="pending">{t("pending")}</option>
                      <option value="active">{t("active")}</option>
                      <option value="rejected">{t("rejected")}</option>
                      <option value="archived">{t("archived")}</option>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Media */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-on-surface">
                  {t("product_media")} ({totalMediaCount}/7)
                </h2>
                <p className="text-xs text-on-surface-variant">{t("upload_product_media_hint")}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-2">
                {form.existingImages.map((media, i) => (
                  <div key={`existing-${i}`} className="relative group">
                    {media.type === "video" ? (
                      <div className="aspect-square rounded-lg bg-surface-container flex items-center justify-center">
                        <Film className="h-6 w-6 text-on-surface-variant" />
                      </div>
                    ) : (
                      <img src={media.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingMedia(i)}
                      className="absolute top-1 right-1 bg-error text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded flex items-center gap-0.5">
                      {media.type === "video" ? <Film className="h-2.5 w-2.5" /> : <ImageIcon className="h-2.5 w-2.5" />}
                    </span>
                  </div>
                ))}

                {form.mediaFiles.map((media, i) => (
                  <div key={`new-${i}`} className="relative group">
                    {media.type === "video" ? (
                      <video
                        src={media.preview}
                        className="aspect-square w-full rounded-lg object-cover"
                        muted
                      />
                    ) : (
                      <img src={media.preview} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeNewMedia(i)}
                      className="absolute top-1 right-1 bg-error text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded flex items-center gap-0.5">
                      {media.type === "video" ? <Film className="h-2.5 w-2.5" /> : <ImageIcon className="h-2.5 w-2.5" />}
                      <span>new</span>
                    </span>
                  </div>
                ))}

                {totalMediaCount < 7 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-outline-variant hover:border-secondary transition-colors flex flex-col items-center justify-center gap-1 text-on-surface-variant"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-[10px]">{t("upload")}</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {hasVideo && (
                <p className="text-xs text-on-surface-variant">
                  {t("video")} ✓
                </p>
              )}
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-on-surface">
                  {t("variants")}
                </h2>
                {form.category_id && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={generateVariants} className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      {t("generate_variants")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={addVariant} className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      {t("add_variant")}
                    </Button>
                  </div>
                )}
              </div>
              {errors.variants && <p className="text-sm text-error">{errors.variants}</p>}

              {!form.category_id ? (
                <div className="text-center py-8 text-on-surface-variant border-2 border-dashed border-outline-variant rounded-lg">
                  <p>{t("select_category_to_manage_variants")}</p>
                </div>
              ) : form.variants.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant border-2 border-dashed border-outline-variant rounded-lg">
                  <p className="mb-2">{t("no_variants_added")}</p>
                  <Button variant="outline" onClick={addVariant} className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t("add_first_variant")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.variants.map((variant, vIndex) => (
                    <Card key={vIndex} className="mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-on-surface mb-1">
                                  {t("variant_sku")}
                                </label>
                                <Input
                                  value={variant.sku}
                                  onChange={(e) => updateVariant(vIndex, "sku", e.target.value)}
                                  placeholder={t("enter_sku")}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-on-surface mb-1">
                                  {t("variant_price")} ({currencies?.find(c => c.id === form.currency_id)?.symbol || ""})
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) => updateVariant(vIndex, "price", Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-on-surface mb-1">
                                  {t("variant_stock")}
                                </label>
                                <Input
                                  type="number"
                                  value={variant.stock_qty}
                                  onChange={(e) => updateVariant(vIndex, "stock_qty", Number(e.target.value))}
                                />
                              </div>
                            </div>

                            {categoryAttributes.length > 0 && (
                              <div>
                                <label className="block text-sm font-medium text-on-surface mb-2">
                                  {t("variant_attributes")}
                                </label>
                                <div className="space-y-2">
                                  {variant.attributes.map((attr, aIndex) => {
                                    const attribute = categoryAttributes.find((a) => a.id === attr.attribute_id);
                                    if (!attribute) return null;
                                    const isSelect = attribute.type === "select";
                                    const isColorAttr = attribute.name.toLowerCase() === "color";
                                    return (
                                      <div key={aIndex} className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-on-surface-variant min-w-[150px]">
                                          {attribute.name} {attribute.is_required && <span className="text-error">*</span>}
                                        </span>
                                        {isSelect ? (
                                          <div className="flex items-center gap-2">
                                            {addingOptionForAttributeId === attribute.id ? (
                                              <div className="flex items-center gap-2">
                                                {isColorAttr ? (
                                                  <div className="flex items-center gap-2">
                                                    <input
                                                      type="color"
                                                      value={newOptionValue || "#000000"}
                                                      onChange={(e) => setNewOptionValue(e.target.value)}
                                                      className="h-8 w-10 rounded border border-outline-variant cursor-pointer"
                                                    />
                                                    <Input
                                                      value={newOptionValue}
                                                      onChange={(e) => setNewOptionValue(e.target.value)}
                                                      placeholder="#000000"
                                                      className="h-8 w-28"
                                                    />
                                                  </div>
                                                ) : (
                                                  <Input
                                                    value={newOptionValue}
                                                    onChange={(e) => setNewOptionValue(e.target.value)}
                                                    placeholder={t("enter_new_option")}
                                                    className="h-8"
                                                  />
                                                )}
                                                <Button size="sm" onClick={() => handleSaveNewOption(attribute.id)}>
                                                  {t("save")}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setAddingOptionForAttributeId(null)}>
                                                  {t("cancel")}
                                                </Button>
                                              </div>
                                            ) : (
                                              <>
                                                {isColorAttr ? (
                                                  <ColorSelectDropdown
                                                    options={attribute.options}
                                                    value={attr.option_id}
                                                    onChange={(optionId) => updateVariantAttribute(vIndex, aIndex, "option_id", optionId)}
                                                  />
                                                ) : (
                                                  <Select
                                                    value={attr.option_id ? String(attr.option_id) : ""}
                                                    onChange={(e) => updateVariantAttribute(vIndex, aIndex, "option_id", e.target.value ? Number(e.target.value) : undefined)}
                                                  >
                                                    <option value="">{t("select_option")}</option>
                                                    {attribute.options.map((opt) => (
                                                      <option key={opt.id} value={opt.id}>{opt.value}</option>
                                                    ))}
                                                  </Select>
                                                )}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-primary hover:text-primary"
                                                  onClick={() => setAddingOptionForAttributeId(attribute.id)}
                                                  title={t("add_new_option")}
                                                >
                                                  <Plus className="h-4 w-4" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        ) : (
                                          isColorAttr ? (
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="color"
                                                value={attr.value || "#000000"}
                                                onChange={(e) => updateVariantAttribute(vIndex, aIndex, "value", e.target.value)}
                                                className="h-9 w-12 rounded border border-outline-variant cursor-pointer"
                                              />
                                              <Input
                                                value={attr.value || ""}
                                                onChange={(e) => updateVariantAttribute(vIndex, aIndex, "value", e.target.value)}
                                                placeholder="#000000"
                                                className="w-28"
                                              />
                                            </div>
                                          ) : (
                                            <Input
                                              value={attr.value || ""}
                                              onChange={(e) => updateVariantAttribute(vIndex, aIndex, "value", e.target.value)}
                                              placeholder={t("enter_custom_value")}
                                            />
                                          )
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-error hover:text-error"
                                          onClick={() => removeVariantAttribute(vIndex, aIndex)}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                  {categoryAttributes
                                    .filter((attr) => !variant.attributes.some((va) => va.attribute_id === attr.id))
                                    .map((attr) => (
                                      <Button
                                        key={attr.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addVariantAttribute(vIndex, attr.id)}
                                        className="gap-2"
                                      >
                                        <PlusCircle className="h-4 w-4" />
                                        {t("add")} {attr.name}
                                      </Button>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error hover:text-error"
                              onClick={() => removeVariant(vIndex)}
                            >
                              <Trash className="h-4 w-4" />
                              {t("delete_variant")}
                            </Button>
                            <GripVertical className="h-5 w-5 text-outline cursor-grab" />
                          </div>
                        </div>

                        {/* Variant Images */}
                        <div className="border-t border-outline-variant pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-on-surface-variant">
                              {t("variant_images")}
                            </label>
                            <p className="text-xs text-on-surface-variant">Max 1 video per variant</p>
                          </div>
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {(variant.images ?? []).map((img, i) => (
                              <div key={i} className="relative group">
                                {img.type === "video" ? (
                                  <div className="aspect-square rounded-lg bg-surface-container flex items-center justify-center">
                                    <Film className="h-6 w-6 text-on-surface-variant" />
                                  </div>
                                ) : (
                                  <img src={img.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeVariantImage(vIndex, i)}
                                  className="absolute top-1 right-1 bg-error text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            {((variant.images ?? []).length < 7) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = "image/*,video/*";
                                  input.multiple = true;
                                  input.onchange = (e) => handleVariantImageChange(vIndex, e);
                                  input.click();
                                }}
                                className="aspect-square rounded-lg border-2 border-dashed border-outline-variant hover:border-secondary transition-colors flex flex-col items-center justify-center gap-1 text-on-surface-variant"
                              >
                                <Upload className="h-5 w-5" />
                                <span className="text-[10px]">{t("upload")}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Preview / Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-on-surface">{t("preview")}</h3>
              <div className="aspect-square rounded-lg bg-surface-container overflow-hidden">
                {form.existingImages.length > 0 ? (
                  <img src={form.existingImages[0].url} alt="" className="w-full h-full object-cover" />
                ) : form.mediaFiles.length > 0 ? (
                  form.mediaFiles[0].type === "video" ? (
                    <video src={form.mediaFiles[0].preview} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={form.mediaFiles[0].preview} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-on-surface-variant">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-on-surface-variant">{t("price")}</span>
                <div className="text-2xl font-bold text-primary">
                  {form.base_price.toLocaleString()} {currencies?.find(c => c.id === form.currency_id)?.symbol || ""}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-on-surface-variant">{t("stock")}</span>
                <div className="text-lg font-medium text-on-surface">
                  {form.variants.reduce((sum, v) => sum + (v.stock_qty || 0), 0)} {t("units")}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-on-surface-variant">{t("variants_count")}</span>
                <div className="text-lg font-medium text-on-surface">
                  {form.variants.length}
                </div>
              </div>
            </CardContent>
          </Card>

          {form.variants.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-semibold text-on-surface">{t("variant_summary")}</h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {form.variants.map((variant, vIndex) => (
                    <div key={vIndex} className="p-3 bg-surface-container rounded-lg border border-outline-variant">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-on-surface">{variant.sku || `Variant ${vIndex + 1}`}</span>
                        <span className="font-bold text-primary">{variant.price.toLocaleString()} {currencies?.find(c => c.id === form.currency_id)?.symbol || ""}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap text-xs text-on-surface-variant">
                        {variant.attributes.map((attr) => {
                          const attribute = categoryAttributes.find((a) => a.id === attr.attribute_id);
                          const displayValue = attribute?.type === "select"
                            ? attribute.options.find((o) => o.id === attr.option_id)?.value
                            : attr.value;
                          if (!attribute || !displayValue) return null;
                          const isColorAttr = attribute.name.toLowerCase() === "color";
                          return (
                            <span key={attr.attribute_id} className="px-2 py-0.5 bg-primary/10 text-primary rounded inline-flex items-center gap-1">
                              {attribute.name}:
                              {isColorAttr ? (
                                <span
                                  className="h-3 w-3 rounded-full border border-outline-variant inline-block"
                                  style={{ backgroundColor: displayValue }}
                                />
                              ) : (
                                displayValue
                              )}
                            </span>
                          );
                        })}
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        Stock: {variant.stock_qty}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

interface ColorSelectDropdownOption {
  id: number;
  value: string;
}

interface ColorSelectDropdownProps {
  options: ColorSelectDropdownOption[];
  value?: number;
  onChange: (optionId: number | undefined) => void;
}

function ColorSelectDropdown({ options, value, onChange }: ColorSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o) => o.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-9 w-48 flex items-center gap-2 rounded-md border border-outline-variant bg-surface px-3 text-sm text-left hover:bg-surface-container transition-colors"
      >
        {selectedOption ? (
          <>
            <span
              className="h-5 w-5 rounded-full border border-outline-variant flex-shrink-0"
              style={{ backgroundColor: selectedOption.value }}
            />
            <span className="flex-1 truncate">{selectedOption.value}</span>
          </>
        ) : (
          <span className="text-on-surface-variant flex-1">Select option</span>
        )}
        <ChevronDown className="h-4 w-4 text-on-surface-variant" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-outline-variant rounded-md shadow-lg max-h-60 overflow-auto">
          <button
            type="button"
            onClick={() => { onChange(undefined); setOpen(false); }}
            className="w-full px-3 py-2 text-sm text-left hover:bg-surface-container flex items-center gap-2"
          >
            <span className="h-5 w-5 rounded-full border border-outline-variant bg-white flex-shrink-0" />
            <span className="text-on-surface-variant">Select option</span>
          </button>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-surface-container flex items-center gap-2 ${value === opt.id ? "bg-primary/10" : ""}`}
            >
              <span
                className="h-5 w-5 rounded-full border border-outline-variant flex-shrink-0"
                style={{ backgroundColor: opt.value }}
              />
              <span className="flex-1 truncate">{opt.value}</span>
              {value === opt.id && <span className="text-primary text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}