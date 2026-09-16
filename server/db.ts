import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, savedClosetItems, savedGalleryLooks, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function loadSavedStyleData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [items, gallery] = await Promise.all([
    db.select().from(savedClosetItems).where(eq(savedClosetItems.userId, userId)),
    db.select().from(savedGalleryLooks).where(eq(savedGalleryLooks.userId, userId)),
  ]);
  return {
    items: items.flatMap((row) => { try { return [JSON.parse(row.payload)]; } catch { return []; } }),
    gallery: gallery.flatMap((row) => { try { return [JSON.parse(row.payload)]; } catch { return []; } }),
  };
}

export async function saveStyleData(userId: number, items: Array<{ id: string; [key: string]: unknown }>, gallery: Array<{ id: string; [key: string]: unknown }>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.transaction(async (tx) => {
    await tx.delete(savedClosetItems).where(eq(savedClosetItems.userId, userId));
    await tx.delete(savedGalleryLooks).where(eq(savedGalleryLooks.userId, userId));
    if (items.length) await tx.insert(savedClosetItems).values(items.map((item) => ({ userId, itemId: item.id, payload: JSON.stringify(item) })));
    if (gallery.length) await tx.insert(savedGalleryLooks).values(gallery.map((look) => ({ userId, lookId: look.id, payload: JSON.stringify(look) })));
  });
  return { itemCount: items.length, galleryCount: gallery.length };
}
