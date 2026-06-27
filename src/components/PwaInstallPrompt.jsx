import { useState, useEffect } from "react";

const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (display-mode: standalone)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md animate-slide-up">
      <div className="rounded-xl border border-cyan-400/20 bg-slate-900 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-sm font-black text-slate-950">
            TPI
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">Install TPI Forum</h3>
            <p className="mt-1 text-sm text-slate-400">
              Install the app for a better experience with offline access.
            </p>
          </div>
          <button
            className="text-slate-500 hover:text-white"
            onClick={handleDismiss}
          >
            ✕
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="btn btn-muted flex-1 py-2 text-sm"
            onClick={handleDismiss}
          >
            Not now
          </button>
          <button
            className="btn btn-primary flex-1 py-2 text-sm"
            onClick={handleInstall}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
