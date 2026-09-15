"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { FILE_BUCKET, TUS_CHUNK_BYTES, buildFileKey, validateFileMetadata } from "./validation";

function base64(value: string): string { return btoa(unescape(encodeURIComponent(value))); }
function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export async function resumableUpload(file: File, requestId: string, onProgress: (percent: number) => void): Promise<string> {
  const validation = validateFileMetadata(file.name, file.size);
  if (!validation.ok) throw new Error(validation.message);
  const supabase = createBrowserSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token || !session.user?.id) throw new Error("Sua sessão expirou. Entre novamente antes de enviar o arquivo.");
  const { url, publishableKey } = getSupabaseEnv();
  const projectRef = new URL(url).hostname.split(".")[0];
  if (!projectRef) throw new Error("Não foi possível identificar o projeto de armazenamento.");
  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  const key = buildFileKey(requestId, file.name);
  const objectName = `${session.user.id}/${key}`;
  const resumeKey = `memoria:tus:${objectName}:${file.size}:${file.lastModified}`;
  const headers = { Authorization: `Bearer ${session.access_token}`, apikey: publishableKey, "Tus-Resumable": "1.0.0" };
  let uploadUrl = localStorage.getItem(resumeKey);
  let offset = 0;

  if (uploadUrl) {
    const head = await fetch(uploadUrl, { method: "HEAD", headers });
    if (head.ok) offset = Number(head.headers.get("Upload-Offset") ?? 0);
    else { localStorage.removeItem(resumeKey); uploadUrl = null; }
  }
  if (!uploadUrl) {
    const metadata = [
      `bucketName ${base64(FILE_BUCKET)}`,
      `objectName ${base64(objectName)}`,
      `contentType ${base64(validation.contentType)}`,
      `cacheControl ${base64("0")}`,
    ].join(",");
    const created = await fetch(endpoint, { method: "POST", headers: { ...headers, "Upload-Length": String(file.size), "Upload-Metadata": metadata } });
    if (!created.ok) throw new Error(`O armazenamento recusou o início do envio (${created.status}).`);
    const location = created.headers.get("Location");
    if (!location) throw new Error("O armazenamento não retornou a URL de continuação do envio.");
    uploadUrl = new URL(location, endpoint).toString();
    localStorage.setItem(resumeKey, uploadUrl);
  }

  const retryDelays = [0, 3000, 5000, 10000, 20000];
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + TUS_CHUNK_BYTES, file.size));
    let response: Response | undefined;
    for (const delay of retryDelays) {
      if (delay) await sleep(delay);
      try {
        response = await fetch(uploadUrl, { method: "PATCH", headers: { ...headers, "Upload-Offset": String(offset), "Content-Type": "application/offset+octet-stream" }, body: chunk });
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 409)) break;
      } catch { response = undefined; }
    }
    if (!response?.ok) throw new Error(`O envio foi interrompido${response ? ` (${response.status})` : ""}. Tente novamente para continuar do último bloco confirmado.`);
    const next = Number(response.headers.get("Upload-Offset"));
    if (!Number.isSafeInteger(next) || next <= offset || next > file.size) throw new Error("O armazenamento retornou um deslocamento inválido para o upload resumível.");
    offset = next; onProgress(Math.min(100, (offset / file.size) * 100));
  }
  localStorage.removeItem(resumeKey);
  return key;
}
