import type { Metadata } from "next";
import { Inter, Tajawal, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "YallaShop Admin Dashboard",
  description: "YallaShop Admin Dashboard — Manage your marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("yallashop_locale");
  const initialLocale = localeCookie?.value === "ar" ? "ar" : "en";
  const isRtl = initialLocale === "ar";

  return (
    <html lang={initialLocale} dir={isRtl ? "rtl" : "ltr"} className={isRtl ? "font-arabic" : "font-sans"} suppressHydrationWarning>
      <body className={`${inter.variable} ${tajawal.variable} ${plusJakarta.variable} ${isRtl ? "font-arabic" : "font-sans"} min-h-screen`}>
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
