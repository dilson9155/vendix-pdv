"use client";

import { useRouter } from "next/navigation";
import { InlineAction } from "@/components/forms/form-kit";
import { reconcileLedgerAction } from "@/app/actions/finance.actions";

export function InlineReconcile({ entryId, reconciled }: { entryId: string; reconciled: boolean }) {
  const router = useRouter();
  return (
    <InlineAction
      action={async () => {
        const result = await reconcileLedgerAction(entryId, !reconciled);
        return result;
      }}
      label={reconciled ? "Conciliado" : "Conciliar"}
      variant={reconciled ? "secondary" : "outline"}
      onDone={() => router.refresh()}
    />
  );
}
