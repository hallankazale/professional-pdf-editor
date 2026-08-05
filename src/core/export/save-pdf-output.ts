import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return globalThis.btoa(binary);
}

async function saveWithNativeAndroid(bytes: Uint8Array, filename: string): Promise<void> {
  const writeResult = await Filesystem.writeFile({
    path: `exports/${filename}`,
    data: bytesToBase64(bytes),
    directory: Directory.Cache,
    recursive: true,
  });

  await Share.share({
    title: "PDF editado",
    text: "Escolha onde salvar ou com quem compartilhar o PDF.",
    url: writeResult.uri,
    dialogTitle: "Salvar PDF",
  });
}

function saveWithBrowser(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  globalThis.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

/** Mantém o mesmo fluxo de exportação no site e usa o compartilhamento nativo no APK. */
export async function savePdfOutput(bytes: Uint8Array, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await saveWithNativeAndroid(bytes, filename);
    return;
  }

  saveWithBrowser(bytes, filename);
}
