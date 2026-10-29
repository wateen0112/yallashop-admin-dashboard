"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { I18nProvider } from "@yallashop/ui/i18n-provider";

export function Providers({ children, initialLocale }: { children: ReactNode; initialLocale?: string }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={initialLocale as "en" | "ar"}>{children}</I18nProvider>
    </QueryClientProvider>
  );
}
