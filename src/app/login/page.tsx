"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@yallashop/api-client";
import { Button } from "@yallashop/ui/button";
import { Input } from "@yallashop/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@yallashop/ui/card";
import { useTranslation, I18nProvider } from "@yallashop/ui/i18n-provider";
import { Languages } from "lucide-react";

function LoginForm() {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password);
      const user = (res as any)?.data?.user;
      if (user?.role === "vendor" && !user?.store_id) {
        setError(t("vendor_no_store"));
        api.logout();
        return;
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xl font-bold text-white shadow-secondary-glow">
            Y
          </div>
          <CardTitle>{t("login_title")}</CardTitle>
          <CardDescription>{t("login_subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-on-surface">
                {t("email")}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("email_placeholder")}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-on-surface">
                {t("password")}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password_placeholder")}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-error">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loading") : t("login")}
            </Button>
          </form>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setLocale(locale === "en" ? "ar" : "en")}
              className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary"
            >
              <Languages className="h-4 w-4" />
              {locale === "en" ? "العربية" : "English"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <I18nProvider>
      <LoginForm />
    </I18nProvider>
  );
}
