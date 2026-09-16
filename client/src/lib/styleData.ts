import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

export const OCCASIONS = ["casual", "work", "date", "party", "wedding", "traditional", "travel", "everyday"] as const;
export type Occasion = (typeof OCCASIONS)[number];
export const CATEGORIES = ["Blazers", "Blouses", "Cardigans", "Casual Shoes", "Chinos", "Co-ords", "Dresses", "Ethnic Bottoms", "Ethnic Footwear", "Flats", "Formal Shoes", "Heels", "Hoodies", "Jackets", "Jeans", "Jumpsuits", "Kurtas", "Kurtis", "Lehenga", "Loafers", "Palazzos", "Pants", "Polos", "Salwar Suits", "Sandals", "Sarees", "Sherwanis", "Shirts", "Shorts", "Skirts", "Sneakers", "Suits", "Sweatshirts", "T-Shirts", "Tops", "Track Pants", "Jewellery", "Bags", "Watches", "Belts", "Eyewear"] as const;

export type StyleItem = { id: string; name: string; category: string; color: string; style: string; occasion: Occasion[]; formality: number; image: string; source: "demo" | "upload"; createdAt: number };
export type Profile = { dressCode: string[]; bodyPriorities: string[]; undertone: string; gender: string; occasionFocus: Occasion[]; photoFactor: string };
export type GalleryLook = { id: string; title: string; date: number; photo: string; itemIds: string[]; itemNames: string[] };
export type AppState = { items: StyleItem[]; profile: Profile; gallery: GalleryLook[] };

export const DEMO_ITEMS: StyleItem[] = [
  { id: "ivory-shirt", name: "Silk Ivory Shirt", category: "Shirts", color: "Ivory", style: "Quiet luxury", occasion: ["work", "date", "everyday"], formality: 4, image: "/manus-storage/spring-flatlay_4fb5b884.jpg", source: "demo", createdAt: 1710000000000 },
  { id: "soft-blazer", name: "Soft Tailored Blazer", category: "Blazers", color: "Blush", style: "Polished ease", occasion: ["work", "date", "party"], formality: 5, image: "/manus-storage/neutral-look_116aef4f.jpeg", source: "demo", createdAt: 1710000001000 },
  { id: "wide-leg", name: "Wide Leg Trousers", category: "Pants", color: "Oat", style: "Modern classic", occasion: ["work", "travel", "everyday"], formality: 4, image: "/manus-storage/closet-rack_3ffebf44.jpg", source: "demo", createdAt: 1710000002000 },
  { id: "rose-sling", name: "Rose Sling Bag", category: "Bags", color: "Rose", style: "Soft statement", occasion: ["date", "party", "travel"], formality: 3, image: "/manus-storage/accessories-flatlay_430c21e5.jpg", source: "demo", createdAt: 1710000003000 },
  { id: "everyday-loafers", name: "Cream Loafers", category: "Loafers", color: "Cream", style: "Understated", occasion: ["work", "everyday", "travel"], formality: 4, image: "/manus-storage/spring-flatlay_4fb5b884.jpg", source: "demo", createdAt: 1710000004000 },
  { id: "black-sunglasses", name: "Black Oval Frames", category: "Eyewear", color: "Black", style: "Graphic minimal", occasion: ["casual", "travel", "everyday"], formality: 2, image: "/manus-storage/accessories-flatlay_430c21e5.jpg", source: "demo", createdAt: 1710000005000 },
];

const defaultState: AppState = { items: DEMO_ITEMS, profile: { dressCode: ["Smart Casual"], bodyPriorities: ["Comfort", "Fit"], undertone: "Neutral", gender: "Female", occasionFocus: ["work", "date"], photoFactor: "Social-Media-Worthy" }, gallery: [] };
const STORAGE_KEY = "stylytics-state-v1";

export function readState(): AppState {
  if (typeof window === "undefined") return defaultState;
  try { const saved = window.localStorage.getItem(STORAGE_KEY); if (!saved) return defaultState; const parsed = JSON.parse(saved) as Partial<AppState>; return { ...defaultState, ...parsed, items: Array.isArray(parsed.items) ? parsed.items : DEMO_ITEMS, gallery: Array.isArray(parsed.gallery) ? parsed.gallery : [] }; }
  catch { return defaultState; }
}
export function saveState(next: AppState) { if (typeof window === "undefined") return; window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("stylytics:state")); }
export function updateState(updater: (current: AppState) => AppState) { saveState(updater(readState())); }

export function useAppState() {
  const [state, setState] = useState<AppState>(() => readState());
  const auth = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const saved = trpc.saved.load.useQuery(undefined, { enabled: Boolean(auth.data), retry: false, refetchOnWindowFocus: false });
  const replace = trpc.saved.replace.useMutation();
  const hydrated = useRef(false);

  useEffect(() => {
    const sync = () => setState(readState());
    window.addEventListener("storage", sync);
    window.addEventListener("stylytics:state", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("stylytics:state", sync); };
  }, []);

  useEffect(() => {
    if (!auth.data || !saved.isFetched || hydrated.current) return;
    const local = readState();
    const remote = saved.data;
    const next = remote && (remote.items.length || remote.gallery.length) ? { ...local, items: remote.items as StyleItem[], gallery: remote.gallery as GalleryLook[] } : local;
    hydrated.current = true;
    saveState(next);
    setState(next);
    if (!remote?.items.length && !remote?.gallery.length && (local.items.length || local.gallery.length)) replace.mutate({ items: local.items, gallery: local.gallery });
  }, [auth.data, saved.data, saved.isFetched]);

  const commit = (updater: (current: AppState) => AppState) => {
    const next = updater(readState());
    saveState(next);
    setState(next);
    if (auth.data && hydrated.current) replace.mutate({ items: next.items, gallery: next.gallery });
  };
  const syncToAccount = async () => {
    if (!auth.data) throw new Error("Sign in to save your wardrobe across devices.");
    await replace.mutateAsync({ items: state.items, gallery: state.gallery });
  };
  return [state, commit, syncToAccount, Boolean(auth.data), replace.isPending] as const;
}

export function labelOccasion(occasion: string) { return occasion.charAt(0).toUpperCase() + occasion.slice(1); }
export function buildLook(items: StyleItem[], occasion: Occasion = "work") { const matching = items.filter((item) => item.occasion.includes(occasion)); const pool = matching.length >= 3 ? matching : items; return [...pool].sort((a, b) => b.formality - a.formality || b.createdAt - a.createdAt).slice(0, 3); }
