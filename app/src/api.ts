import type { Recipe } from "./types";

// Sunucu adresi: app/.env içinde EXPO_PUBLIC_API_URL=http://<bilgisayarın-IP>:8787
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

export interface ReceiptResult {
  store: string | null;
  items: { name: string; qty: string; price: number | null; shelfDays: number }[];
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Sunucuya ulaşılamadı. Sunucunun açık ve adresin doğru olduğundan emin ol.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Bir şeyler ters gitti. Tekrar dene.");
  return data as T;
}

export function readReceipt(imageBase64: string, mediaType: string): Promise<ReceiptResult> {
  return post("/receipt", { imageBase64, mediaType });
}

export async function suggestRecipes(items: { name: string; qty?: string; daysLeft: number }[]): Promise<Recipe[]> {
  const data = await post<{ recipes: Recipe[] }>("/recipes", { items });
  return data.recipes;
}
