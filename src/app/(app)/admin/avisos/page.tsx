import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/tenant";
import { listNotices } from "@/services/saas.service";
import { NoticesManager } from "@/components/admin/notices-manager";

export const metadata: Metadata = { title: "Avisos" };
export const dynamic = "force-dynamic";

export default async function AdminNoticesPage() {
  const ctx = await requirePlatformAdmin();
  const notices = await listNotices(ctx);
  const rows = notices.map((notice) => ({
    id: notice.id,
    title: notice.title,
    message: notice.message,
    level: notice.level,
    active: notice.active,
    expiresAt: notice.expiresAt,
  }));

  return <NoticesManager notices={rows} />;
}
