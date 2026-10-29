"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard, Store, ShoppingCart, Package, Tags, Truck, Wallet, Image, Settings,
  ChevronDown, LogOut, Languages, User, Bell, Search, ClipboardList, PackageCheck,
} from "lucide-react"
import { useTranslation } from "@yallashop/ui/i18n-provider"
import { api } from "@yallashop/api-client"
import { cn } from "@/lib/utils"
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarSeparator, SidebarInset, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

interface NavItem {
  href: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
  adminOnly?: boolean
  courierOnly?: boolean
  customerOnly?: boolean
}

const allNavItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/carousel-ads", labelKey: "carousel_ads", icon: Image, adminOnly: true },
  { href: "/vendors", labelKey: "vendors", icon: Store, adminOnly: true },
  { href: "/categories", labelKey: "categories", icon: Tags },
  { href: "/products", labelKey: "products", icon: Package },
  { href: "/orders", labelKey: "orders", icon: ShoppingCart },
  { href: "/courier-tasks", labelKey: "courier_tasks", icon: ClipboardList },
  { href: "/my-orders", labelKey: "my_orders", icon: PackageCheck, customerOnly: true },
  { href: "/couriers", labelKey: "couriers", icon: Truck, adminOnly: true },
  { href: "/payouts", labelKey: "payouts", icon: Wallet, adminOnly: true },
  { href: "/settings", labelKey: "settings", icon: Settings },
]

function SidebarInner({ titleKey, children }: { titleKey: string; children: ReactNode }) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const { t, direction, locale, setLocale } = useTranslation()
  const user = api.getUser()
  const isVendor = user?.role === "vendor"
  const isCourier = user?.role === "courier"
  const isCustomer = user?.role === "customer"

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && isVendor) return false
    if (item.courierOnly && !isCourier) return false
    if (item.customerOnly && !isCustomer) return false
    if (isCourier) return item.href === "/" || item.href === "/courier-tasks"
    if (isCustomer) return item.href === "/" || item.href === "/my-orders"
    return true
  })

  const handleLogout = () => {
    api.logout()
    window.location.href = "/login"
  }

  return (
    <>
      <Sidebar side={direction === "rtl" ? "right" : "left"} className="border-r border-outline-variant">
        <SidebarHeader className="border-b border-outline-variant/50 h-20 justify-center">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-white text-sm font-bold shadow-secondary-glow shrink-0">
              Y
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <span className="text-headline-md font-bold tracking-tight text-sidebar-foreground block leading-none">YallaShop</span>
                <span className="text-label-sm text-sidebar-foreground/70">{isVendor ? t("vendor") : isCourier ? t("courier") : isCustomer ? t("customer") : t("admin")}</span>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <NavItems items={navItems} collapsed={collapsed} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator className="opacity-30" />
        <SidebarFooter>
          <div className="flex flex-col gap-1 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocale(locale === "en" ? "ar" : "en")}
                  className="text-sidebar-foreground/70 hover:text-secondary"
                  tooltip={locale === "en" ? "العربية" : "English"}
                >
                  <Languages />
                  <span className={cn("transition-opacity duration-200", collapsed && "hidden")}>{locale === "en" ? "العربية" : "English"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="text-sidebar-foreground/70 hover:text-error"
                  tooltip={t("logout")}
                >
                  <LogOut />
                  <span className={cn("transition-opacity duration-200", collapsed && "hidden")}>{t("logout")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-20 items-center gap-4 border-b border-outline-variant/50 bg-background/80 backdrop-blur-md px-8 sticky top-0 z-10">
          <SidebarTrigger className="text-on-surface-variant hover:text-secondary hover:bg-surface-container" />
          <div className="flex-1">
            <h1 className="text-headline-md font-bold text-on-surface">{t(titleKey)}</h1>
            <p className="text-body-md text-on-surface-variant">
              {t(titleKey === "dashboard" ? "marketplace_overview" : `view_manage_${titleKey}`)}
            </p>
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <Input
              placeholder={t("search")}
              className="h-11 w-64 rounded-full border-outline-variant bg-surface-container-lowest pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-on-surface-variant hover:text-secondary hover:bg-surface-container relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-background" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setLocale(locale === "en" ? "ar" : "en")} className="text-on-surface-variant hover:text-secondary hover:bg-surface-container">
              <Languages className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10 cursor-pointer ml-1 border border-outline-variant bg-surface-container-high" onClick={handleLogout}>
              <AvatarFallback className="bg-secondary text-white text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="flex-1 overflow-auto" dir={direction}>
          <div className="w-full p-6 lg:p-8 gap-3  animate-fade-in">
            {children}
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

function NavItems({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
  const { t } = useTranslation()
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {items.map((item, i) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        if (item.children) {
          return (
            <SidebarMenuItem key={item.href} style={{ animation: `fade-in-up 0.3s ease-out ${i * 0.05}s both` }}>
              <SidebarMenuButton asChild tooltip={t(item.labelKey)}>
                <Link href={item.href}>
                  <item.icon />
                  <span className={cn("transition-opacity duration-200", collapsed && "hidden")}>{t(item.labelKey)}</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuSub>
                {item.children.map((child) => (
                  <SidebarMenuSubItem key={child.href}>
                    <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                      <Link href={child.href}>
                        <child.icon />
                        <span>{t(child.labelKey)}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </SidebarMenuItem>
          )
        }
        return (
          <SidebarMenuItem key={item.href} style={{ animation: `fade-in-up 0.3s ease-out ${i * 0.05}s both` }}>
            <SidebarMenuButton asChild isActive={active} tooltip={t(item.labelKey)} className={active ? "border-l-4 border-secondary bg-surface-container-low text-on-surface font-semibold" : ""}>
              <Link href={item.href}>
                <item.icon />
                <span className={cn("transition-opacity duration-200", collapsed && "hidden")}>{t(item.labelKey)}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const titleKey = pathname === "/" ? "dashboard"
    : pathname.startsWith("/carousel-ads") ? "carousel_ads"
    : pathname.startsWith("/vendors") ? "vendors"
    : pathname.startsWith("/categories") ? "categories"
    : pathname.startsWith("/products") ? "products"
    : pathname.startsWith("/orders") ? "orders"
    : pathname.startsWith("/courier-tasks") ? "courier_tasks"
    : pathname.startsWith("/my-orders") ? "my_orders"
    : pathname.startsWith("/couriers") ? "couriers"
    : pathname.startsWith("/payouts") ? "payouts"
    : pathname.startsWith("/settings") ? "settings"
    : "dashboard"

  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarInner titleKey={titleKey}>{children}</SidebarInner>
    </SidebarProvider>
  )
}