// Envio de imagens pelo site. Nada de subir arquivo à mão no storage: o painel faz tudo.
import { db, urlPublica } from "./db";

export const lerComoDataUrl = (f: Blob) =>
  new Promise<string>((ok, erro) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.onerror = erro; fr.readAsDataURL(f); });

export const dimensoes = (dataUrl: string) =>
  new Promise<{ w: number; h: number }>((ok) => { const i = new Image(); i.onload = () => ok({ w: i.width, h: i.height }); i.onerror = () => ok({ w: 0, h: 0 }); i.src = dataUrl; });

/** Recorta em quadrado e reduz (foto de perfil, logo). Devolve JPEG. */
export function quadrado(dataUrl: string, lado = 256): Promise<Blob> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = lado;
      const menor = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - menor) / 2, (img.height - menor) / 2, menor, menor, 0, 0, lado, lado);
      c.toBlob((b) => ok(b!), "image/jpeg", 0.85);
    };
    img.src = dataUrl;
  });
}

/** Sobe um arquivo e devolve o endereço público (com ?v= para o navegador não mostrar a versão antiga). */
export async function enviar(bucket: string, caminho: string, arquivo: Blob, tipo?: string): Promise<string> {
  const { error } = await db.storage.from(bucket).upload(caminho, arquivo, {
    upsert: true, contentType: tipo || arquivo.type || "image/jpeg", cacheControl: "3600",
  });
  if (error) throw error;
  return `${urlPublica(bucket, caminho)}?v=${Date.now()}`;
}

export const extensao = (f: File) => ({ "image/png": "png", "image/webp": "webp" } as Record<string, string>)[f.type] || "jpg";
