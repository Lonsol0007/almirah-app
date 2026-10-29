"use client";

import { useEffect, useRef } from "react";
import { usePrefs } from "@/lib/i18n/prefs";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel, destructive, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = usePrefs();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg bg-surface-raised p-0 text-text shadow-pop"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 id="confirm-title" className="text-lg">
          {title}
        </h2>
        <p className="text-sm text-text-muted">{body}</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} autoFocus>
            {t("common.cancel")}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
