export function siteOrigin() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const configured = process.env.SITE_URL || (host ? "https://" + host : undefined);
  return configured ? new URL(configured).origin : undefined;
}
