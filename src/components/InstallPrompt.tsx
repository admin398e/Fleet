"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Install hint. On Android/desktop Chrome we use the `beforeinstallprompt`
 * event. iOS Safari has no such event, so we show a manual "Add to Home Screen"
 * instruction instead — and only when not already running standalone.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes navigator.standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || sessionStorage.getItem("installDismissed")) {
      setDismissed(true);
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed) return null;

  const close = () => {
    sessionStorage.setItem("installDismissed", "1");
    setDismissed(true);
  };

  if (deferred) {
    return (
      <div className="card flex items-center justify-between gap-3">
        <p className="text-sm">Install DoorPin for quick access.</p>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              close();
            }}
            className="btn-primary px-3 text-sm"
          >
            Install
          </button>
          <button onClick={close} className="text-sm text-gray-400">
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (isIos) {
    return (
      <div className="card flex items-start justify-between gap-3">
        <p className="text-sm">
          Add DoorPin to your Home Screen: tap{" "}
          <span aria-hidden>⎙</span> <span className="font-semibold">Share</span>{" "}
          then <span className="font-semibold">Add to Home Screen</span>.
        </p>
        <button onClick={close} className="text-sm text-gray-400" aria-label="Dismiss">
          ✕
        </button>
      </div>
    );
  }

  return null;
}
