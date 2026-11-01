import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Par de botões de exportação: CSV (Excel) e PDF (impressão/arquivo). */
export function ExportButtons({ csvHref, pdfHref }: { csvHref: string; pdfHref: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={csvHref} prefetch={false}>
          <Download className="size-4" /> CSV
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={pdfHref} prefetch={false}>
          <FileText className="size-4" /> PDF
        </Link>
      </Button>
    </div>
  );
}
