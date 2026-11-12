"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  ChevronLeft,
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
  Search,
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
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { VendixMark } from "@/components/brand/vendix-mark";
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
  store: Store,
  receipt: Receipt,
  credit: CreditCard,
  bell: Bell,
};

export type ShellNotice = {
  id: string;
  title: string;
  message: string;
  level: "INFO" | "ALERTA" | "URGENTE";
};

/** Cores por grupo para os cards do menu mobile (visual "colorido"). */
const GROUP_ACCENTS: Record<string, string> = {
  "Visão geral": "bg-sky-500/20 text-sky-300",
  Operação: "bg-cyan-500/20 text-cyan-300",
  Cadastros: "bg-violet-500/20 text-violet-300",
  Financeiro: "bg-emerald-500/20 text-emerald-300",
  Relatórios: "bg-amber-500/20 text-amber-300",
  Gestão: "bg-rose-500/20 text-rose-300",
  Plataforma: "bg-fuchsia-500/20 text-fuchsia-300",
};

function groupAccent(title: string) {
  return GROUP_ACCENTS[title] ?? "bg-blue-500/20 text-blue-300";
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "group flex items-center py-5 transition-all",
        collapsed ? "justify-center px-2" : "gap-3 px-4"
      )}
    >
      <VendixMark className="size-10 shrink-0 shadow-lg shadow-cyan-950/40 transition-transform duration-200 group-hover:scale-[1.04]" />
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-base font-semibold tracking-tight text-sidebar-foreground">
            Vendix
          </span>
          <span className="block truncate text-[11px] text-sidebar-foreground/55">
            Vendeu, organizou, cresceu.
          </span>
        </span>
      )}
    </Link>
  );
}

