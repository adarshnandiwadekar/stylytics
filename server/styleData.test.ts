import { describe, expect, it } from "vitest";
import { buildLook, DEMO_ITEMS, OCCASIONS, labelOccasion } from "../client/src/lib/styleData";

describe("stylytics shared style data", () => {
  it("keeps one canonical occasion taxonomy", () => {
    expect(OCCASIONS).toEqual(["casual", "work", "date", "party", "wedding", "travel", "everyday"]);
    expect(labelOccasion("everyday")).toBe("Everyday");
  });

  it("composes a visual-ready look from real closet items", () => {
    const workLook = buildLook(DEMO_ITEMS, "work");
    expect(workLook.length).toBeGreaterThanOrEqual(3);
    expect(workLook.every((item) => item.occasion.includes("work"))).toBe(true);
    expect(workLook.every((item) => item.image.length > 0)).toBe(true);
  });

  it("responds to occasion changes with the matching closet subset", () => {
    const dateLook = buildLook(DEMO_ITEMS, "date");
    expect(dateLook.length).toBeGreaterThanOrEqual(3);
    expect(dateLook.every((item) => item.occasion.includes("date"))).toBe(true);
  });
});
