"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/shared/StarRating";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchVendorProfile,
  multipartVendorRequest,
  VendorProfile,
} from "@/lib/vendor-dashboard";
import { restClient } from "@/lib/rest-client";
import { useTranslations } from "@/lib/translations";

type ProfileForm = {
  businessName: string;
  description: string;
  city: string;
  country: string;
};

export default function VendorProfilePage() {
  const params = useParams();
  const locale = (params.locale as "fr" | "en") || "en";
  const t = useTranslations(locale);
  const { data: session } = useSession();
  const vendorId = session?.user?.vendor?.id;

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    businessName: "",
    description: "",
    city: "",
    country: "CM",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    try {
      const data = await fetchVendorProfile(vendorId);
      setProfile(data);
      setForm({
        businessName: data.businessName || "",
        description: data.description || "",
        city: data.city || "",
        country: data.country || "CM",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.loadFailed"),
      );
    }
  }, [t, vendorId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const hasData = useMemo(() => Boolean(profile), [profile]);

  const onFileSelected = async (
    field: "logo" | "cover",
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }

    const formData = new FormData();
    formData.append(field, selected);

    try {
      if (field === "logo") {
        setUploadingLogo(true);
        await multipartVendorRequest("POST", "/vendors/logo", formData);
      } else {
        setUploadingCover(true);
        await multipartVendorRequest("POST", "/vendors/cover", formData);
      }

      toast.success(t("vendorDashboard.feedback.mediaUpdated"));
      await loadProfile();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.updateFailed"),
      );
    } finally {
      if (field === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingCover(false);
      }
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await restClient.patch("/vendors/profile", {
        businessName: form.businessName,
        description: form.description,
        city: form.city,
        country: form.country,
      });
      toast.success(t("vendorDashboard.feedback.profileSaved"));
      await loadProfile();
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

  if (!hasData) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t("vendorDashboard.loading")}
      </div>
    );
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>{t("vendorDashboard.profile.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border/70 p-3 lg:col-span-2">
            <p className="text-sm font-medium text-foreground">
              {t("vendorDashboard.overview.avgRating")}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <StarRating rating={Number(profile?.avgRating || 0)} size="sm" />
              <span>
                {Number(profile?.avgRating || 0).toFixed(1)} / 5 (
                {profile?.totalReviews || 0})
              </span>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-border/70 p-3">
            <p className="text-sm font-medium">
              {t("vendorDashboard.profile.logo")}
            </p>
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt="Vendor logo"
                className="h-32 w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                {t("vendorDashboard.profile.noLogo")}
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => void onFileSelected("logo", e)}
            />
            <p className="text-xs text-muted-foreground">
              {uploadingLogo
                ? t("vendorDashboard.profile.uploading")
                : t("vendorDashboard.profile.dragHint")}
            </p>
          </div>

          <div className="space-y-2 rounded-md border border-border/70 p-3">
            <p className="text-sm font-medium">
              {t("vendorDashboard.profile.cover")}
            </p>
            {profile?.coverImageUrl ? (
              <img
                src={profile.coverImageUrl}
                alt="Vendor cover"
                className="h-32 w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                {t("vendorDashboard.profile.noCover")}
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => void onFileSelected("cover", e)}
            />
            <p className="text-xs text-muted-foreground">
              {uploadingCover
                ? t("vendorDashboard.profile.uploading")
                : t("vendorDashboard.profile.dragHint")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            value={form.businessName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, businessName: event.target.value }))
            }
            placeholder={t("vendorDashboard.profile.businessName")}
          />
          <Input
            value={form.city}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, city: event.target.value }))
            }
            placeholder={t("vendorDashboard.profile.city")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            value={form.country}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, country: event.target.value }))
            }
            placeholder={t("vendorDashboard.profile.country")}
          />
        </div>

        <Textarea
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
          placeholder={t("vendorDashboard.profile.description")}
          rows={5}
        />

        <Button onClick={saveProfile} disabled={saving}>
          {saving
            ? t("vendorDashboard.common.saving")
            : t("vendorDashboard.common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
