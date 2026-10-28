"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Package,
  PieChart,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth.actions";

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };
export type NavGroup = { title: string; items: NavItem[] };

const ICONS = {
  dashboard: LayoutDashboard,
  pdv: ShoppingCart,
  sales: Receipt,
  cash: CircleDollarSign,
  customers: Users,
  products: Tags,
  stock: Boxes,
  suppliers: Truck,
  finance: Wallet,
  payables: ArrowLeftRight,
  receivables: ClipboardList,
  cashflow: LineChart,
  ledger: BookOpen,
  accounts: Building2,
  transfers: ArrowLeftRight,
  reports: BarChart3,
  salesreport: PieChart,
  stockreport: Package,
  dre: FileText,
  users: UserCog,
  settings: Settings,
  audit: ShieldCheck,
  subscription: CreditCard,
  admin: Store,
};

export type ShellNotice = {
  id: string;
  title: string;
  message: string;
  level: "INFO" | "ALERTA" | "URGENTE";
};

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-black text-white shadow-lg shadow-violet-900/30">
        V
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-base font-semibold tracking-tight text-sidebar-foreground">
          Vendix
        </span>
        <span className="block truncate text-[11px] text-sidebar-foreground/55">
          Vendeu, organizou, cresceu.
        </span>
      </span>
    </Link>
  );
}

function NavContent({
  groups,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
      {groups.map((group) => (
        <div key={group.title} className="pt-3 first:pt-0">
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {active && <ChevronRight className="ml-auto size-3.5 opacity-70" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

const LEVEL_STYLES: Record<ShellNotice["level"], string> = {
  INFO: "border-sky-200 bg-sky-50 text-sky-900",
  ALERTA: "border-amber-200 bg-amber-50 text-amber-900",
  URGENTE: "border-red-200 bg-red-50 text-red-900",
};

function NoticeBell({ notices }: { notices: ShellNotice[] }) {
  const [open, setOpen] = useState(false);
  if (!notices.length) return null;
  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Notificações (${notices.length})`}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-4" />
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white">
          {notices.length > 9 ? "9+" : notices.length}
        </span>
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fechar notificações"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-popover p-2 shadow-xl">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className={cn("mb-2 rounded-lg border p-3 last:mb-0", LEVEL_STYLES[notice.level])}
              >
                <p className="text-sm font-semibold">{notice.title}</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed">{notice.message}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({
  userName,
  userEmail,
  tenantName,
  branchName,
  planName,
  navGroups,
  notices,
  children,
}: {
  userName: string;
  userEmail: string;
  tenantName: string;
  branchName: string | null;
  planName: string | null;
  navGroups: NavGroup[];
  notices: ShellNotice[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const footer = (
    <div className="border-t border-sidebar-border p-3">
      <p className="truncate text-xs font-semibold text-sidebar-foreground">{userName}</p>
      <p className="truncate text-[11px] text-sidebar-foreground/55">{userEmail}</p>
      <form action={logoutAction} className="mt-2">
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" /> Sair
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <NavContent groups={navGroups} pathname={pathname} />
        {footer}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(19rem,86vw)] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl">
            <div className="flex items-start justify-between pr-2">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                className="mt-4 text-sidebar-foreground/70"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </Button>
            </div>
            <NavContent
              groups={navGroups}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            {footer}
          </aside>
        </div>
      )}

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background/85 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{tenantName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {branchName ?? "Todas as unidades"}
                {planName ? ` · Plano ${planName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NoticeBell notices={notices} />
            <Link
              href="/pdv"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <ShoppingCart className="size-4" />
              <span className="hidden sm:inline">Abrir PDV</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-3 sm:p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
