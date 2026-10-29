"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, Upload } from "lucide-react";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { data, type ImportResult } from "@/lib/data";
import { todayIST } from "@/lib/dates";
import { useAsync } from "@/lib/use-async";
import { usePrefs } from "@/lib/i18n/prefs";
import { saveFile } from "@/lib/save-file";

export default function BackupPage() {
  const toast = useToast();
  const { t } = usePrefs();
  const [saved, reload] = useAsync(() => data.listSaved(), []);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportFile() {
    setExporting(true);
    try {
      const blob = await data.exportBackup();
      if (await saveFile(blob, `almirah-backup-${todayIST()}.json`, t("bk.saveTitle"))) toast(t("bk.saved"), "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setExporting(false);
    }
  }

  async function importFile() {
    if (!pending) return;
    const file = pending;
    setPending(null);
    setImporting(true);
    setError(undefined);
    setResult(null);
    try {
      setResult(await data.importBackup(file));
      reload();
    } catch (e) {
      const m = (e as Error).message;
      setError(m === "That file isn't a backup from this app." ? t("bk.notBackup") : m);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const count = saved.status === "ready" ? saved.data.length : undefined;

  return (
    <Screen title={t("bk.title")} backHref="/my-cases">
      <section aria-labelledby="exp-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <h2 id="exp-h" className="text-lg">
          {t("bk.saveTitle")}
        </h2>
        <p className="text-sm text-text-muted">
          {t("bk.saveBody", { count: count !== undefined ? ` (${count})` : "" })}
        </p>
        <Button icon={<Download size={18} />} onClick={exportFile} loading={exporting} disabled={count === 0} className="self-start">
          {t("bk.download")}
        </Button>
      </section>

      <section aria-labelledby="imp-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <h2 id="imp-h" className="text-lg">
          {t("bk.restoreTitle")}
        </h2>
        <p className="text-sm text-text-muted">
          {t("bk.restoreBody")}
        </p>
        <input
          ref={fileRef}
          id="backup-file"
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPending(f);
          }}
        />
        <Button variant="secondary" icon={<Upload size={18} />} loading={importing} onClick={() => fileRef.current?.click()} className="self-start">
          {t("bk.choose")}
        </Button>

        <div aria-live="polite">
          {error && (
            <p role="alert" className="rounded-md border border-danger p-3 text-sm text-danger">
              {error}
            </p>
          )}
          {result && (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-success">
                <CheckCircle2 aria-hidden="true" size={18} />
                {t("bk.done")}
              </p>
              <p>
                {t("bk.counts", { added: result.added, updated: result.updated, skipped: result.skipped })}
              </p>
              {result.errors.length > 0 && (
                <ul className="list-disc pl-5 text-text-muted">
                  {result.errors.slice(0, 5).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                  {result.errors.length > 5 && <li>{t("bk.more", { n: result.errors.length - 5 })}</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(pending)}
        title={t("bk.confirmTitle")}
        body={t("bk.confirmBody", { file: pending?.name ?? "" })}
        confirmLabel={t("bk.restore")}
        onConfirm={importFile}
        onCancel={() => {
          setPending(null);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
    </Screen>
  );
}
