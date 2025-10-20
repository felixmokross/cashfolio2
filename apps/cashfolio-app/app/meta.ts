export const siteName = "Cashfolio";
export const adminSiteName = "Cashfolio Admin";

export function getPageTitle(title?: string): string {
  return title ? `${title} · ${siteName}` : siteName;
}

export function getAdminPageTitle(title?: string): string {
  return title ? `${title} · ${adminSiteName}` : adminSiteName;
}
