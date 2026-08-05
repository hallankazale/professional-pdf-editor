import type { NextConfig } from "next";

const repositoryName = "professional-pdf-editor";
const isProduction = process.env.NODE_ENV === "production";
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // O APK carrega os arquivos diretamente do pacote; GitHub Pages precisa do subdiretório.
  basePath: isProduction && !isCapacitorBuild ? `/${repositoryName}` : "",
  assetPrefix: isProduction && !isCapacitorBuild ? `/${repositoryName}/` : "",
};

export default nextConfig;
