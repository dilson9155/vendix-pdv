"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NoticeDialog, type NoticeRow } from "@/components/admin/notice-dialog";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, StatusBadge, TableShell, EmptyState } from "@/components/page-blocks";

export function NoticesManager({ notices }: { notices: NoticeRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NoticeRow | null>(null);

  const activeCount = notices.filter((notice) => notice.active).length;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (notice: NoticeRow) => {
    setEditing(notice);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Plataforma"
        title="Avisos"
        description="Avisos publicados para as empresas da plataforma (manutenção, cobrança, novidades)."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" /> Novo aviso
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avisos" value={String(notices.length)} />
        <StatCard label="Publicados" value={String(activeCount)} tone="positive" />
        <StatCard label="Inativos" value={String(notices.length - activeCount)} />
        <StatCard label="Níveis" value={String(new Set(notices.map((notice) => notice.level)).size)} />
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        {notices.length === 0 ? (
          <EmptyState title="Nenhum aviso cadastrado" description="Crie avisos para comunicar manutenções ou novidades." />
        ) : (
          <div className="overflow-x-auto">
            <TableShell caption="Avisos">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Nível</th>
                  <th>Mensagem</th>
                  <th>Publicado</th>
                  <th>Expira em</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {notices.map((notice) => (
                  <tr key={notice.id}>
                    <td className="font-medium">{notice.title}</td>
                    <td>
                      <StatusBadge status={notice.level} />
                    </td>
                    <td className="max-w-md">
                      <p className="line-clamp-2 text-xs">{notice.message}</p>
                    </td>
                    <td>
                      <StatusBadge status={notice.active ? "ATIVO" : "INATIVO"} />
                    </td>
                    <td>{notice.expiresAt ? new Date(notice.expiresAt).toISOString().slice(0, 10) : "—"}</td>
                    <td>
                      <Button size="sm" variant="outline" onClick={() => openEdit(notice)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        )}
      </section>

      <NoticeDialog open={dialogOpen} onOpenChange={setDialogOpen} notice={editing} />
    </div>
  );
}
