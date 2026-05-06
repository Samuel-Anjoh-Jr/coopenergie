"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

type FaqAudience = "CUSTOMER" | "VENDOR";

type Faq = {
  id: string;
  question: string;
  answer: string;
  audience: FaqAudience;
  locale: string;
  sortOrder: number;
};

type FaqForm = {
  question: string;
  answer: string;
  audience: FaqAudience;
  locale: string;
  sortOrder: string;
};

const emptyForm = (defaultLocale = "fr"): FaqForm => ({
  question: "",
  answer: "",
  audience: "CUSTOMER",
  locale: defaultLocale,
  sortOrder: "0",
});

export default function AdminFaqPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "fr";
  const t = useTranslations(locale);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FaqForm>(emptyForm(locale));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await restClient.get<Faq[]>("/faq");
      setFaqs(data);
    } catch {
      toast.error(t("errors.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const startEdit = (faq: Faq) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      audience: faq.audience,
      locale: faq.locale,
      sortOrder: String(faq.sortOrder),
    });
    setShowForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm(locale));
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error(t("adminFaq.validationError"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) {
        await restClient.patch(`/faq/${editingId}`, payload);
        toast.success(t("adminFaq.updated"));
      } else {
        await restClient.post("/faq", payload);
        toast.success(t("adminFaq.created"));
      }
      cancelEdit();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("errors.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("adminFaq.confirmDelete"))) return;
    try {
      await restClient.delete(`/faq/${id}`);
      toast.success(t("adminFaq.deleted"));
      await load();
    } catch {
      toast.error(t("errors.somethingWentWrong"));
    }
  };

  const FormPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {editingId ? t("adminFaq.editTitle") : t("adminFaq.newTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("adminFaq.audience")}</Label>
            <Select
              value={form.audience}
              onValueChange={(v) => setForm((f) => ({ ...f, audience: v as FaqAudience }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">{t("adminFaq.audienceCustomer")}</SelectItem>
                <SelectItem value="VENDOR">{t("adminFaq.audienceVendor")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("adminFaq.locale")}</Label>
            <Select
              value={form.locale}
              onValueChange={(v) => setForm((f) => ({ ...f, locale: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">FR — Français</SelectItem>
                <SelectItem value="en">EN — English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("adminFaq.sortOrder")}</Label>
            <Input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("adminFaq.question")}</Label>
          <Input
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            placeholder={t("adminFaq.questionPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("adminFaq.answer")}</Label>
          <Textarea
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            placeholder={t("adminFaq.answerPlaceholder")}
            rows={4}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            {t("common.save")}
          </Button>
          <Button variant="outline" onClick={cancelEdit} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            {t("common.cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("adminFaq.pageTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("adminFaq.pageSubtitle")}</p>
        </div>
        {!showForm && !editingId && (
          <Button onClick={() => { setShowForm(true); setForm(emptyForm(locale)); }}>
            <Plus className="mr-2 h-4 w-4" />
            {t("adminFaq.addButton")}
          </Button>
        )}
      </div>

      {(showForm && !editingId) && <FormPanel />}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : faqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("adminFaq.empty")}</p>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.id}>
              {editingId === faq.id ? (
                <FormPanel />
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{faq.audience}</Badge>
                          <Badge variant="outline">{faq.locale.toUpperCase()}</Badge>
                          <span className="text-xs text-muted-foreground">#{faq.sortOrder}</span>
                        </div>
                        <p className="font-medium text-sm">{faq.question}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(faq)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(faq.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
