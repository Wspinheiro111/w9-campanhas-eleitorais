export const PLATFORM_ADMIN_EMAIL = "gerentewilliam.pinheiro@gmail.com";

export function isPlatformAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
}
