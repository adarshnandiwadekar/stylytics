import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  Maximize2,
  RotateCcw,
  Save,
  Search,
  Shirt,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageIntro, StyleShell } from "@/components/StyleShell";
import { type StyleItem, useAppState } from "@/lib/styleData";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const demoPhoto = "/manus-storage/neutral-look_116aef4f.jpeg";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const DEFAULT_LAYER_ASPECT = 0.8;

type PreviewSize = { width: number; height: number };

function optimizeImage(file: File, maxDimension = 1400) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
        const scale = Math.min(1, maxDimension / Math.max(longestSide, 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image processing is unavailable");
        context.fillStyle = "#f8f6f2";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That image could not be read"));
    };
    image.src = objectUrl;
  });
}

function displayName(file: File) {
  return file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Uploaded garment";
}

function isBottomLike(category: string) {
  return /pants|jeans|shorts|skirts|palazzos|bottoms|trousers/i.test(category);
}

export default function TryOn() {
  const [state, commit] = useAppState();
  const [photo, setPhoto] = useState(demoPhoto);
  const [photoLabel, setPhotoLabel] = useState("Demo portrait");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [scale, setScale] = useState(100);
  const [positionY, setPositionY] = useState(38);
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(88);
  const [layerAspect, setLayerAspect] = useState(DEFAULT_LAYER_ASPECT);
  const [previewSize, setPreviewSize] = useState<PreviewSize>({ width: 520, height: 720 });
  const [cameraOpen, setCameraOpen] = useState(false);
  const [generatedPhoto, setGeneratedPhoto] = useState<string | null>(null);
  const [curation, setCuration] = useState<{ title: string; rationale: string; pairing: string } | null>(null);
  const [showAttributes, setShowAttributes] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const garmentInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const queryIds = useMemo(() => {
    if (typeof window === "undefined") return [];
    return new URLSearchParams(window.location.search).get("items")?.split(",").filter(Boolean) ?? [];
  }, []);

  const generate = trpc.tryOn.generate.useMutation({
    onSuccess: (result) => {
      setGeneratedPhoto(result.url);
      setCuration({ title: result.title, rationale: result.rationale, pairing: result.pairing });
      toast.success("AI-curated outfit generated from your two real pieces.");
    },
    onError: (error) => {
      setGeneratedPhoto(null);
      setCuration(null);
      toast.error(error.message || "AI outfit generation is unavailable right now.");
    },
  });

  useEffect(() => {
    if (queryIds.length) {
      setSelected(queryIds.filter((id) => state.items.some((item) => item.id === id)).slice(0, 2));
    }
  }, [queryIds]);

  useEffect(() => {
    const chooserPhoto = window.sessionStorage.getItem("stylytics-chooser-photo");
    if (!chooserPhoto) return;
    setPhoto(chooserPhoto);
    setPhotoLabel("You Choose model photo");
    window.sessionStorage.removeItem("stylytics-chooser-photo");
  }, []);

  useEffect(() => {
    setSelected((ids) => ids.filter((id) => state.items.some((item) => item.id === id)));
  }, [state.items]);

  useEffect(() => {
    const element = previewRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setPreviewSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const stopCamera = useCallback((close = true) => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (close) setCameraOpen(false);
  }, []);

  useEffect(() => () => stopCamera(false), [stopCamera]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraOpen]);

  const selectedItems = selected
    .map((id) => state.items.find((item) => item.id === id))
    .filter((item): item is StyleItem => Boolean(item));
  const results = state.items
    .filter(
      (item) =>
        !selected.includes(item.id) &&
        (!search || `${item.name} ${item.category} ${item.color}`.toLowerCase().includes(search.toLowerCase())),
    )
    .slice(0, 8);
  const layerBounds = useMemo(() => {
    const maxWidth = previewSize.width * 0.74;
    const maxHeight = previewSize.height * 0.58;
    let width = maxWidth;
    let height = width / Math.max(layerAspect, 0.2);
    if (height > maxHeight) {
      height = maxHeight;
      width = height * Math.max(layerAspect, 0.2);
    }
    return { width: Math.max(80, width), height: Math.max(100, height) };
  }, [layerAspect, previewSize]);
  const canSave = selectedItems.length === 2 && !generate.isPending;

  const resetManualFit = useCallback(
    (item = selectedItems[0]) => {
      setScale(100);
      setPositionY(item && isBottomLike(item.category) ? 58 : 38);
      setRotation(0);
      setOpacity(88);
      setLayerAspect(DEFAULT_LAYER_ASPECT);
    },
    [selectedItems],
  );

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("That file is not an image we can use.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Please choose an image smaller than 12 MB.");
      return;
    }
    try {
      const optimized = await optimizeImage(file);
      setPhoto(optimized);
      setGeneratedPhoto(null);
      setCuration(null);
      setPhotoLabel(file.name);
      toast.success("Photo optimized and ready for AI curation.");
    } catch {
      toast.error("That image could not be prepared. Try a JPG, PNG, or WEBP.");
    }
  };

  const uploadGarment = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a JPG, PNG, or WEBP garment photo.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Please choose a garment image smaller than 12 MB.");
      return;
    }
    if (selectedItems.length >= 2) {
      toast.error("AI curation uses exactly two garments. Remove one piece first.");
      return;
    }
    try {
      const optimized = await optimizeImage(file);
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newItem: StyleItem = {
        id,
        name: displayName(file),
        category: "Tops",
        color: "New",
        style: "Your edit",
        occasion: ["everyday"],
        formality: 3,
        image: optimized,
        source: "upload",
        createdAt: Date.now(),
      };
      commit((current) => ({ ...current, items: [newItem, ...current.items] }));
      setSelected((ids) => [...ids, id]);
      setGeneratedPhoto(null);
      setCuration(null);
      resetManualFit(newItem);
      toast.success("Garment optimized, added to Closet, and selected here.");
    } catch {
      toast.error("That garment image could not be prepared. Try a JPG, PNG, or WEBP.");
    }
  };

  const useCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera access is not available here. You can still upload a photo.");
      return;
    }
    stopCamera(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1440 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      toast.error("Camera access was unavailable. You can still upload a photo instead.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      toast.error("The camera is still warming up. Try Capture again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Camera capture is unavailable in this browser.");
      return;
    }
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.88));
    setGeneratedPhoto(null);
    setCuration(null);
    setPhotoLabel("Camera capture");
    stopCamera();
    toast.success("Camera capture ready.");
  };

  const toggleItem = (id: string) => {
    setGeneratedPhoto(null);
    setCuration(null);
    setSelected((ids) => {
      if (ids.includes(id)) return ids.filter((itemId) => itemId !== id);
      if (ids.length >= 2) {
        toast.error("Choose exactly two garments for AI curation.");
        return ids;
      }
      return [...ids, id];
    });
    const nextItem = state.items.find((item) => item.id === id);
    if (nextItem) resetManualFit(nextItem);
  };

  const toAbsolute = (value: string) => {
    if (value.startsWith("data:")) return value;
    try {
      return new URL(value, window.location.origin).toString();
    } catch {
      return value;
    }
  };

  const generateAI = () => {
    if (selectedItems.length !== 2) {
      toast.error("Choose exactly two real garments first.");
      return;
    }
    if (!photo) {
      toast.error("Add a photo before generating a fitted outfit.");
      return;
    }
    setGeneratedPhoto(null);
    setCuration(null);
    generate.mutate({
      photo: toAbsolute(photo),
      garments: selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        color: item.color,
        image: toAbsolute(item.image),
      })),
      occasion: "everyday",
      profile: {
        undertone: state.profile.undertone,
        gender: state.profile.gender,
        dressCode: state.profile.dressCode,
      },
    });
  };

  const saveLook = () => {
    if (selectedItems.length !== 2) {
      toast.error("Select exactly two garments before saving an outfit.");
      return;
    }
    const savedImage = generatedPhoto || photo;
    commit((current) => ({
      ...current,
      gallery: [
        {
          id: `look-${Date.now()}`,
          title: curation?.title || `${selectedItems[0].style} two-piece edit`,
          date: Date.now(),
          photo: savedImage,
          itemIds: selectedItems.map((item) => item.id),
          itemNames: selectedItems.map((item) => item.name),
        },
        ...current.gallery,
      ],
    }));
    toast.success("Look saved to your Gallery.");
  };

  const shownPhoto = generatedPhoto || photo;

  return (
    <StyleShell>
      <main className="mx-auto max-w-[1320px] px-5 py-8 sm:py-10 lg:px-10 lg:py-14">
        <PageIntro
          eyebrow="The fitting room"
          title="Try it on, before you buy."
          description="Choose exactly two real Closet pieces. Stylytics keeps your full photo visible, preserves proportions, and uses AI to build the most accurate fitted preview available."
          action={
            <Button onClick={saveLook} disabled={!canSave} className="w-full rounded-full bg-[#FF6B57] text-[#18152B] hover:bg-[#ff836f] md:w-auto">
              <Save size={16} /> Save to Gallery
            </Button>
          }
        />

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-w-0 rounded-[28px] bg-[#18152B] p-3 text-white sm:p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] ${generatedPhoto ? "bg-[#78D5B0] text-[#18152B]" : "bg-[#FFD166] text-[#18152B]"}`}>
                  {generatedPhoto ? "AI-Curated Fit" : "Manual Preview"}
                </span>
                <p className="mt-3 max-w-xl text-sm leading-5 text-white/50">
                  {generatedPhoto ? "Full generated frame shown without cropping. Your two selected wardrobe references are preserved in the fit." : "Manual preview keeps the source image proportions. Generate an AI fit for the most accurate garment placement."}
                </p>
              </div>
              <button onClick={() => { setPhoto(demoPhoto); setGeneratedPhoto(null); setCuration(null); setPhotoLabel("Demo portrait"); stopCamera(); }} className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-white/55 hover:bg-white/10 hover:text-white">
                <RotateCcw size={14} /> Reset photo
              </button>
            </div>

            <div ref={previewRef} aria-busy={generate.isPending} className="relative mx-auto aspect-[3/4] min-h-[450px] max-h-[670px] w-full max-w-[520px] overflow-hidden rounded-[22px] bg-[#E7DCCF] sm:aspect-[.72] sm:min-h-0 sm:rounded-[24px]">
              <img src={shownPhoto} alt="Your try-on result" className="absolute inset-0 h-full w-full object-contain object-center" onError={() => { if (generatedPhoto) { setGeneratedPhoto(null); setCuration(null); toast.error("The generated preview could not be loaded. Your manual preview is still available."); } }} />

              {!generatedPhoto && selectedItems.length > 0 && (
                <div className="absolute left-1/2 origin-center overflow-hidden rounded-[18px] transition-[top,opacity,transform] duration-200" style={{ top: `${positionY}%`, width: `${layerBounds.width}px`, height: `${layerBounds.height}px`, maxWidth: "88%", maxHeight: "62%", transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale / 100})`, opacity: opacity / 100 }}>
                  <img src={selectedItems[0].image} alt={`${selectedItems[0].name} manual layer`} className="block h-full w-full object-contain mix-blend-multiply drop-shadow-2xl" onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth && image.naturalHeight) setLayerAspect(image.naturalWidth / image.naturalHeight); }} />
                  <div className="absolute right-2 top-2 rounded-full bg-[#FFD166] px-2 py-1 text-[9px] font-bold text-[#18152B] shadow-lg">placement guide</div>
                </div>
              )}

              {!selectedItems.length && <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-2xl border border-dashed border-white/40 bg-[#18152B]/45 p-5 text-center backdrop-blur-sm sm:inset-x-8 sm:p-6"><Shirt className="mx-auto mb-3 text-[#FFD166]" /><p className="font-display text-2xl leading-[.95] sm:text-3xl">Select two pieces to start curating.</p><p className="mt-2 text-xs leading-5 text-white/65">The full original photo stays visible underneath.</p></div>}

              {generate.isPending && <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#18152B]/65 p-6 text-center backdrop-blur-sm"><div><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#FFD166]" /><p className="font-display text-2xl">Building a fitted preview</p><p className="mt-2 text-xs leading-5 text-white/65">Keeping your face, proportions, and two selected pieces intact.</p></div></div>}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-2xl bg-[#18152B]/75 px-3 py-3 text-xs backdrop-blur sm:bottom-4 sm:left-4 sm:right-4 sm:px-4"><span className="min-w-0 truncate">{generatedPhoto ? curation?.title || "AI-curated outfit" : photoLabel}</span><span className="shrink-0 text-[#FFD166]">{selectedItems.length}/2 pieces</span></div>
            </div>

            {curation && <div className="mx-auto mt-5 max-w-[520px] rounded-2xl border border-[#78D5B0]/30 bg-[#78D5B0]/10 p-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#78D5B0]">AI stylist note</p><p className="mt-2 font-semibold">{curation.title}</p><p className="mt-1 text-sm leading-6 text-white/65">{curation.rationale}</p><p className="mt-2 text-xs text-white/45">Pairing: {curation.pairing}</p></div>}

            {!generatedPhoto && <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs leading-5 text-white/55">Manual controls are bounded to keep the full layer inside the preview frame.</p><Button variant="outline" onClick={() => resetManualFit()} className="shrink-0 rounded-full border-white/20 bg-white/5 px-3 text-xs text-white hover:bg-white/10 hover:text-white"><Maximize2 size={13} /> Fit layer</Button></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><Control label="Scale" value={scale} min={75} max={125} onChange={setScale} /><Control label="Position" value={positionY} min={22} max={68} onChange={setPositionY} suffix="%" /><Control label="Opacity" value={opacity} min={45} max={100} onChange={setOpacity} /></div><div className="mt-4"><label className="mb-2 block text-xs text-white/45" htmlFor="rotation-range">Rotation</label><input id="rotation-range" aria-label="Rotation" type="range" min={-8} max={8} value={rotation} onChange={(event) => setRotation(Number(event.target.value))} className="w-full accent-[#FF6B57]" /></div></div>}
          </section>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-[26px] bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#FF6B57]">01 / Your photo</p><h2 className="mt-1 font-display text-2xl tracking-[-.04em]">Start with a frame</h2></div><ImagePlus size={20} className="text-[#5B5CE2]" /></div><div className="grid grid-cols-2 gap-2"><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void uploadPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button variant="outline" className="h-auto rounded-xl py-3" onClick={() => photoInput.current?.click()}><Upload size={15} /> Upload</Button><Button variant="outline" className="h-auto rounded-xl py-3" onClick={useCamera} disabled={cameraOpen}><Camera size={15} /> {cameraOpen ? "Camera on" : "Use camera"}</Button></div><p className="mt-3 text-[11px] leading-5 text-[#18152B]/45">Images are resized before use so mobile uploads stay fast and stable. JPG, PNG, or WEBP up to 12 MB.</p>{cameraOpen && <div className="mt-4 overflow-hidden rounded-xl bg-[#18152B]"><video ref={videoRef} autoPlay playsInline muted className="aspect-[.8] w-full object-cover" /><div className="flex gap-2 p-2"><Button onClick={capture} className="flex-1 rounded-full bg-[#FFD166] text-[#18152B]">Capture</Button><Button onClick={() => stopCamera()} variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white">Cancel</Button></div></div>}</section>

            <section className="rounded-[26px] bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#5B5CE2]">02 / Pick two real pieces</p><h2 className="mt-1 font-display text-2xl tracking-[-.04em]">AI outfit ingredients</h2></div><Sparkles size={19} className="text-[#5B5CE2]" /></div><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#18152B]/35" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your pieces…" className="rounded-xl pl-9" /></div><div className="mt-3 max-h-[270px] space-y-2 overflow-y-auto pr-1">{selectedItems.map((item) => <button key={item.id} onClick={() => toggleItem(item.id)} className="flex w-full items-center gap-3 rounded-xl bg-[#FFF0EC] p-2 text-left ring-1 ring-[#FF6B57]"><img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover mix-blend-multiply" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block text-[11px] text-[#18152B]/45">{item.category} · {item.color}</span></span><Check size={16} className="text-[#FF6B57]" /></button>)}{results.map((item) => <button key={item.id} onClick={() => toggleItem(item.id)} className="flex w-full items-center gap-3 rounded-xl bg-[#F8F7FF] p-2 text-left transition hover:bg-[#F0EEFF]"><img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover mix-blend-multiply" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block text-[11px] text-[#18152B]/45">{item.category} · {item.color}</span></span><span className="text-xs text-[#18152B]/35">Add</span></button>)}{!results.length && !selectedItems.length && <p className="py-4 text-center text-xs text-[#18152B]/45">No matching closet pieces.</p>}</div><input ref={garmentInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void uploadGarment(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button onClick={() => garmentInput.current?.click()} variant="outline" className="mt-3 w-full rounded-xl border-dashed"><Upload size={15} /> Upload a new garment to Closet</Button><Button onClick={generateAI} disabled={selectedItems.length !== 2 || generate.isPending} className="mt-3 w-full rounded-xl bg-[#5B5CE2] text-white hover:bg-[#7475ec]">{generate.isPending ? <><Loader2 size={15} className="animate-spin" /> Curating + generating…</> : <><Sparkles size={15} /> Generate AI outfit</>}</Button>{selectedItems.length !== 2 && <p className="mt-2 text-center text-[11px] leading-5 text-[#18152B]/45">Select exactly two garments to unlock AI curation.</p>}</section>

            <section className="rounded-[26px] bg-[#E6DEFF] p-4 sm:p-5"><button onClick={() => setShowAttributes((value) => !value)} className="flex w-full items-center justify-between text-left"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#5B5CE2]">03 / Your context</p><h2 className="mt-1 font-display text-2xl tracking-[-.04em]">Set the Scene defaults</h2></div><ChevronDown size={18} className={`transition-transform ${showAttributes ? "rotate-180" : ""}`} /></button>{showAttributes && <div className="mt-5 space-y-3 border-t border-[#5B5CE2]/15 pt-4 text-sm"><div className="flex justify-between gap-4"><span className="text-[#18152B]/50">Gender</span><span className="font-semibold">{state.profile.gender || "Not set"}</span></div><div className="flex justify-between gap-4"><span className="text-[#18152B]/50">Undertone</span><span className="font-semibold">{state.profile.undertone || "Not set"}</span></div><p className="pt-1 text-[11px] leading-5 text-[#18152B]/50">Used as AI curation context. Your saved profile is never re-asked.</p></div>}</section>
          </aside>
        </div>
      </main>
    </StyleShell>
  );
}

function Control({ label, value, min, max, suffix = "", onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="text-xs text-white/45"><span className="mb-2 flex justify-between gap-2"><span>{label}</span><span className="text-white/80">{value}{suffix}</span></span><input aria-label={label} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#FF6B57]" /></label>;
}
