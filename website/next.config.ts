import type { NextConfig } from "next";

const basePath = process.env.SITE_BASE_PATH || "";
const config: NextConfig = { output: "export", trailingSlash: true, basePath, env: { SITE_BASE_PATH: basePath } };
export default config;
