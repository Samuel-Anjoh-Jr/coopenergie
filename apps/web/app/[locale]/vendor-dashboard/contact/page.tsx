"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchVendorProfile } from "@/lib/vendor-dashboard";
import { restClient } from "@/lib/rest-client";
import { useTranslations } from "@/lib/translations";

type ContactForm = {
  email: string;
  whatsappNumber: string;
  website: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
};

export default function VendorContactPage() {
  const params = useParams();
  const locale = (params.locale as "fr" | "en") || "en";
  const t = useTranslations(locale);
  const { data: session } = useSession();
  const vendorId = session?.user?.vendor?.id;

  const [form, setForm] = useState<ContactForm>({
    email: "",
    whatsappNumber: "",
    website: "",
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    linkedinUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    setLoading(true);
    try {
      const profile = await fetchVendorProfile(vendorId);
      setForm({
        email: profile.email || "",
        whatsappNumber: profile.whatsappNumber || "",
        website: profile.website || "",
        facebookUrl: profile.facebookUrl || "",
        instagramUrl: profile.instagramUrl || "",
        twitterUrl: profile.twitterUrl || "",
        linkedinUrl: profile.linkedinUrl || "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("vendorDashboard.feedback.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, vendorId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const save = async () => {
    setSaving(true);
    try {
      await restClient.patch("/vendors/contact", form);
      toast.success(t("vendorDashboard.feedback.contactSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("vendorDashboard.feedback.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">{t("vendorDashboard.loading")}</div>;
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>{t("vendorDashboard.contact.title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Input
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder={t("vendorDashboard.contact.email")}
          type="email"
        />
        <Input
          value={form.whatsappNumber}
          onChange={(event) => setForm((prev) => ({ ...prev, whatsappNumber: event.target.value }))}
          placeholder={t("vendorDashboard.contact.whatsapp")}
        />
        <Input
          value={form.website}
          onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
          placeholder={t("vendorDashboard.contact.website")}
        />
        <Input
          value={form.facebookUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, facebookUrl: event.target.value }))}
          placeholder={t("vendorDashboard.contact.facebook")}
        />
        <Input
          value={form.instagramUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, instagramUrl: event.target.value }))}
          placeholder={t("vendorDashboard.contact.instagram")}
        />
        <Input
          value={form.twitterUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, twitterUrl: event.target.value }))}
          placeholder={t("vendorDashboard.contact.twitter")}
        />
        <Input
          value={form.linkedinUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
          placeholder={t("vendorDashboard.contact.linkedin")}
        />

        <Button onClick={save} disabled={saving}>
          {saving ? t("vendorDashboard.common.saving") : t("vendorDashboard.common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
