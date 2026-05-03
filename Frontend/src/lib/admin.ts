export const ADMIN_FULL_NAME = "HAMZA CHARGUI";
export const ADMIN_EMAIL = "bestyhamza9@gmail.com";

export function isAdminEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}
