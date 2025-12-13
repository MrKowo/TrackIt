import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // 1. Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            console.log("✅ PWA: beforeinstallprompt event FIRED! App is installable.");
            
            // 2. Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            
            // 3. Update UI
            setIsInstallable(true);
        };

        console.log("🔄 PWA: Listening for install event...");
        window.addEventListener('beforeinstallprompt', handler);

        // Debug: Check if already in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log("ℹ️ PWA: App is already running in standalone mode.");
            setIsInstallable(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = async () => {
        console.log("🖱️ PWA: Install button clicked");
        if (!deferredPrompt) {
            console.error("❌ PWA: No deferred prompt found. Cannot trigger install.");
            return;
        }
        
        deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA: User response: ${outcome}`);
        
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    return { isInstallable, install };
};