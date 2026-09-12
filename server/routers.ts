import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";

const imageRef = z.string().min(1).max(12_000_000);

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
  tryOn: router({
    generate: publicProcedure
      .input(z.object({
        photo: imageRef,
        garments: z.array(z.object({ id: z.string(), name: z.string(), category: z.string(), color: z.string(), image: imageRef })).length(2),
        occasion: z.string().min(1).max(40).default("everyday"),
        profile: z.object({ undertone: z.string().optional(), gender: z.string().optional(), dressCode: z.array(z.string()).optional() }).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const garmentSummary = input.garments.map((garment) => `${garment.name} (${garment.category}, ${garment.color})`).join(" + ");
          const curation = await invokeLLM({
            messages: [
              { role: "system", content: "You are a precise personal stylist. Curate only from the two supplied real garments. Never invent a third garment, color, pattern, accessory, or clothing detail. Return JSON only." },
              { role: "user", content: `Create a complete two-piece outfit curation from exactly these real garments: ${garmentSummary}. Occasion: ${input.occasion}. Profile: ${input.profile?.dressCode?.join(", ") || "open"}; undertone ${input.profile?.undertone || "unknown"}; framing ${input.profile?.gender || "any"}. Explain how the two pieces work together and name the look.` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "outfit_curation",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    rationale: { type: "string" },
                    pairing: { type: "string" },
                  },
                  required: ["title", "rationale", "pairing"],
                  additionalProperties: false,
                },
              },
            },
            max_tokens: 300,
          });
          const raw = responseText(curation.choices[0]?.message.content);
          const style = JSON.parse(raw) as { title: string; rationale: string; pairing: string };
          const prompt = `Create a realistic editorial virtual try-on image using the provided body photo and exactly the two provided real garment references. Preserve the person's identity, face, skin tone, hair, proportions, pose, and the garments' actual color, pattern, silhouette, and material. Fit and layer the two garments naturally as a complete outfit. Do not add any other clothing, accessories, jewelry, shoes, bags, text, logos, or invented garments. Keep the scene clean and fashion-editorial. Stylist title: ${style.title}. Pairing direction: ${style.pairing}. Rationale: ${style.rationale}.`;
          const generated = await generateImage({
            prompt,
            quality: "medium",
            originalImages: [asOriginalImage(input.photo), ...input.garments.map((garment) => asOriginalImage(garment.image))],
          });
          if (!generated.url) throw new Error("The image service returned no image URL");
          return { url: generated.url, title: style.title, rationale: style.rationale, pairing: style.pairing, label: "AI-Curated Fit · Experimental Preview" };
        } catch (error) {
          console.error("[TryOn] AI generation failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI outfit generation is unavailable right now. Your manual preview is still available." });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
