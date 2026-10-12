# Signature Pad & Guestbook: Implementation Deep Dive

This documents how signing works end-to-end: capturing a hand-drawn signature in the
browser, turning raw pointer input into a smooth ink stroke, uploading it, persisting
the guestbook post, and rendering it on the `/wall` canvas.

Three layers are involved:

1. **`components/signature-pad/`** — the drawing widget (canvas + `perfect-freehand`).
2. **`components/guestbook/` + `lib/api` + `lib/hooks` + `src/routes/api/`** — the sign
   flow (auth, upload, persist, optimistic UI).
3. **`src/features/wall/`** — the infinite-canvas gallery that lays out every signature
   that's ever been submitted.

---

## 1. The drawing widget

### Files

```
components/signature-pad/
├── point.ts          Point class: pointer-event → canvas coordinates
├── helper.ts          getSvgPathFromStroke: stroke polygon → SVG path string
├── signature-pad.tsx  <SignaturePad>: the actual React component
└── index.ts            barrel export
```

Dependency: [`perfect-freehand`](https://github.com/steveruizok/perfect-freehand) — takes
an array of `{x, y}` (or `[x, y, pressure]`) points and returns a smoothed, pressure-
tapered **outline polygon** (an array of `[x, y]` points describing the ink stroke's
edge), rather than just a thin polyline. That's what makes the strokes look like ink
instead of a wire.

### `Point` (`point.ts`)

```ts
export class Point implements PointLike {
  constructor(public x: number, public y: number) {}

  distanceTo(point: PointLike): number {
    return Math.hypot(point.x - this.x, point.y - this.y);
  }

  static fromPointerEvent(event: ReactPointerEvent<HTMLElement>, dpi = 1): Point {
    const { top, bottom, left, right } = event.currentTarget.getBoundingClientRect();
    const x = (Math.min(Math.max(left, event.clientX), right) - left) * dpi;
    const y = (Math.min(Math.max(top, event.clientY), bottom) - top) * dpi;
    return new Point(x, y);
  }
}
```

`fromPointerEvent` does two things at once:

- **Clamps** `clientX`/`clientY` into the canvas's bounding rect, so a pointer that
  slides past the edge of the `<canvas>` doesn't get an out-of-range coordinate (this is
  what lets `onPointerLeave` still register a sane final point).
- **Converts to canvas-space pixels** by subtracting the rect origin, then scales by
  `dpi` to map CSS pixels to the backing-store resolution (see DPI section below).

### `getSvgPathFromStroke` (`helper.ts`)

`perfect-freehand`'s `getStroke()` returns an ordered list of `[x, y]` outline points.
This helper turns that point list into an SVG path `d` string using **quadratic Bézier
curves through midpoints** — the standard "smooth freehand line" trick:

```ts
const average = (a: number, b: number) => (a + b) / 2;

export const getSvgPathFromStroke = (points: number[][]) => {
  if (points.length < 4) return "";

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0]},${a[1]} Q${b[0]},${b[1]} ${average(b[0], c[0])},${average(b[1], c[1])} T`;

  for (let i = 2; i < points.length - 1; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0])},${average(a[1], b[1])} `;
  }

  return `${result}Z`;
};
```

Each segment moves to the midpoint between consecutive outline points, using the
previous point as the Bézier control point (`Q ... T` chains — `T` reuses the implicit
reflected control point). The `Z` closes the polygon so it can be **filled** rather than
stroked, which is what gives the ink its tapered width instead of a constant-width line.

This path string is fed into a `Path2D` and filled on the canvas:

```ts
const drawLine = (context, canvas, line: Point[]) => {
  const path = new Path2D(getSvgPathFromStroke(getStroke(line, getStrokeOptions(canvas))));
  context.fill(path);
};
```

### Stroke shape tuning

```ts
const getStrokeOptions = (canvas: HTMLCanvasElement) => {
  const size = Math.min(canvas.height, canvas.width) * 0.03; // stroke width scales with canvas size
  return {
    size,
    thinning: 0.25,   // how much pressure/velocity affects width
    streamline: 0.5,  // input smoothing (reduces jitter)
    smoothing: 0.5,   // corner smoothing
    end: { taper: size * 2 }, // tapers the stroke end to a point
  };
};
```

