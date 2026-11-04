import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/tenant";
import { listNotices, listTenantOptions } from "@/services/saas.service";
import { NoticesManager } from "@/components/admin/notices-manager";

export const metadata: Metadata = { title: "Avisos" };
export const dynamic = "force-dynamic";

export default async function AdminNoticesPage() {
  const ctx = await requirePlatformAdmin();
  const [notices, tenants] = await Promise.all([listNotices(ctx), listTenantOptions(ctx)]);
  const rows = notices.map((notice) => ({
    id: notice.id,
    title: notice.title,
    message: notice.message,
    level: notice.level,
    active: notice.active,
    expiresAt: notice.expiresAt,
    tenantIds: notice.tenantIds,
    tenantNames: notice.tenantNames,
  }));

  return <NoticesManager notices={rows} tenants={tenants} />;
}
