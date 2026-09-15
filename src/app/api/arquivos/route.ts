import { fileApiAccess, privateJson } from "@/lib/files/server";

export async function POST() {
  const access = await fileApiAccess();
  if (!access.ok) return access.response;
  return privateJson({ message: "Uploads são enviados diretamente ao Supabase Storage pelo protocolo TUS resumível." }, 405);
}
