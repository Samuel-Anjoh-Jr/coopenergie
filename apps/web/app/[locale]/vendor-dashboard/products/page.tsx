"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import {
  fetchVendorProducts,
  formatXaf,
  multipartVendorRequest,
  VendorProduct,
} from "@/lib/vendor-dashboard";
import { restClient } from "@/lib/rest-client";
import { useTranslations } from "@/lib/translations";

type ProductFormState = {
  id?: string;
  title: string;
  description: string;
  priceXAF: string;
  unit: string;
  inStock: boolean;
  newImages: File[];
  deleteImageIds: string[];
};

const emptyForm: ProductFormState = {
  title: "",
  description: "",
  priceXAF: "",
  unit: "",
  inStock: true,
  newImages: [],
  deleteImageIds: [],
};

export default function VendorProductsPage() {
  const params = useParams();
  const locale = (params.locale as "fr" | "en") || "en";
  const t = useTranslations(locale);
  const { data: session } = useSession();
  const vendorId = session?.user?.vendor?.id;

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const formCardRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const loadProducts = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    setLoading(true);
    try {
      const data = await fetchVendorProducts(vendorId);
      setProducts(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t, vendorId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products],
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedProducts.findIndex((item) => item.id === active.id);
    const newIndex = sortedProducts.findIndex((item) => item.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const next = arrayMove(sortedProducts, oldIndex, newIndex).map(
      (item, idx) => ({
        ...item,
        sortOrder: idx,
      }),
    );

    setProducts(next);

    try {
      await restClient.patch("/vendors/products/reorder", {
        orderedIds: next.map((item) => item.id),
      });
      toast.success(t("vendorDashboard.feedback.reorderSaved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.updateFailed"),
      );
      await loadProducts();
    }
  };

  const editProduct = (product: VendorProduct) => {
    setForm({
      id: product.id,
      title: product.title,
      description: product.description,
      priceXAF: String(product.priceXAF),
      unit: product.unit || "",
      inStock: product.inStock,
      newImages: [],
      deleteImageIds: [],
    });

    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const removeProduct = async (productId: string) => {
    try {
      await restClient.delete(`/vendors/products/${productId}`);
      toast.success(t("vendorDashboard.feedback.deleted"));
      await loadProducts();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.updateFailed"),
      );
    }
  };

  const removeImage = async (productId: string, imageId: string) => {
    try {
      await restClient.delete(
        `/vendors/products/${productId}/images/${imageId}`,
      );
      toast.success(t("vendorDashboard.feedback.imageDeleted"));
      await loadProducts();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.updateFailed"),
      );
    }
  };

  const submitProduct = async () => {
    if (!form.title || !form.description || !form.priceXAF) {
      toast.error(t("vendorDashboard.feedback.invalidProductForm"));
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("description", form.description);
      payload.append("priceXAF", form.priceXAF);
      if (form.unit.trim()) {
        payload.append("unit", form.unit.trim());
      }
      payload.append("inStock", String(form.inStock));

      for (const file of form.newImages) {
        const key = form.id ? "newImages" : "images";
        payload.append(key, file);
      }

      for (const imageId of form.deleteImageIds) {
        payload.append("deleteImageIds", imageId);
      }

      if (form.id) {
        await multipartVendorRequest(
          "PATCH",
          `/vendors/products/${form.id}`,
          payload,
        );
      } else {
        await multipartVendorRequest("POST", "/vendors/products", payload);
      }

      toast.success(t("vendorDashboard.feedback.productSaved"));
      setForm(emptyForm);
      await loadProducts();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.updateFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t("vendorDashboard.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70" ref={formCardRef}>
        <CardHeader>
          <CardTitle>{t("vendorDashboard.products.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={t("vendorDashboard.products.fields.title")}
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
          />
          <Textarea
            placeholder={t("vendorDashboard.products.fields.description")}
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            rows={4}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder={t("vendorDashboard.products.fields.priceXaf")}
              value={form.priceXAF}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, priceXAF: event.target.value }))
              }
              type="number"
              min={0}
            />
            <Input
              placeholder={t("vendorDashboard.products.fields.unit")}
              value={form.unit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, unit: event.target.value }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/70 p-3">
            <span className="text-sm">
              {t("vendorDashboard.products.fields.inStock")}
            </span>
            <Switch
              checked={form.inStock}
              onCheckedChange={(value) =>
                setForm((prev) => ({ ...prev, inStock: value }))
              }
            />
          </div>

          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                newImages: Array.from(event.target.files || []),
              }))
            }
          />

          <div className="flex flex-wrap gap-2">
            {form.newImages.map((file) => (
              <Badge key={`${file.name}-${file.size}`} variant="secondary">
                {file.name}
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={submitProduct} disabled={saving}>
              {saving
                ? t("vendorDashboard.common.saving")
                : t("vendorDashboard.products.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setForm(emptyForm)}
              disabled={saving}
            >
              {t("vendorDashboard.common.reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t("vendorDashboard.products.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("vendorDashboard.products.empty")}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void onDragEnd(event)}
            >
              <SortableContext
                items={sortedProducts.map((product) => product.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sortedProducts.map((product, index) => (
                    <ScrollReveal
                      key={product.id}
                      direction="up"
                      delay={index * 80}
                      threshold={0.1}
                      subtle
                    >
                      <SortableProductCard
                        product={product}
                        locale={locale}
                        t={t}
                        onEdit={() => editProduct(product)}
                        onDelete={() => void removeProduct(product.id)}
                        onDeleteImage={(imageId) =>
                          void removeImage(product.id, imageId)
                        }
                      />
                    </ScrollReveal>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SortableProductCard({
  product,
  locale,
  t,
  onEdit,
  onDelete,
  onDeleteImage,
}: {
  product: VendorProduct;
  locale: "fr" | "en";
  t: ReturnType<typeof useTranslations>;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteImage: (imageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: product.id,
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="rounded-md border border-border/70 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="cursor-grab rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          {t("vendorDashboard.products.dragHandle")}
        </button>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            {t("vendorDashboard.common.edit")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onDelete}
          >
            {t("vendorDashboard.common.delete")}
          </Button>
        </div>
      </div>

      <h3 className="mt-2 font-medium">{product.title}</h3>
      <p className="text-sm text-muted-foreground">{product.description}</p>
      <p className="mt-1 text-sm">
        {formatXaf(product.priceXAF, locale)}
        {product.unit ? ` / ${product.unit}` : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        {product.inStock
          ? t("vendorDashboard.products.inStock")
          : t("vendorDashboard.products.outOfStock")}
      </p>

      {product.images.length > 0 && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {product.images.map((image) => (
            <div key={image.id} className="space-y-1">
              <img
                src={image.url}
                alt={product.title}
                className="h-20 w-full rounded object-cover"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onDeleteImage(image.id)}
              >
                {t("vendorDashboard.products.deleteImage")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
