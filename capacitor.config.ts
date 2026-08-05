import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.hallankazale.pdfeditor",
  appName: "PDF Editor",
  webDir: "out",
  android: {
    allowMixedContent: false,
    backgroundColor: "#050b14",
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#050b14",
    },
  },
};

export default config;
