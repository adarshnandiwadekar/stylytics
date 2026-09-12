import { Link, useLocation } from "wouter";
import { ArrowUpRight, CircleUserRound, Layers3, Menu, Sparkles, Shirt, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StyleItem } from "@/lib/styleData";

const navItems = [
  { href: "/closet", label: "My Closet", icon: Shirt },
  { href: "/try-on", label: "Try-On", icon: Sparkles },
  { href: "/gallery", label: "Gallery", icon: Layers3 },
  { href: "/profile", label: "Set the Scene", icon: CircleUserRound },
];

export function StyleShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#F3F1FF] text-[#18152B]">
      <header className="sticky top-0 z-40 border-b border-[#18152B]/10 bg-[#F3F1FF]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 lg:px-10">
          <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#18152B] text-[#FFD166] shadow-[0_8px_20px_rgba(24,21,43,.18)] transition-transform group-hover:-rotate-6"><Sparkles size={19} /></span>
            <span className="font-display text-[21px] font-semibold tracking-[-.04em]">stylytics<span className="text-[#FF6B57]">.</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/70", location === href && "bg-white shadow-sm") }><Icon size={15} strokeWidth={2.2} />{label}</Link>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <div className="hidden text-right xl:block"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#18152B]/45">Wardrobe health</p><p className="text-sm font-semibold">82% in rotation</p></div>
            <Link href="/profile" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#18152B]/10 bg-white text-[#18152B] hover:border-[#FF6B57]" aria-label="Open profile"><CircleUserRound size={18} /></Link>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">{open ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
        {open && <div className="border-t border-[#18152B]/10 bg-[#F3F1FF] px-5 py-4 md:hidden">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", location === href && "bg-white") }><Icon size={17} />{label}</Link>)}</div>}
      </header>
      {children}
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="mb-3 text-[11px] font-bold uppercase tracking-[.24em] text-[#5B5CE2]">{eyebrow}</p><h1 className="font-display max-w-2xl text-4xl leading-[.98] tracking-[-.055em] md:text-6xl">{title}</h1><p className="mt-4 max-w-xl text-base leading-7 text-[#18152B]/60">{description}</p></div>{action}</div>;
}

export function WardrobeBoard({ items, compact = false, title = "A considered edit" }: { items: StyleItem[]; compact?: boolean; title?: string }) {
  const palette = ["#FFD166", "#FF6B57", "#78D5B0"];
  return <div className={cn("relative overflow-hidden rounded-[28px] bg-[#18152B] p-3 text-white shadow-[0_20px_60px_rgba(24,21,43,.18)]", compact ? "min-h-[220px]" : "min-h-[360px]")}>
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] backdrop-blur">{title}<ArrowUpRight size={13} /></div>
    <div className="grid h-full min-h-[inherit] grid-cols-2 gap-2 pt-10">
      {items.slice(0, 3).map((item, index) => <div key={item.id} className={cn("relative overflow-hidden rounded-2xl", index === 0 ? "row-span-2 min-h-[270px]" : "min-h-[130px]")} style={{ backgroundColor: palette[index] }}><img src={item.image} alt={item.name} className="h-full w-full object-cover mix-blend-multiply opacity-90 transition-transform duration-500 hover:scale-105" /><div className="absolute inset-x-2 bottom-2 rounded-lg bg-white/80 px-2 py-1 text-[10px] font-semibold text-[#18152B] backdrop-blur">{item.name}</div></div>)}
      {items.length === 0 && <div className="col-span-2 flex items-center justify-center text-center text-sm text-white/60">Add a few real pieces to compose your first board.</div>}
    </div>
  </div>;
}

export function SectionButton({ children, href, variant = "dark" }: { children: React.ReactNode; href: string; variant?: "dark" | "light" | "coral" }) {
  return <Link href={href}><Button className={cn("rounded-full px-5 shadow-none", variant === "dark" && "bg-[#18152B] text-white hover:bg-[#37314f]", variant === "light" && "bg-white text-[#18152B] hover:bg-white/80", variant === "coral" && "bg-[#FF6B57] text-[#18152B] hover:bg-[#ff836f]")}>{children}</Button></Link>;
}
