import { serve } from "@hono/node-server";
import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Uygulama ile Claude API arasındaki ince katman. API anahtarı yalnızca burada durur.
const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

const ReceiptSchema = z.object({
  store: z.string().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      qty: z.string(),
      price: z.number().nullable(),
      shelfDays: z.number().int(),
    }),
  ),
});

const RecipesSchema = z.object({
  recipes: z.array(
    z.object({
      title: z.string(),
      time: z.string(),
      uses: z.array(z.string()),
      missing: z.array(z.string()),
      steps: z.array(z.string()),
    }),
  ),
});

const today = () => new Date().toISOString().slice(0, 10);

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/receipt", async (c) => {
  const body = await c.req.json<{ imageBase64?: string; mediaType?: string }>();
  if (!body.imageBase64) return c.json({ error: "Fotoğraf eksik." }, 400);
  const mediaType = body.mediaType === "image/png" ? "image/png" : "image/jpeg";

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ReceiptSchema) },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: body.imageBase64 } },
          {
            type: "text",
            text: `Bu bir Türk market fişinin fotoğrafı. Sadece gıda ve içecek kalemlerini çıkar; poşet, temizlik ürünü ve indirim satırlarını atla.
Her kalem için: name (kısaltmaları aç, ör. "SUZME YOG. 1KG" -> "Süzme yoğurt"), qty (fişteki miktar, ör. "1 kg", "2 adet"), price (TL, bilinmiyorsa null), shelfDays (bugünden itibaren buzdolabında veya kilerde tahmini kaç gün dayanır).
Bugün: ${today()}.`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return c.json({ error: "Fiş okunamadı. Daha net bir fotoğraf dene." }, 422);
  }
  return c.json(response.parsed_output);
});

app.post("/recipes", async (c) => {
  const body = await c.req.json<{ items?: { name: string; qty?: string; daysLeft: number }[] }>();
  const items = body.items ?? [];
  if (!items.length) return c.json({ error: "Dolapta ürün yok." }, 400);
  const list = items.map((i) => `- ${i.name}${i.qty ? ` (${i.qty})` : ""}: ${i.daysLeft} gün kaldı`).join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(RecipesSchema) },
    messages: [
      {
        role: "user",
        content: `Buzdolabımda şunlar var (kalan gün ile):
${list}

Evde temel malzemeler (tuz, karabiber, yağ, un, salça, soğan) var sayılabilir. Ev usulü Türk mutfağına yakın 3 tarif öner ve son tarihi en yakın ürünleri mutlaka kullan.
uses: dolaptan kullanılan ürünler. missing: alınması gereken, temel olmayan malzemeler. steps: en fazla 5 kısa adım. time: ör. "20 dk".`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return c.json({ error: "Tarif bulunamadı." }, 422);
  }
  return c.json(response.parsed_output);
});

app.onError((err, c) => {
  console.error(err);
  if (err instanceof Anthropic.RateLimitError) return c.json({ error: "Çok fazla istek. Biraz bekleyip tekrar dene." }, 429);
  if (err instanceof Anthropic.APIError) return c.json({ error: "Claude şu an yanıt vermiyor. Tekrar dene." }, 502);
  return c.json({ error: "Sunucu hatası." }, 500);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => console.log(`SKT sunucusu: http://localhost:${port}`));
