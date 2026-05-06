import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatXaf, getVendorProducts, VendorProduct } from "@/lib/vendor-dashboard";
import { useMobileTranslations } from "@/lib/translations";

type ProductForm = {
  id?: string;
  title: string;
  description: string;
  priceXAF: string;
  unit: string;
  inStock: boolean;
};

const emptyForm: ProductForm = {
  title: "",
  description: "",
  priceXAF: "",
  unit: "",
  inStock: true,
};

export default function VendorProductsScreen() {
  const { t } = useMobileTranslations();
  const user = getUser();
  const vendorId = user?.vendor?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const sorted = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products],
  );

  const load = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    setLoading(true);
    try {
      const data = await getVendorProducts(vendorId);
      setProducts(data);
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t, vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProduct = async () => {
    if (!form.title || !form.description || !form.priceXAF) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        t("vendorDashboard.products.fillRequired"),
      );
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await api.patch(`/vendors/products/${form.id}`, {
          title: form.title,
          description: form.description,
          priceXAF: Number(form.priceXAF),
          unit: form.unit,
          inStock: form.inStock,
        });
      } else {
        await api.post("/vendors/products", {
          title: form.title,
          description: form.description,
          priceXAF: Number(form.priceXAF),
          unit: form.unit,
          inStock: form.inStock,
        });
      }

      setForm(emptyForm);
      await load();
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.delete(`/vendors/products/${id}`);
      await load();
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    }
  };

  const moveProduct = async (id: string, direction: "up" | "down") => {
    const current = [...sorted];
    const index = current.findIndex((item) => item.id === id);

    if (index < 0) {
      return;
    }

    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= current.length) {
      return;
    }

    const temp = current[index];
    current[index] = current[nextIndex];
    current[nextIndex] = temp;

    try {
      await api.patch("/vendors/products/reorder", {
        orderedIds: current.map((item) => item.id),
      });
      setProducts(current.map((item, idx) => ({ ...item, sortOrder: idx })));
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#F5F8F5] px-4 py-4">
      <Text className="mb-3 text-xl font-semibold text-[#111827]">
        {t("vendorDashboard.products.title")}
      </Text>

      <View className="mb-4 gap-3 rounded-xl bg-white p-4">
        <TextInput
          value={form.title}
          onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
          placeholder={t("vendorDashboard.products.productTitle")}
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
        />
        <TextInput
          value={form.description}
          onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
          placeholder={t("vendorDashboard.products.description")}
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
          multiline
        />
        <TextInput
          value={form.priceXAF}
          onChangeText={(value) => setForm((prev) => ({ ...prev, priceXAF: value }))}
          placeholder={t("vendorDashboard.products.priceXaf")}
          keyboardType="numeric"
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
        />
        <TextInput
          value={form.unit}
          onChangeText={(value) => setForm((prev) => ({ ...prev, unit: value }))}
          placeholder={t("vendorDashboard.products.unit")}
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
        />

        <TouchableOpacity
          onPress={() => setForm((prev) => ({ ...prev, inStock: !prev.inStock }))}
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
        >
          <Text>{form.inStock ? t("vendorDashboard.products.inStock") : t("vendorDashboard.products.outOfStock")}</Text>
        </TouchableOpacity>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => void saveProduct()}
            className="flex-1 rounded-md bg-[#1B5E20] px-3 py-3"
          >
            <Text className="text-center font-semibold text-white">
              {saving ? t("vendorDashboard.common.saving") : t("vendorDashboard.common.save")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setForm(emptyForm)}
            className="flex-1 rounded-md border border-[#D1D5DB] px-3 py-3"
          >
            <Text className="text-center font-semibold text-[#111827]">
              {t("vendorDashboard.common.reset")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <Text className="text-[#6B7280]">{t("vendorDashboard.common.loading")}</Text>
      ) : sorted.length === 0 ? (
        <Text className="text-[#6B7280]">{t("vendorDashboard.products.noProducts")}</Text>
      ) : (
        sorted.map((product, index) => (
          <View key={product.id} className="mb-3 rounded-xl bg-white p-4">
            <Text className="text-base font-semibold text-[#111827]">{product.title}</Text>
            <Text className="text-sm text-[#4B5563]">{product.description}</Text>
            <Text className="mt-1 text-sm text-[#4B5563]">
              {formatXaf(product.priceXAF)} {product.unit ? `/ ${product.unit}` : ""}
            </Text>

            <View className="mt-3 flex-row gap-2">
              <TouchableOpacity
                onPress={() =>
                  setForm({
                    id: product.id,
                    title: product.title,
                    description: product.description,
                    priceXAF: String(product.priceXAF),
                    unit: product.unit || "",
                    inStock: product.inStock,
                  })
                }
                className="rounded-md border border-[#D1D5DB] px-3 py-2"
              >
                <Text>{t("vendorDashboard.common.edit")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void deleteProduct(product.id)}
                className="rounded-md border border-[#EF4444] px-3 py-2"
              >
                <Text className="text-[#B91C1C]">{t("vendorDashboard.common.delete")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={index === 0}
                onPress={() => void moveProduct(product.id, "up")}
                className="rounded-md border border-[#D1D5DB] px-3 py-2"
              >
                <Text>{t("vendorDashboard.products.moveUp")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={index === sorted.length - 1}
                onPress={() => void moveProduct(product.id, "down")}
                className="rounded-md border border-[#D1D5DB] px-3 py-2"
              >
                <Text>{t("vendorDashboard.products.moveDown")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