`size` is derived from the canvas dimensions rather than hardcoded, so the pen weight
stays visually consistent whether the pad is rendered small (dialog) or large.

### `SignaturePad` component (`signature-pad.tsx`)

State is kept almost entirely in **refs**, not React state, to avoid re-rendering (and
therefore re-running the whole `useEffect`/layout machinery) on every pointer-move:

```ts
const canvasRef = useRef<HTMLCanvasElement>(null);
const linesRef = useRef<Line[]>([]);        // committed strokes
const currentLineRef = useRef<Line>([]);    // stroke currently being drawn
const isDrawingRef = useRef(false);
const [lineCount, setLineCount] = useState(0); // only used to conditionally show "Undo"
```

Rendering is done by imperatively drawing to the canvas 2D context (`redraw()`), not by
React re-render — canvas painting is manual on every relevant pointer event.

**Pointer event flow** (all handlers are native `pointerdown`/`pointermove`/`pointerup`
via React's unified Pointer Events, so mouse/touch/pen all funnel through one code path):

| Event | Behavior |
|---|---|
| `onPointerDown` | `preventDefault()`, sets `isDrawingRef = true`, starts `currentLineRef` with one point |
| `onPointerMove` | No-op if not drawing. Computes the new point; **drops it if it's within `MIN_POINT_DISTANCE` (5px) of the last point** (decimation — reduces point count/noise); otherwise appends it and calls `redraw(nextLine)` to draw the in-progress stroke as a live preview |
| `onPointerUp` | Ends the stroke, appends the final point, commits `currentLineRef` into `linesRef` (`lines` = array of strokes), triggers a full `redraw()`, then `publishChange()` |
| `onPointerEnter` | If the primary button is already held (`event.buttons === 1`) — e.g. pointer re-entered the canvas mid-drag — resumes drawing by calling `onPointerDown` |
| `onPointerLeave` | Calls `onPointerUp(event, false)` — ends the current stroke **without committing it** (`shouldCommit = false`), so lifting off the edge of the pad doesn't leave a stray line but also doesn't discard progress destructively — it just redraws without the abandoned line |

`redraw(previewLine?)` clears the canvas and repaints every committed line plus, if
passed, the stroke currently being drawn — this is what gives live visual feedback while
the pointer is still down.

`publishChange()` calls the `onChange` prop with `canvas.toDataURL()` (a base64 PNG data
URL) if there's at least one line, otherwise `null`. This is the **only** way data leaves
the component — it's a controlled/callback pattern, not exposing a ref API.

**Undo / Clear**:
- `onUndoClick` pops the last committed line off `linesRef`, redraws, republishes.
- `onClearClick` resets everything and calls `onChange(null)` directly.

**DPI handling**: `DPI = 2` is a fixed backing-store multiplier (not
`window.devicePixelRatio`) applied in two places that must stay in sync:

```ts
useEffect(() => {
  if (canvasRef.current) {
    canvasRef.current.width = canvasRef.current.clientWidth * DPI;
    canvasRef.current.height = canvasRef.current.clientHeight * DPI;
  }
}, []);
```

and every `Point.fromPointerEvent(event, DPI)` call. The canvas is sized in CSS pixels
via Tailwind classes but the backing bitmap is 2x that, so strokes render crisp on
high-DPI screens; incoming pointer coordinates (which arrive in CSS pixels) are scaled up
by the same factor so they land in the right place on the bitmap.

**Styling quirk**: the `<canvas>` has `dark:invert` — in dark mode the CSS filter
inverts the drawn (black) ink to white, rather than the component tracking a theme and
picking a different draw color. The same `dark:invert` (or `[.dark_&]:invert`) pattern
is reused wherever a saved signature `<img>` is displayed later (post cards, wall,
signature dialog), since PNGs are always saved with black ink baked in.

**No resize handling**: the canvas is sized once on mount. Resizing the window after
mount won't rescale the backing store (existing ink would need scaling/redraw logic that
isn't present) — acceptable because it's shown inside a fixed-size dialog.

**Touch handling**: `style={{ touchAction: "none" }}` on the canvas is what stops the
browser's default scroll/pinch gestures from hijacking touch-drag input before it
reaches the pointer handlers.

---

## 2. The guestbook sign flow

### Where it's used

`components/guestbook/sign-dialog.tsx` renders `<SignaturePad>` inside a `<Dialog>`
form, alongside a required message `<Textarea>`.

```tsx
<SignaturePad
  className="aspect-video h-40 mt-2 w-full rounded-lg border ..."
  onChange={(value) => { signatureRef.current = value; }}
/>
```

Note the signature value is stashed in a **ref**, not state — the pad's data URL isn't
needed for rendering, only for the eventual submit, so this avoids re-rendering the
dialog on every stroke.

### Submit sequence (`handleSubmit` in `sign-dialog.tsx`)

1. Validate the message is non-empty (client-side; also re-validated server-side).
2. If a signature was drawn (`signatureRef.current` is a data URL):
   - `submitState = "uploading-signature"`
   - `signatureApi.upload(dataUrl)` → `POST /api/signature/upload` → returns a public
     blob URL (see below). Errors here (`SignatureUploadError`) surface as a toast and
     abort the submit — signature upload failure does **not** silently sign with a
     `null` signature.
3. `submitState = "signing"`
4. `useSignGuestbook().mutateAsync({ message, signature: url ?? null, author })` →
   `POST /api/guestbook/sign`.
5. Close dialog + reset form on success.

So a signature is **optional** — the guestbook post can be created with `signature:
null`, message-only. The pad component itself imposes no "must draw something" rule.

### Signature upload (`src/routes/api/signature/upload.ts`)

A TanStack Start server route:

1. Requires an authenticated session (`betterAuth.api.getSession`), else `401`.
2. Validates the body is `{ signature: string }` and the string starts with
   `data:image/png;base64,` (rejects anything that isn't a PNG data URL up front).
3. Validates the base64 payload itself: non-empty, length is a multiple of 4, and matches
   a base64 character-set regex — this is defense against malformed/malicious payloads
   before ever calling `Buffer.from`.
4. Uploads via **`@vercel/blob`**'s `put()`:
   ```ts
   const blob = await put(`signatures/${session.user.id}-${Date.now()}.png`, buffer, {
     access: "public",
     contentType: "image/png",
   });
   return Response.json({ url: blob.url });
   ```
   The key is namespaced by user id + timestamp, so re-signing (if ever allowed) can't
   collide, and files are content-addressed by path rather than trusting client input for
   the filename.

### Persisting the post (`src/routes/api/guestbook/sign.ts` → `lib/data/guestbook.ts`)

1. Requires auth, same as upload.
2. Validates `message` (non-empty, trimmed, ≤500 chars) and `signature` (must be `null`
   or a non-empty string — i.e., the *uploaded URL*, not raw pixel data, since by this
   point the client already swapped the data URL for the blob URL).
3. `checkUserHasPost(userId)` — **one guestbook post per user**, enforced both by a DB
   query here (returns `409 ALREADY_SIGNED`) and by a `unique()` constraint on
   `post.user_id` in the schema (`lib/schema.ts`) as a backstop.
4. `createPost()` inserts a row with a `nanoid()` id.
5. Re-fetches and returns the joined post (`getPostWithUser`, joined against `user` for
   `username`/`name`) so the client gets back exactly what a list fetch would return.

### Client state (`lib/hooks/use-guestbook.ts`)

- `useGuestbookPosts` — `useInfiniteQuery` over `guestbookApi.getPosts(cursor)`,
  offset-based pagination (`PAGE_SIZE = 30` in `lib/data/guestbook.ts`), seeded with SSR
  `initialPosts` from the route loader so first paint doesn't wait on a client fetch.
- `useSignGuestbook` — a mutation with **optimistic update**: on `onMutate`, it
  synthesizes a temp post (`id: temp-${Date.now()}`) and unshifts it into page 0 of the
  query cache before the network request resolves, so the new post appears instantly.
  Rolls back to the snapshot (`previousPosts`) on error, and unconditionally
  invalidates the guestbook query on settle to reconcile with the server's real record
  (real id, canonical `created_at`, etc).

### Rendering a signed post (`components/guestbook/post-card.tsx`)

Just an `<img>` tag pointed at the blob URL, with `dark:invert` to flip the black ink to
white in dark mode, same trick as the pad canvas itself.

---

## 3. The signature wall (`/wall`) — canvas gallery of every signature

This is a separate, denser feature: instead of a paginated list, every guestbook
signature ever submitted is laid out on an infinite pannable/zoomable canvas.

### Data (`lib/data/wall.ts`)

`getAllSignatures()` pulls every post that **has** a non-empty signature (`isNotNull` +
`ne(post.signature, "")`), joined to `user`, ordered by `created_at` ascending —
message-only posts are excluded entirely, since the wall has nothing to render for them.

### Layout algorithm (`src/features/wall/lib/signature-layout.ts`)

`computeSignatureLayout(signatures)` runs **once on the server** (in the route loader,
not per-client) and produces:

- `positions: SignaturePosition[]` — an `{id, x, y, signature}` for every signature.
- `revealOrder: string[]` — ids sorted by distance from origin, used for the staggered
  reveal animation (see Wall Canvas below).

Placement uses a **square spiral** (`getSpiralCoordinates`) to assign each signature a
`(column, row)` grid cell outward from the center in submission order — so the first
signer ends up near the center of the wall and later signers ring outward. This is the
classic "ring" spiral: layer `= ceil((sqrt(index+1)-1)/2)`, then walk the four sides of
that ring based on `offset` within it.

Each grid cell is converted to pixels (`getGridPosition`) using fixed
`ELEMENT_WIDTH`/`ELEMENT_HEIGHT` (220×140) plus a `MIN_GAP` (12px), and then jittered by
a small random offset — **seeded by the signature's own id** (`seededRandom`, a simple
LCG-style hash), not `Math.random()` — so layout is deterministic across server
re-renders/reloads rather than reshuffling every request.

### Rendering (`src/features/wall/components/wall-canvas.tsx`)

- `useCanvasViewport` (hook, not shown above but referenced) owns pan/zoom state and
  pointer-drag gesture handling for the canvas itself — separate concern from the
  signature-pad's drawing gestures.
- `useViewportCulling` filters `positions` down to `visiblePositions` — only the
  signatures currently within the visible pan/zoom viewport are mounted as DOM nodes, so
  the wall stays performant no matter how many hundreds of signatures exist.
- Each visible signature renders as a `<SignatureElement>`: an absolutely positioned
  `<img>` (`translate3d` for GPU-accelerated positioning) showing the signature PNG
  (again `[.dark_&]:invert`), overlaid with an invisible `<button>` (`signature-hit`) that
  opens a `<SignatureDialog>` with the signer's name, date, and GitHub link — click
  detection is guarded by `wasDragging()` so a pan gesture doesn't also register as an
  "open" click.
- **Staggered reveal**: `getRevealDelay` buckets each signature's `revealOrder` index
  into rings of 5 (`RING_SIZE`), mod 10, times a 30ms stagger (`STAGGER_MS`), and sets
  that as `animationDelay` inline style — paired with a CSS `signature-element` reveal
  animation (defined in `wall.css`) so signatures nearest the center fade/pop in first
  when the wall loads, radiating outward.

### Route (`src/routes/wall.tsx`)

A TanStack Start server function (`createServerFn`) fetches signatures and computes the
layout server-side at request time, so the client receives pre-positioned data via the
route loader — no client-side layout computation or waterfall fetch.

---

## Summary: data flow end-to-end

```
User draws on <canvas>
  → perfect-freehand smooths pointer points into a filled ink polygon (SVG path via getSvgPathFromStroke)
  → onChange(canvas.toDataURL())  [PNG data URL, held in a ref]
  → on submit: POST /api/signature/upload  (auth required, validates PNG data URL)
      → @vercel/blob put()  →  public blob URL
  → POST /api/guestbook/sign { message, signature: blobUrl }
      → validates, enforces one-post-per-user, inserts row
  → optimistic UI update (useSignGuestbook) + query invalidation
  → post appears in guestbook list (components/guestbook/post-card.tsx)
  → on next /wall load: getAllSignatures() picks it up
      → computeSignatureLayout() assigns it a spiral position deterministically
      → rendered as a culled, GPU-positioned <img> with staggered reveal
```
