"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CameraOff, QrCode } from "lucide-react";
import { CnrForm } from "@/components/cnr-form";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { data } from "@/lib/data";
import { usePrefs } from "@/lib/i18n/prefs";

// BarcodeDetector is not in TypeScript's DOM lib yet.
interface Detector {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

type Phase = "idle" | "starting" | "scanning" | "denied" | "unsupported" | "found";

export default function ScanPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>();

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  // Whether this browser can read QR codes. The server can't know, so it assumes yes and the
  // browser corrects it after hydration without a mismatch.
  const supported = useSyncExternalStore(
    () => () => {},
    () => Boolean(window.BarcodeDetector),
    () => true,
  );

  useEffect(() => stop, [stop]);

  async function start() {
    if (!window.BarcodeDetector) return setPhase("unsupported");
    setPhase("starting");
    setMessage(undefined);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    } catch {
      return setPhase("denied");
    }
    const v = video.current!;
    v.srcObject = stream.current;
    await v.play();
    setPhase("scanning");
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

    const loop = async () => {
      if (!stream.current) return;
      try {
        const codes = await detector.detect(v);
        const text = codes[0]?.rawValue;
        const cnr = text?.toUpperCase().match(/[A-Z]{4}[0-9A-Z]{12}/)?.[0];
        if (cnr) {
          setPhase("found");
          stop();
          const hit = await data.findByCnr(cnr);
          router.push(hit ? `/cases/${hit.id}` : `/cases/new?cnr=${cnr}`);
          return;
        }
        if (text) setMessage(t("sc.notCnr"));
      } catch {
        /* a frame that can't be read; keep going */
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  return (
    <Screen title={t("sc.title")} backHref="/cnr">
      {phase === "unsupported" || !supported ? (
        <EmptyState
          icon={<CameraOff size={40} />}
          title={t("sc.unsupported")}
          body={t("sc.unsupportedBody")}
        />
      ) : phase === "denied" ? (
        <EmptyState
          icon={<CameraOff size={40} />}
          title={t("sc.denied")}
          body={t("sc.deniedBody")}
          action={<Button variant="secondary" onClick={start}>{t("common.tryAgain")}</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-text">
            <video ref={video} muted playsInline className="h-full w-full object-cover" aria-label={t("sc.cameraView")} />
            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-raised p-6 text-center">
                <QrCode aria-hidden="true" size={48} className="text-text-muted" />
                <p className="text-sm text-text-muted">{t("sc.point")}</p>
                <Button onClick={start}>{t("sc.start")}</Button>
              </div>
            )}
          </div>
          <p role="status" className="text-sm text-text-muted">
            {phase === "starting" && t("sc.starting")}
            {phase === "scanning" && (message ?? t("sc.looking"))}
            {phase === "found" && t("sc.found")}
          </p>
        </div>
      )}

      <section className="rounded-lg border border-border bg-surface-raised p-4 shadow-card">
        <h2 className="mb-3 text-base font-semibold">{t("sc.orType")}</h2>
        <CnrForm compact />
      </section>
    </Screen>
  );
}
