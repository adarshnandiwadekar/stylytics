import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx: TrpcContext = {
  user: undefined,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const garment = (id: string) => ({ id, name: id, category: "Tops", color: "Ivory", image: "https://example.com/garment.jpg" });

describe("tryOn.generate", () => {
  it("requires exactly two real garments", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tryOn.generate({ photo: "https://example.com/photo.jpg", garments: [garment("one")] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.tryOn.generate({ photo: "https://example.com/photo.jpg", garments: [garment("one"), garment("two"), garment("three")] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
