

## Stylytics implementation notes

Stylytics is a wardrobe companion built around a **single visual vocabulary**: real garments, real demo photos, and composed boards. The current preview uses a shared browser-persisted state layer (`client/src/lib/styleData.ts`) so Closet, Try-On, Gallery, and Set the Scene all read and write the same canonical records during preview mode. A production account layer can map this state to the existing Manus-authenticated database without changing the UI contracts.

### Canonical data and taxonomy

The Closet is the source of truth for items. A garment uploaded from Closet or Try-On is inserted once with an id, image, category, color, style, occasion tags, and derived formality metadata. The canonical occasion taxonomy is: `casual`, `work`, `date`, `party`, `wedding`, `travel`, and `everyday`. Set the Scene stores dress-code preference, body priorities, undertone, gender, occasion focus, and photo factor once; Try-On reads the saved Gender and Undertone values as defaults and keeps session edits separate.

### Try-On provider abstraction

The current experience is intentionally labeled **Basic Preview**. It composes a real body photo and a real Closet image using adjustable manual scale, position, rotation, opacity, and layer controls. No provider output is fabricated. A future provider can be connected behind a server-side `tryOn.generate` procedure that accepts only stored image references, keeps credentials in environment variables, and returns a rendered image record. The UI already separates the provider status label from the manual overlay path, so switching providers does not require a visual redesign.

### Honest limitations

Stylytics does not invent clothing images. Demo garment images and uploaded photos are real photos; curated outfits are compositions of those records. Without a configured third-party fitting provider, Try-On is a manual visual preview rather than an AI fit simulation. Saved Gallery looks use the original photo and preserve the exact selected garment images. The preview build persists to browser storage so the interactive product can be explored without sign-in; production persistence should connect the same shared records to the existing database and Manus OAuth user id.

### Verification

`pnpm check`, `pnpm build`, and the Vitest suite pass for this checkpoint. The landing page, Closet, Try-On, Gallery, and Set the Scene routes are registered in `client/src/App.tsx` and share `StyleShell` navigation and the same state source.


### AI two-garment generation

Try-On now requires exactly two real Closet garments for its AI path. The server calls the built-in LLM to curate only those two pieces for the selected context, then sends the body photo plus both garment references to the server-side image service. The generated result is labeled `AI-Curated Fit · Experimental Preview`. API credentials remain server-only. If the provider is unavailable, the manual overlay remains available and the UI reports the failure honestly.
