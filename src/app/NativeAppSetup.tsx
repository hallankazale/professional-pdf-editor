"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Configura o contêiner nativo sem acoplar a interface web ao Android.
 * A classe permite aplicar safe areas apenas no APK, sem alterar o site.
 */
export function NativeAppSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add("is-native-app");

    void Promise.allSettled([
      StatusBar.setOverlaysWebView({ overlay: false }),
      StatusBar.setStyle({ style: Style.Light }),
      StatusBar.setBackgroundColor({ color: "#050b14" }),
    ]);
  }, []);

  return null;
}
