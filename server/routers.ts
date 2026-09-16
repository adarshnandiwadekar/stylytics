import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { loadSavedStyleData, saveStyleData } from "./db";

const imageRef = z.string().min(1).max(12_000_000);
const stylePiece = z.object({ id: z.string(), name: z.string(), category: z.string(), color: z.string(), style: z.string().optional(), formality: z.number().optional() });

function asOriginalImage(value: string, mimeType = "image/jpeg") {
  if (value.startsWith("data:")) {
    const match = value.match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { b64Json: match[2], mimeType: match[1] };
  }
  return { url: value, mimeType };
}

function responseText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((part) => typeof part === "object" && part && "text" in part).map((part) => String((part as { text?: unknown }).text ?? "")).join("\n");
  return "";
}

async function explainPieces(items: Array<z.infer<typeof stylePiece>>, context: string) {
  const names = items.map((item) => `${item.name} (${item.category}, ${item.color}${item.style ? `, ${item.style}` : ""})`).join(" and ");
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are Stylytics, a concise personal stylist. Explain why the supplied clothing pieces pair well. Use only supplied facts, never invent accessories or garments. Return JSON only." },
      { role: "user", content: `Explain why these real wardrobe pieces pair well: ${names}. Context: ${context}. Give a short headline, a 2-sentence explanation, and one practical styling tip.` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "pairing_explanation", strict: true, schema: { type: "object", properties: { headline: { type: "string" }, explanation: { type: "string" }, tip: { type: "string" } }, required: ["headline", "explanation", "tip"], additionalProperties: false } } },
    max_tokens: 240,
  });
  const raw = responseText(response.choices[0]?.message.content);
  return JSON.parse(raw) as { headline: string; explanation: string; tip: string };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  recommendations: router({
    explainPairing: publicProcedure.input(z.object({ items: z.array(stylePiece).min(2).max(3), context: z.string().max(300).default("everyday") })).mutation(async ({ input }) => {
      try { return await explainPieces(input.items, input.context); }
      catch (error) { console.error("[Recommendations] Explanation failed:", error); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI explanation is unavailable right now. The recommendation is still usable." }); }
    }),
    weather: publicProcedure.input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).query(async ({ input }) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&current=temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "Weather service is unavailable right now." });
      const data = await response.json() as { current?: { temperature_2m?: number; apparent_temperature?: number; precipitation?: number; rain?: number; weather_code?: number; wind_speed_10m?: number }; current_units?: Record<string, string>; timezone?: string };
      if (!data.current) throw new TRPCError({ code: "BAD_GATEWAY", message: "Weather data was incomplete." });
      return { ...data.current, units: data.current_units ?? {}, timezone: data.timezone ?? "local" };
    }),
  }),
  saved: router({
    load: protectedProcedure.query(async ({ ctx }) => {
      try { return await loadSavedStyleData(ctx.user.id); }
      catch (error) { console.error("[Saved] Load failed:", error); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Saved wardrobe data is unavailable right now." }); }
    }),
    replace: protectedProcedure.input(z.object({ items: z.array(z.record(z.string(), z.unknown())).max(300), gallery: z.array(z.record(z.string(), z.unknown())).max(300) })).mutation(async ({ ctx, input }) => {
      try { return await saveStyleData(ctx.user.id, input.items as Array<{ id: string; [key: string]: unknown }>, input.gallery as Array<{ id: string; [key: string]: unknown }>); }
      catch (error) { console.error("[Saved] Replace failed:", error); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save your wardrobe right now." }); }
    }),
  }),
  tryOn: router({
    generate: publicProcedure.input(z.object({ photo: imageRef, garments: z.array(z.object({ id: z.string(), name: z.string(), category: z.string(), color: z.string(), image: imageRef })).length(2), occasion: z.string().min(1).max(40).default("everyday"), profile: z.object({ undertone: z.string().optional(), gender: z.string().optional(), dressCode: z.array(z.string()).optional() }).optional() })).mutation(async ({ input }) => {
      try {
        const garmentSummary = input.garments.map((garment) => `${garment.name} (${garment.category}, ${garment.color})`).join(" + ");
        const curation = await invokeLLM({ messages: [{ role: "system", content: "You are a precise personal stylist. Curate only from the two supplied real garments. Never invent a third garment, color, pattern, accessory, or clothing detail. Return JSON only." }, { role: "user", content: `Create a complete two-piece outfit curation from exactly these real garments: ${garmentSummary}. Occasion: ${input.occasion}. Profile: ${input.profile?.dressCode?.join(", ") || "open"}; undertone ${input.profile?.undertone || "unknown"}; framing ${input.profile?.gender || "any"}. Explain how the two pieces work together and name the look.` }], response_format: { type: "json_schema", json_schema: { name: "outfit_curation", strict: true, schema: { type: "object", properties: { title: { type: "string" }, rationale: { type: "string" }, pairing: { type: "string" } }, required: ["title", "rationale", "pairing"], additionalProperties: false } } }, max_tokens: 300 });
        const style = JSON.parse(responseText(curation.choices[0]?.message.content)) as { title: string; rationale: string; pairing: string };
        const prompt = `Create a tasteful, fully clothed adult fashion-catalog virtual try-on image using the provided body photo and exactly the two provided real garment references. Preserve the adult person's identity, face, skin tone, hair, proportions, pose, and the garments' actual color, pattern, silhouette, and material. Fit and layer the two garments naturally as a complete everyday outfit. Do not add any nudity, lingerie, sexualized posing, exposed body areas, other clothing, accessories, jewelry, shoes, bags, text, logos, or invented garments. Keep the scene clean, respectful, and fashion-editorial. Stylist title: ${style.title}. Pairing direction: ${style.pairing}. Rationale: ${style.rationale}.`;
        const generated = await generateImage({ prompt, quality: "medium", originalImages: [asOriginalImage(input.photo), ...input.garments.map((garment) => asOriginalImage(garment.image))] });
        if (!generated.url) throw new Error("The image service returned no image URL");
        return { url: generated.url, title: style.title, rationale: style.rationale, pairing: style.pairing, label: "AI-Curated Fit · Experimental Preview" };
      } catch (error) { console.error("[TryOn] AI generation failed:", error); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI outfit generation is unavailable right now. Your manual preview is still available." }); }
    }),
  }),
});

export type AppRouter = typeof appRouter;
