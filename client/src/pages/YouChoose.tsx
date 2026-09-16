import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CloudSun, LocateFixed, Shirt, Sparkles, Upload } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PageIntro, StyleShell, WardrobeBoard } from "@/components/StyleShell";
import { type Occasion, type StyleItem, labelOccasion, useAppState } from "@/lib/styleData";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Mood = "calm" | "confident" | "playful" | "romantic";
type Effort = "easy" | "polished" | "statement";
type WeatherCoords = { latitude: number; longitude: number };

const questions = [
  { title: "What energy are you wearing today?", key: "mood", options: [{ value: "calm", label: "Calm + comfortable", note: "Soft, familiar, no overthinking" }, { value: "confident", label: "Confident + capable", note: "Structured, sharp, ready for anything" }, { value: "playful", label: "Playful + expressive", note: "A little color, texture, or contrast" }, { value: "romantic", label: "Romantic + considered", note: "Soft details and an intentional finish" }] },
  { title: "Where are you wearing it?", key: "occasion", options: [{ value: "everyday", label: "Everyday", note: "Coffee, errands, or a normal good day" }, { value: "work", label: "Work", note: "Polished enough for your calendar" }, { value: "date", label: "Date", note: "Put-together without trying too hard" }, { value: "traditional", label: "Traditional occasion", note: "Cultural celebrations and meaningful gatherings" }, { value: "party", label: "Party", note: "A look with a little more presence" }] },
  { title: "How much effort feels right?", key: "effort", options: [{ value: "easy", label: "Easy", note: "Give me the dependable answer" }, { value: "polished", label: "Polished", note: "Make it feel intentional" }, { value: "statement", label: "Statement", note: "I want the look to do the talking" }] },
] as const;

function weatherLabel(code?: number) {
  if (code === undefined) return "Local weather";
  if (code >= 51 && code <= 67) return "Rain nearby";
  if (code >= 71 && code <= 86) return "Snow nearby";
  if (code >= 95) return "Storm risk";
  if (code >= 1 && code <= 3) return "Partly cloudy";
  return "Clear skies";
}

