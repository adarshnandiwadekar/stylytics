import { useMemo, useRef, useState } from "react";
import { Filter, Grid2X2, List, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageIntro, StyleShell, WardrobeBoard } from "@/components/StyleShell";
import { CATEGORIES, OCCASIONS, type Occasion, labelOccasion, useAppState } from "@/lib/styleData";
import { toast } from "sonner";

export default function Closet() {
  const [state, commit] = useAppState();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [occasion, setOccasion] = useState<"all" | Occasion>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingOccasions, setPendingOccasions] = useState<Occasion[]>(["everyday"]);
  const [pendingCategory, setPendingCategory] = useState("T-Shirts");
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => state.items.filter((item) => (!search || `${item.name} ${item.category} ${item.color}`.toLowerCase().includes(search.toLowerCase())) && (category === "all" || item.category === category) && (occasion === "all" || item.occasion.includes(occasion))), [state.items, search, category, occasion]);
  const selectedItems = state.items.filter((item) => selected.includes(item.id));

  const onFilePicked = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    setPendingFile(file);
    setPendingOccasions(["everyday"]);
    setPendingCategory("T-Shirts");
  };

  const addPiece = () => {
    if (!pendingFile) return;
    if (!pendingOccasions.length) {
      toast.error("Choose at least one occasion so AI knows when to suggest this piece.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      commit((current) => ({ ...current, items: [{ id, name: pendingFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "), category: pendingCategory, color: "New", style: "Your edit", occasion: pendingOccasions, formality: pendingOccasions.includes("wedding") || pendingOccasions.includes("traditional") ? 5 : pendingOccasions.includes("work") ? 4 : 3, image: String(reader.result), source: "upload", createdAt: Date.now() }, ...current.items] }));
      toast.success(`Added to Closet for ${pendingOccasions.map(labelOccasion).join(", ")}.`);
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = "";
    };
    reader.readAsDataURL(pendingFile);
  };

  const remove = (id: string) => {
    commit((current) => ({ ...current, items: current.items.filter((item) => item.id !== id), gallery: current.gallery.filter((look) => !look.itemIds.includes(id)) }));
    setSelected((ids) => ids.filter((itemId) => itemId !== id));
    toast.success("Piece removed from your closet.");
  };

  const toggleSelected = (id: string) => setSelected((ids) => ids.includes(id) ? ids.filter((itemId) => itemId !== id) : ids.length >= 2 ? (toast.error("AI curation uses exactly two garments."), ids) : [...ids, id]);
  const toggleOccasion = (value: Occasion) => setPendingOccasions((values) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  return <StyleShell><main className="mx-auto max-w-[1320px] px-5 py-10 lg:px-10 lg:py-14">
    <PageIntro eyebrow="Your real wardrobe" title="My Closet" description="Add every piece with the moments it belongs to. Stylytics uses these occasion tags when it chooses an outfit for you." action={<><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => onFilePicked(event.target.files?.[0])} /><Button className="rounded-full bg-[#FF6B57] text-[#18152B] hover:bg-[#ff836f]" onClick={() => inputRef.current?.click()}><Plus size={17} /> Add a piece</Button></>} />

    <div className="mb-8 grid gap-3 sm:grid-cols-3"><Stat label="Pieces in rotation" value={String(state.items.length)} note="real items" color="bg-[#18152B] text-white" /><Stat label="Most expressive" value="Blush" note="your current hue" color="bg-[#FFD166]" /><Stat label="Outfit potential" value="18+" note="combinations ready" color="bg-[#78D5B0]" /></div>

    <section className="mb-8 grid gap-4 overflow-hidden rounded-[28px] bg-[#5B5CE2] p-5 text-white sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#FFD166]">Not in the mood to decide?</p><h2 className="mt-2 max-w-xl font-display text-4xl leading-[.9] tracking-[-.05em] sm:text-5xl">Let Stylytics choose from your Closet.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Answer three quick questions about your mood, occasion, and effort level. We’ll use your tagged pieces, suggest a complete two-piece look, and send it straight to Try-On.</p></div><Link href="/you-choose"><Button className="w-full rounded-full bg-[#FFD166] text-[#18152B] hover:bg-[#ffda85] lg:w-auto"><Sparkles size={16} /> You Choose</Button></Link></section>

    <div className="mb-7 flex flex-col gap-3 rounded-2xl bg-white/70 p-3 shadow-sm md:flex-row md:items-center"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#18152B]/40" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a shirt, kurta, jacket…" className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0" /></div><div className="flex flex-wrap gap-2"><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 rounded-full border border-[#18152B]/10 bg-white px-3 text-xs font-medium outline-none"><option value="all">All categories</option>{CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select><select value={occasion} onChange={(event) => setOccasion(event.target.value as "all" | Occasion)} className="h-9 rounded-full border border-[#18152B]/10 bg-white px-3 text-xs font-medium outline-none"><option value="all">All occasions</option>{OCCASIONS.map((value) => <option key={value} value={value}>{labelOccasion(value)}</option>)}</select><Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-white" onClick={() => { setSearch(""); setCategory("all"); setOccasion("all"); }} aria-label="Reset closet filters"><Filter size={15} /></Button></div></div>

    <div className="grid gap-8 lg:grid-cols-[1fr_320px]"><div><div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">{items.length} pieces <span className="font-normal text-[#18152B]/45">/ {selected.length} in tray</span></p><div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm" aria-label="Closet view"><button onClick={() => setView("grid")} className={`rounded-full p-2 ${view === "grid" ? "bg-[#18152B] text-white" : "text-[#18152B]/35 hover:text-[#18152B]"}`} aria-label="Grid view"><Grid2X2 size={15} /></button><button onClick={() => setView("list")} className={`rounded-full p-2 ${view === "list" ? "bg-[#18152B] text-white" : "text-[#18152B]/35 hover:text-[#18152B]"}`} aria-label="List view"><List size={15} /></button></div></div>{items.length === 0 ? <div className="rounded-[26px] bg-white p-12 text-center"><p className="font-display text-3xl">No pieces in this edit yet.</p><p className="mt-3 text-sm text-[#18152B]/50">Try another filter or add a new real garment photo.</p></div> : <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" : "space-y-3"}>{items.map((item) => <ItemCard key={item.id} item={item} selected={selected.includes(item.id)} view={view} onToggle={() => toggleSelected(item.id)} onRemove={() => remove(item.id)} />)}</div>}</div><aside className="h-fit rounded-[28px] bg-[#18152B] p-4 text-white lg:sticky lg:top-24"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#78D5B0]">Build tray</p><h2 className="mt-1 font-display text-2xl tracking-[-.04em]">Make a look</h2></div><Sparkles size={18} className="text-[#FFD166]" /></div><WardrobeBoard items={selectedItems} compact title="Live board" /><p className="mt-4 text-xs leading-5 text-white/45">Pick exactly two real pieces or let <Link href="/you-choose" className="text-[#FFD166] underline">You Choose</Link> find a pairing based on your mood.</p><Link href={`/try-on${selected.length ? `?items=${selected.join(",")}` : ""}`}><Button className="mt-4 w-full rounded-full bg-[#FFD166] text-[#18152B] hover:bg-[#ffda85]">Open in Try-On</Button></Link></aside></div>

    {pendingFile && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#18152B]/55 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-lg rounded-[28px] bg-[#F8F5FF] p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#5B5CE2]">Tag before you add</p><h2 className="mt-2 font-display text-3xl tracking-[-.04em]">When would you wear this?</h2><p className="mt-2 text-sm leading-5 text-[#18152B]/55">These tags guide You Choose so a T-shirt stays everyday, while traditional pieces appear for the right occasions.</p></div><button onClick={() => setPendingFile(null)} aria-label="Close upload dialog" className="rounded-full p-2 hover:bg-white"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Category<select value={pendingCategory} onChange={(event) => setPendingCategory(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#18152B]/10 bg-white px-3 text-sm font-normal outline-none"><option value="T-Shirts">T-Shirts</option>{CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><div><p className="text-xs font-semibold">Selected occasions</p><div className="mt-2 flex flex-wrap gap-2">{pendingOccasions.map((value) => <span key={value} className="rounded-full bg-[#FF6B57] px-2.5 py-1 text-[10px] font-semibold text-[#18152B]">{labelOccasion(value)}</span>)}</div></div></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{OCCASIONS.map((value) => <button key={value} onClick={() => toggleOccasion(value)} className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition ${pendingOccasions.includes(value) ? "bg-[#18152B] text-white" : "bg-white text-[#18152B]/60 hover:bg-[#EDE9FF]"}`}>{labelOccasion(value)}</button>)}</div><Button onClick={addPiece} className="mt-6 w-full rounded-full bg-[#5B5CE2] text-white hover:bg-[#7475ec]">Add tagged piece to Closet</Button></div></div>}
  </main></StyleShell>;
}

function Stat({ label, value, note, color }: { label: string; value: string; note: string; color: string }) { return <div className={`${color} rounded-2xl p-5`}><p className="text-[10px] font-bold uppercase tracking-[.18em] opacity-55">{label}</p><div className="mt-4 flex items-end justify-between gap-2"><p className="font-display text-4xl tracking-[-.06em]">{value}</p><span className="pb-1 text-xs opacity-55">{note}</span></div></div>; }
function ItemCard({ item, selected, view, onToggle, onRemove }: { item: import("@/lib/styleData").StyleItem; selected: boolean; view: "grid" | "list"; onToggle: () => void; onRemove: () => void }) { return <div className={`group relative overflow-hidden rounded-[22px] bg-white p-2 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${selected ? "ring-2 ring-[#FF6B57]" : ""} ${view === "list" ? "flex items-center gap-3" : ""}`}><button onClick={onToggle} className={`relative block overflow-hidden rounded-[16px] bg-[#F2EBDD] text-left ${view === "list" ? "h-20 w-20 shrink-0" : "aspect-[.82] w-full"}`}><img src={item.image} alt={item.name} className="h-full w-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-105" /><span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] ${selected ? "bg-[#FF6B57] text-[#18152B]" : "bg-white/80 text-[#18152B]"}`}>{selected ? "In tray" : item.category}</span></button><div className={`${view === "list" ? "min-w-0 flex-1 pr-2" : "px-2 pb-1 pt-3"}`}><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-[#18152B]/45">{item.color} · {item.style}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="flex flex-wrap gap-1">{item.occasion.slice(0, 3).map((value) => <span key={value} className="rounded-full bg-[#F3F1FF] px-2 py-1 text-[9px] font-medium">{labelOccasion(value)}</span>)}</span><button onClick={(event) => { event.stopPropagation(); onRemove(); }} className="text-[#18152B]/30 hover:text-[#FF6B57]" aria-label={`Remove ${item.name}`}><Trash2 size={14} /></button></div></div></div>; }
