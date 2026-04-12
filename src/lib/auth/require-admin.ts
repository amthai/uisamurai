import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user?.is_admin) {
    notFound();
  }
  return user;
}
