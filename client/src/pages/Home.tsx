import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, Check, CirclePlay, Compass, Layers3, ScanLine, Sparkles, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { StyleShell, SectionButton, WardrobeBoard } from "@/components/StyleShell";
import { buildLook, labelOccasion, useAppState } from "@/lib/styleData";

const accentColors = ["#FFD166", "#78D5B0", "#FF6B57"];

export default function Home() {
  const [state] = useAppState();
  const [occasion, setOccasion] = useState<"work" | "date" | "travel">("work");
  const [accent, setAccent] = useState(0);
  const look = useMemo(() => buildLook(state.items, occasion), [state.items, occasion]);
  useEffect(() => { const timer = window.setInterval(() => setAccent((v) => (v + 1) % accentColors.length), 4200); return () => window.clearInterval(timer); }, []);
  return <StyleShell>
    <main>
      <section className="mx-auto max-w-[1320px] px-5 pb-20 pt-8 lg:px-10 lg:pt-12">
        <div className="relative overflow-hidden rounded-[32px] bg-[#5B5CE2] p-6 text-white shadow-[0_24px_80px_rgba(91,92,226,.22)] transition-colors duration-500 md:p-10 lg:min-h-[620px] lg:p-14" style={{ backgroundColor: accentColors[accent] === "#FFD166" ? "#5B5CE2" : "#18152B" }}>
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" /><div className="absolute bottom-[-120px] left-[28%] h-72 w-72 rounded-full bg-[#FF6B57]/30 blur-3xl" />
          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
            <div className="max-w-[560px]">
              <p className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.28em] text-[#FFD166]"><Sparkles size={14} /> Personal style intelligence</p>
              <h1 className="font-display text-[clamp(3.5rem,8vw,7.7rem)] leading-[.84] tracking-[-.075em]">Get dressed<br /><em className="font-serif font-normal text-[#FFD166]">on purpose.</em></h1>
              <p className="mt-8 max-w-md text-base leading-7 text-white/75 md:text-lg">A living wardrobe companion that turns the pieces you own into looks you’ll actually want to wear.</p>
              <div className="mt-8 flex flex-wrap gap-3"><SectionButton href="/closet" variant="coral">Decode my style <ArrowRight size={16} /></SectionButton><SectionButton href="/try-on" variant="light">Try a look</SectionButton></div>
              <div className="mt-10 flex items-center gap-5 text-xs text-white/60"><span className="flex items-center gap-2"><Check size={14} className="text-[#78D5B0]" /> Real pieces only</span><span className="flex items-center gap-2"><Check size={14} className="text-[#78D5B0]" /> No style gatekeeping</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[560px]">
              <div className="absolute -left-4 top-16 z-10 rounded-2xl bg-[#FFD166] p-4 text-[#18152B] shadow-xl md:-left-10"><p className="text-[10px] font-bold uppercase tracking-[.16em]">Match score</p><p className="font-display text-4xl tracking-[-.06em]">94<span className="text-lg">%</span></p></div>
              <div className="absolute -right-3 bottom-[-16px] z-10 rounded-2xl bg-white p-4 text-[#18152B] shadow-xl md:-right-8"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#18152B]/45">Your edit</p><p className="mt-1 font-semibold">Soft power · {labelOccasion(occasion)}</p><div className="mt-2 flex gap-1.5">{look.map((item) => <span key={item.id} className="h-3 w-3 rounded-full border-2 border-white" style={{ background: item.color === "Black" ? "#18152B" : item.color === "Rose" ? "#E8A7A0" : "#E7D8C6" }} />)}</div></div>
              <WardrobeBoard items={look} title="Soft power edit" />
            </div>
          </div>
          <div className="relative z-10 mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs text-white/60"><span>Curated from your closet</span><div className="flex gap-2">{(["work", "date", "travel"] as const).map((value) => <button key={value} onClick={() => setOccasion(value)} className={`rounded-full border px-3 py-1.5 transition ${occasion === value ? "border-[#FFD166] bg-[#FFD166] text-[#18152B]" : "border-white/20 hover:border-white/50"}`}>{labelOccasion(value)}</button>)}</div></div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 pb-24 lg:px-10"><div className="grid gap-3 md:grid-cols-3"><PainCard number="01" title="The closet is full. The outfit is missing." text="We turn the pieces you already own into a clear, visual starting point." color="bg-[#FF6B57]" /><PainCard number="02" title="Your style changes by the day." text="Tell us the occasion, weather, or mood. Your edit moves with you." color="bg-[#78D5B0]" /><PainCard number="03" title="Trying something new should feel easy." text="See the fit with a practical preview—never a made-up garment." color="bg-[#FFD166]" /></div></section>

      <section className="bg-[#18152B] px-5 py-24 text-white lg:px-10"><div className="mx-auto max-w-[1320px]"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="mb-4 text-[11px] font-bold uppercase tracking-[.24em] text-[#78D5B0]">The rhythm</p><h2 className="font-display max-w-xl text-5xl leading-[.92] tracking-[-.06em] md:text-7xl">From pile<br />to <em className="font-serif font-normal text-[#FF6B57]">point of view.</em></h2></div><p className="max-w-sm text-base leading-7 text-white/55">A little structure, a little play, and a lot less standing in front of the wardrobe wondering what happened.</p></div><div className="mt-16 grid gap-5 md:grid-cols-3"><ProcessCard icon={<ScanLine />} step="01 / Upload" title="Bring your real pieces" text="Add a photo. We keep the original, read the crop, and ask you to confirm the category." /><ProcessCard icon={<Compass />} step="02 / Notice" title="See your patterns" text="Formality, color harmony, and repeat-wear become visible without boxing you in." /><ProcessCard icon={<Wand2 />} step="03 / Style" title="Build the next look" text="Curate a visual board, try it on manually, and save the outfits worth repeating." /></div></div></section>

      <section className="mx-auto max-w-[1320px] px-5 py-24 lg:px-10"><div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]"><div className="overflow-hidden rounded-[30px] bg-[#E6DEFF] p-3"><img src="/manus-storage/accessories-flatlay_430c21e5.jpg" alt="A considered flat-lay of accessories" className="h-[420px] w-full rounded-[22px] object-cover mix-blend-multiply" /></div><div className="lg:pl-8"><p className="mb-4 text-[11px] font-bold uppercase tracking-[.24em] text-[#FF6B57]">Curated, not crowded</p><h2 className="font-display text-5xl leading-[.95] tracking-[-.06em] md:text-6xl">Your wardrobe,<br /><em className="font-serif font-normal text-[#5B5CE2]">edited beautifully.</em></h2><p className="mt-6 max-w-md text-base leading-7 text-[#18152B]/60">Keep the visual cues that make personal style feel personal: the soft blazer you always reach for, the bag that changes the mood, the shoes that make a look land.</p><div className="mt-8 flex flex-wrap gap-3"><SectionButton href="/closet" variant="dark">Open my closet <ArrowRight size={16} /></SectionButton><Link href="/gallery" className="flex items-center gap-2 rounded-full px-4 text-sm font-semibold hover:text-[#FF6B57]">See gallery <ArrowDownRight size={16} /></Link></div></div></div></section>

      <section className="px-5 pb-12 lg:px-10"><div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-8 rounded-[30px] bg-[#FF6B57] p-8 md:flex-row md:items-end md:p-12"><div><p className="mb-3 text-[11px] font-bold uppercase tracking-[.24em] text-[#18152B]/55">Start with one piece</p><h2 className="font-display max-w-2xl text-5xl leading-[.9] tracking-[-.06em] md:text-7xl">Make your<br /><em className="font-serif font-normal">next look easy.</em></h2></div><SectionButton href="/profile" variant="dark">Set the scene <ArrowRight size={16} /></SectionButton></div></section>
    </main>
    <footer className="mx-auto flex max-w-[1320px] flex-col gap-4 px-5 py-8 text-xs text-[#18152B]/45 sm:flex-row sm:items-center sm:justify-between lg:px-10"><span className="font-display text-base font-semibold text-[#18152B]">stylytics<span className="text-[#FF6B57]">.</span></span><span>Real clothes. Better combinations. More you.</span><span className="flex items-center gap-2"><CirclePlay size={13} /> Preview mode</span></footer>
  </StyleShell>;
}

function PainCard({ number, title, text, color }: { number: string; title: string; text: string; color: string }) { return <div className={`${color} min-h-[230px] rounded-[26px] p-7 text-[#18152B]`}><p className="text-sm font-bold opacity-50">{number}</p><h3 className="mt-12 max-w-[260px] font-display text-2xl leading-[.95] tracking-[-.04em]">{title}</h3><p className="mt-4 max-w-[280px] text-sm leading-6 opacity-70">{text}</p></div>; }
function ProcessCard({ icon, step, title, text }: { icon: React.ReactNode; step: string; title: string; text: string }) { return <div className="group rounded-[24px] border border-white/10 bg-white/[.04] p-6 transition-colors hover:bg-white/[.08]"><div className="mb-12 flex items-center justify-between text-[#FFD166]"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFD166]/10">{icon}</span><span className="text-[10px] font-bold uppercase tracking-[.18em] text-white/40">{step}</span></div><h3 className="font-display text-2xl tracking-[-.04em]">{title}</h3><p className="mt-3 text-sm leading-6 text-white/50">{text}</p></div>; }