function NavContent({
  groups,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
      {groups.map((group) => (
        <div key={group.title} className="pt-3 first:pt-0">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActivePath(item, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group flex items-center rounded-lg text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {active && <ChevronRight className="ml-auto size-3.5 opacity-70" />}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function isActivePath(item: NavItem, pathname: string) {
  return (
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
  );
}

/**
 * Menu do smartphone: todos os módulos em cards coloridos, organizados por
 * grupo e com busca rápida. O menu do computador continua em lista (NavContent).
 */
function MobileNavCards({
  groups,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const filtered = term
    ? groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.label.toLowerCase().includes(term)
          ),
        }))
        .filter((group) => group.items.length > 0)
    : groups;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar módulo"
            aria-label="Buscar módulo"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-3 text-sm text-sidebar-foreground outline-none transition placeholder:text-sidebar-foreground/50 focus:border-sidebar-primary focus:bg-white/[0.09]"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {filtered.length === 0 && (
          <p className="px-2 py-10 text-center text-sm text-sidebar-foreground/60">
            Nenhum módulo encontrado para “{query.trim()}”.
          </p>
        )}
        {filtered.map((group) => (
          <section key={group.title} className="mb-5 last:mb-0">
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40">
              {group.title}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActivePath(item, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-[5.25rem] flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl border p-3 text-left shadow-sm transition active:scale-[0.97]",
                      active
                        ? "border-transparent bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-950/40"
                        : "border-white/10 bg-white/[0.06] text-sidebar-foreground/90 hover:border-white/20 hover:bg-white/[0.1]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-xl",
                        active ? "bg-white/20 text-white" : groupAccent(group.title)
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="text-[13px] font-semibold leading-tight">
                      {item.label}
                    </span>
                    {active && (
                      <ChevronRight className="absolute right-2.5 top-3 size-3.5 text-white/70" />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </div>
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

type QuickLink = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  raised?: boolean;
};

const SHORT_LABELS: Record<string, string> = {
  "/dashboard": "Início",
  "/pdv": "PDV",
  "/vendas": "Vendas",
  "/financeiro": "Financeiro",
  "/admin": "Painel",
  "/admin/empresas": "Lojas",
  "/admin/cobrancas": "Cobranças",
  "/admin/financeiro": "Recebimentos",
  "/admin/planos": "Planos",
  "/admin/avisos": "Avisos",
};

function quickLinksFor(groups: NavGroup[]): QuickLink[] {
  const available = new Set(groups.flatMap((group) => group.items.map((item) => item.href)));
  const preferred = ([
    { href: "/dashboard", label: "Início", icon: "dashboard" },
    { href: "/vendas", label: "Vendas", icon: "sales" },
    { href: "/pdv", label: "PDV", icon: "pdv", raised: true },
    { href: "/financeiro", label: "Financeiro", icon: "finance" },
  ] satisfies QuickLink[]).filter((item) => available.has(item.href));

  if (preferred.length) return preferred;

  // Plataforma SaaS (sem loja selecionada): usa os primeiros módulos do menu.
  const firstGroup = groups[0]?.items ?? [];
  return firstGroup.slice(0, 3).map((item) => ({
    href: item.href,
    label: SHORT_LABELS[item.href] ?? item.label.split(" ")[0],
    icon: item.icon,
  }));
}

function BottomNavLink({
  item,
  active,
  onClick,
}: {
  item: QuickLink;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = ICONS[item.icon];

  if (item.raised) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className="group relative flex flex-1 flex-col items-center gap-1 pt-1"
      >
        <span
          className={cn(
            "flex size-12 -translate-y-4 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/35 ring-4 ring-background transition active:scale-95",
            active && "from-blue-600 to-cyan-500 shadow-blue-600/40"
          )}
        >
          <Icon className="size-5" />
        </span>
        <span
          className={cn(
            "-mt-3 pb-1.5 text-[10px] font-semibold",
            active ? "text-primary" : "text-muted-foreground"
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground transition active:scale-95"
    >
      {active && <span className="absolute -top-px h-0.5 w-8 rounded-full bg-primary" />}
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg transition-colors",
          active && "bg-primary/10 text-primary"
        )}
      >
        <Icon className={cn("size-5", active && "stroke-[2.4]")} />
      </span>
      <span
        className={cn(
          "text-[10px] font-medium leading-none",
          active && "font-semibold text-primary"
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

function MobileBottomNav({
  groups,
  pathname,
  menuOpen,
  onOpenMenu,
}: {
  groups: NavGroup[];
  pathname: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  const quick = quickLinksFor(groups);

  return (
    <nav
      aria-label="Navegação rápida"
      className="fixed inset-x-0 bottom-0 z-30 lg:hidden"
    >
      <div className="border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-end justify-around px-1.5">
          {quick.map((item) => (
            <BottomNavLink
              key={item.href}
              item={item}
              active={isActivePath(item, pathname)}
            />
          ))}
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir todos os módulos"
            aria-expanded={menuOpen}
            className="relative flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground transition active:scale-95"
          >
            <span className="flex size-8 items-center justify-center rounded-lg">
              <Menu className="size-5" />
            </span>
            <span className="text-[10px] font-medium leading-none">Menu</span>
          </button>
        </div>
      </div>
    </nav>
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("vendix.sidebar.collapsed") === "1") {
        // Lê uma preferência externa (localStorage) uma única vez após a
        // hidratação; não há como obter isso durante o render no servidor.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // O menu é fechado pelos próprios links (onNavigate). Trava o scroll do fundo
  // e permite fechar com Esc enquanto ele está aberto.
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("vendix.sidebar.collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 lg:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="relative">
          <Brand collapsed={collapsed} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="absolute right-2 top-5 hidden rounded-md p-1 text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground lg:inline-flex"
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
        <NavContent groups={navGroups} pathname={pathname} collapsed={collapsed} />
        <div className={cn("border-t border-sidebar-border transition-all", collapsed ? "p-2" : "p-3")}>
          {!collapsed && (
            <>
              <p className="truncate text-xs font-semibold text-sidebar-foreground">{userName}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/55">{userEmail}</p>
            </>
          )}
          <div className={cn("mt-2 flex", collapsed ? "flex-col items-center gap-2" : "flex-col gap-2")}>
            <InstallAppButton
              fullWidth={!collapsed}
              size="sm"
              variant="ghost"
              label={collapsed ? "" : "Instalar aplicativo"}
              className={cn(
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed ? "justify-center px-2" : "justify-start"
              )}
            />
            <form action={logoutAction} className={cn(collapsed ? "w-auto" : "w-full")}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className={cn(
                  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed ? "w-auto justify-center px-2" : "w-full justify-start"
                )}
                title={collapsed ? "Sair" : undefined}
              >
                <LogOut className="size-4" />
                {!collapsed && <span className="ml-2">Sair</span>}
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de módulos">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] animate-in fade-in-0 duration-200"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(23rem,90vw)] flex-col overflow-hidden rounded-r-3xl border-r border-white/10 bg-sidebar shadow-2xl animate-in slide-in-from-left-8 duration-300">
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#071331] via-[#0b2255] to-[#1d4ed8] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-cyan-400/25 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-12 size-44 rounded-full bg-blue-500/25 blur-3xl"
              />
              <div className="relative flex items-start justify-between gap-3">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="group flex min-w-0 items-center gap-3"
                >
                  <VendixMark className="size-10 shrink-0 shadow-lg shadow-cyan-950/40 transition-transform duration-200 group-hover:scale-[1.04]" />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-base font-semibold tracking-tight text-white">
                      Vendix
                    </span>
                    <span className="block truncate text-[11px] text-white/60">
                      Vendeu, organizou, cresceu.
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fechar menu"
                  className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85">
                  <Building2 className="size-3 shrink-0" />
                  <span className="truncate">{tenantName}</span>
                </span>
                {branchName && (
                  <span className="inline-flex max-w-full items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/75">
                    <span className="truncate">{branchName}</span>
                  </span>
                )}
                {planName && (
                  <span className="inline-flex items-center rounded-full bg-cyan-400/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                    Plano {planName}
                  </span>
                )}
              </div>
            </div>

            <MobileNavCards
              groups={navGroups}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />

            <div className="shrink-0 border-t border-white/10 bg-sidebar/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/[0.05] p-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white">
                  {initials(userName) || "V"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-sidebar-foreground">{userName}</p>
                  <p className="truncate text-[11px] text-sidebar-foreground/55">{userEmail}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <InstallAppButton
                  fullWidth
                  size="sm"
                  variant="ghost"
                  label="Instalar app"
                  className="flex-1 justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                />
                <form action={logoutAction}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="justify-center text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    aria-label="Sair"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={cn("min-w-0 transition-all duration-200", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 border-b bg-background pt-[env(safe-area-inset-top)] lg:bg-background/85 lg:backdrop-blur">
          <div className="mx-auto flex h-16 items-center justify-between gap-3 px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
                aria-expanded={mobileOpen}
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
              <div className="hidden sm:block">
                <InstallAppButton size="sm" variant="outline" label="Instalar app" />
              </div>
              <Link
                href="/pdv"
                className="inline-flex h-9 touch-manipulation items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors duration-100 hover:bg-primary/90"
              >
                <ShoppingCart className="size-4" />
                <span className="hidden sm:inline">Abrir PDV</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-5 lg:p-7 lg:pb-7">
          {children}
        </main>
      </div>

      <MobileBottomNav
        groups={navGroups}
        pathname={pathname}
        menuOpen={mobileOpen}
        onOpenMenu={() => setMobileOpen(true)}
      />
    </div>
  );
}