export default function YouChoose() {
  const [state] = useAppState();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<Mood | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [effort, setEffort] = useState<Effort | null>(null);
  const [modelPhoto, setModelPhoto] = useState<string | null>(null);
  const [weatherCoords, setWeatherCoords] = useState<WeatherCoords | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const weatherInput = useMemo(() => weatherCoords ?? { latitude: 0, longitude: 0 }, [weatherCoords]);
  const weather = trpc.recommendations.weather.useQuery(weatherInput, { enabled: Boolean(weatherCoords), retry: false });
  const explain = trpc.recommendations.explainPairing.useMutation({ onError: (error) => toast.info(error.message) });

  const recommendation = useMemo(() => {
    if (!occasion || !effort || !mood) return null;
    const current = weather.data;
    const matching = state.items.filter((item) => item.occasion.includes(occasion));
    const pool = matching.length >= 2 ? matching : state.items;
    const moodWords: Record<Mood, string[]> = { calm: ["everyday", "quiet", "understated", "comfort"], confident: ["work", "polished", "tailored", "classic"], playful: ["party", "statement", "graphic", "color"], romantic: ["date", "soft", "blush", "silk"] };
    const effortScore: Record<Effort, number> = { easy: 2, polished: 4, statement: 5 };
    const weatherScore = (item: StyleItem) => {
      if (!current) return 0;
      const temperature = current.temperature_2m ?? 20;
      const isWet = (current.precipitation ?? 0) > 0 || (current.rain ?? 0) > 0 || (current.weather_code ?? 0) >= 51;
      const category = item.category.toLowerCase();
      let score = 0;
      if (temperature >= 27 && /shorts|skirts|blouses|t-shirts|tops|dresses|sandals/i.test(category)) score += 8;
      if (temperature <= 15 && /blazer|jacket|cardigan|trousers|pants|sweatshirt|hoodie/i.test(category)) score += 8;
      if (isWet && /jacket|blazer|pants|trousers|loafers|formal shoes/i.test(category)) score += 4;
      return score;
    };
    const ranked = [...pool].sort((a, b) => {
      const score = (item: StyleItem) => (item.occasion.includes(occasion) ? 30 : 0) + (moodWords[mood].some((word) => `${item.name} ${item.style} ${item.color}`.toLowerCase().includes(word)) ? 12 : 0) - Math.abs(item.formality - effortScore[effort]) * 2 + weatherScore(item) + item.createdAt / 1e12;
      return score(b) - score(a);
    });
    const nonAccessory = ranked.filter((item) => !/bags|jewellery|watches|belts|eyewear|shoes|loafers|heels|sandals|sneakers|flats/i.test(item.category));
    const first = nonAccessory[0] || ranked[0];
    const second = ranked.find((item) => item.id !== first?.id && (item.category !== first?.category || /blazer|jacket|cardigan|pants|jeans|skirt|shorts|bottom/i.test(item.category))) || ranked.find((item) => item.id !== first?.id);
    return first && second ? [first, second] : null;
  }, [state.items, mood, occasion, effort, weather.data]);

  const selectedValue = step === 0 ? mood : step === 1 ? occasion : effort;
  const setSelected = (value: string) => { if (step === 0) setMood(value as Mood); if (step === 1) setOccasion(value as Occasion); if (step === 2) setEffort(value as Effort); };
  const next = () => { if (!selectedValue) { toast.error("Choose one answer so Stylytics can make this personal."); return; } if (step < 2) setStep((value) => value + 1); };
  const useLocationWeather = () => { if (!navigator.geolocation) { toast.error("Location is not available in this browser."); return; } navigator.geolocation.getCurrentPosition((position) => { setWeatherCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }); toast.success("Local weather added to your recommendation."); }, () => toast.error("Location permission was denied. You can still choose an outfit without weather context."), { enableHighAccuracy: false, timeout: 8000, maximumAge: 900000 }); };
  const uploadModel = (file?: File) => { if (!file) return; if (!file.type.startsWith("image/")) { toast.error("Please choose a JPG, PNG, or WEBP model photo."); return; } const reader = new FileReader(); reader.onload = () => setModelPhoto(String(reader.result)); reader.readAsDataURL(file); };
  const showRecommendation = () => { if (!selectedValue) { toast.error("Choose an effort level first."); return; } setStep(3); if (recommendation) explain.mutate({ items: recommendation.map((item) => ({ id: item.id, name: item.name, category: item.category, color: item.color, style: item.style, formality: item.formality })), context: `${mood} mood, ${occasion} occasion, ${effort} effort${weather.data ? `, ${weatherLabel(weather.data.weather_code)}, ${weather.data.temperature_2m}${weather.data.units?.temperature_2m || "°C"}` : ""}` }); };
  const tryOn = () => { if (!recommendation) return; if (modelPhoto) window.sessionStorage.setItem("stylytics-chooser-photo", modelPhoto); navigate(`/try-on?items=${recommendation.map((item) => item.id).join(",")}`); };
  const activeQuestion = questions[Math.min(step, 2)];

  return <StyleShell><main className="mx-auto max-w-[1120px] px-5 py-8 sm:py-12 lg:px-10 lg:py-16"><PageIntro eyebrow="Your personal stylist" title="You Choose" description="Answer three quick questions and Stylytics will choose from the pieces you actually own—then explain the pairing and adjust it for your local weather." action={<Link href="/closet"><Button variant="outline" className="w-full rounded-full bg-white md:w-auto"><ArrowLeft size={16} /> Back to Closet</Button></Link>} />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><section className="rounded-[28px] bg-[#18152B] p-5 text-white sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#FFD166]">{step < 3 ? `Question ${step + 1} of 3` : "Your recommendation"}</p><h2 className="mt-3 max-w-2xl font-display text-4xl leading-[.94] tracking-[-.05em] sm:text-5xl">{step < 3 ? activeQuestion.title : "Your look is ready."}</h2></div><Sparkles className="shrink-0 text-[#78D5B0]" /></div>{step < 3 && <><div className="mt-7 grid gap-3 sm:grid-cols-2">{activeQuestion.options.map((option) => { const active = selectedValue === option.value; return <button key={option.value} onClick={() => setSelected(option.value)} className={`rounded-2xl border p-4 text-left transition ${active ? "border-[#FFD166] bg-[#FFD166] text-[#18152B]" : "border-white/10 bg-white/[.05] hover:bg-white/[.1]"}`}><div className="flex items-start justify-between gap-3"><span className="font-semibold">{option.label}</span>{active && <Check size={18} />}</div><p className={`mt-2 text-xs leading-5 ${active ? "text-[#18152B]/60" : "text-white/50"}`}>{option.note}</p></button>; })}</div><div className="mt-8 flex items-center justify-between gap-3"><button onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/50 hover:bg-white/10 hover:text-white disabled:invisible"><ArrowLeft size={15} /> Back</button>{step < 2 ? <Button onClick={next} className="rounded-full bg-[#FF6B57] text-[#18152B] hover:bg-[#ff836f]">Next question <ArrowRight size={15} /></Button> : <Button onClick={showRecommendation} disabled={!selectedValue || explain.isPending} className="rounded-full bg-[#78D5B0] text-[#18152B] hover:bg-[#8fe0c0)">{explain.isPending ? "Explaining…" : "See my look"} <Sparkles size={15} /></Button>}</div></>}</section>
      <aside className="space-y-4"><section className="rounded-[26px] bg-[#E6DEFF] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#5B5CE2]">Optional / local context</p><h2 className="mt-2 font-display text-2xl tracking-[-.04em]">Dress for the day</h2></div><CloudSun className="text-[#5B5CE2]" size={22} /></div><p className="mt-2 text-sm leading-5 text-[#18152B]/55">Share your approximate location so recommendations can account for temperature, rain, and wind. Your coordinates are only used for this weather request.</p><Button variant="outline" onClick={useLocationWeather} className="mt-4 w-full rounded-xl bg-white"><LocateFixed size={15} /> {weatherCoords ? "Refresh local weather" : "Use my location"}</Button>{weather.isFetching && <p className="mt-3 text-xs text-[#18152B]/50">Reading the forecast…</p>}{weather.data && <div className="mt-3 rounded-xl bg-white p-3 text-sm"><div className="flex items-center justify-between"><span className="font-semibold">{weatherLabel(weather.data.weather_code)}</span><span className="font-display text-2xl">{Math.round(weather.data.temperature_2m ?? 0)}{weather.data.units?.temperature_2m || "°C"}</span></div><p className="mt-1 text-xs text-[#18152B]/50">Feels like {Math.round(weather.data.apparent_temperature ?? weather.data.temperature_2m ?? 0)}{weather.data.units?.apparent_temperature || "°C"} · {weather.data.timezone}</p></div>}</section><section className="rounded-[26px] bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#FF6B57]">Optional / model photo</p><h2 className="mt-2 font-display text-2xl tracking-[-.04em]">Try it on you</h2><p className="mt-2 text-sm leading-5 text-[#18152B]/55">Upload your own model photo and we’ll carry it into Try-On after the recommendation.</p><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { uploadModel(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button variant="outline" onClick={() => photoInput.current?.click()} className="mt-4 w-full rounded-xl bg-white"><Upload size={15} /> {modelPhoto ? "Replace model photo" : "Upload model photo"}</Button>{modelPhoto && <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#F3F1FF] p-2"><img src={modelPhoto} alt="Uploaded model" className="h-14 w-14 rounded-lg object-cover" /><span className="text-xs font-semibold">Ready for Try-On</span></div>}</section><section className="rounded-[26px] bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#FF6B57]">Your answers</p><div className="mt-4 space-y-3 text-sm"><Answer label="Mood" value={mood ? labelMood(mood) : "Waiting"} /><Answer label="Occasion" value={occasion ? labelOccasion(occasion) : "Waiting"} /><Answer label="Effort" value={effort ? labelEffort(effort) : "Waiting"} /></div></section></aside></div>
    {step === 3 && recommendation && <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#5B5CE2]">Your Stylytics pick</p><h2 className="mt-2 font-display text-4xl tracking-[-.05em]">A look from your real closet.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#18152B]/55">Picked for a {mood} mood, a {occasion} moment, and a {effort} level of effort{weather.data ? `, with ${weatherLabel(weather.data.weather_code).toLowerCase()} in mind.` : "."}</p></div><Button onClick={tryOn} className="w-full rounded-full bg-[#FF6B57] text-[#18152B] hover:bg-[#ff836f] sm:w-auto"><Shirt size={16} /> Try this on</Button></div><div className="mt-6"><WardrobeBoard items={recommendation} title="Recommended pairing" /></div>{explain.data && <div className="mt-5 rounded-2xl bg-[#F3F1FF] p-5"><div className="flex items-center gap-2 text-[#5B5CE2]"><Sparkles size={16} /><p className="text-[10px] font-bold uppercase tracking-[.18em]">Why these pieces work</p></div><h3 className="mt-2 font-display text-2xl tracking-[-.04em]">{explain.data.headline}</h3><p className="mt-2 text-sm leading-6 text-[#18152B]/65">{explain.data.explanation}</p><p className="mt-3 text-xs font-semibold text-[#18152B]/50">Stylist tip: {explain.data.tip}</p></div>}</section>}
  </main></StyleShell>;
}
function Answer({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 border-b border-[#18152B]/8 pb-3"><span className="text-[#18152B]/45">{label}</span><span className="font-semibold">{value}</span></div>; }
function labelMood(value: Mood) { return { calm: "Calm + comfortable", confident: "Confident + capable", playful: "Playful + expressive", romantic: "Romantic + considered" }[value]; }
function labelEffort(value: Effort) { return { easy: "Easy", polished: "Polished", statement: "Statement" }[value]; }
