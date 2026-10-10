import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SlidersHorizontal, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Reveal } from "@/components/Reveal";
import { roomScenes } from "@/data/catalog";
import { getProduct } from "@/data/products";
import { formatPrice } from "@/lib/format";
import type { RoomType } from "@/data/types";

const searchSchema = z.object({
  room: fallback(z.string().optional(), undefined),
  style: fallback(z.string().optional(), undefined),
  sort: fallback(z.enum(["featured", "price-asc", "price-desc", "pieces"]), "featured").default("featured"),
  max: fallback(z.number().optional(), undefined),
});

interface SceneMeta {
  slug: string;
  name: string;
  description: string;
  image: string;
  room: RoomType;
  styles: string[];
  price: number;
  pieces: number;
}

function computeSceneMeta(): SceneMeta[] {
  return roomScenes.map((scene) => {
    const products = scene.productSlugs.map(getProduct).filter(Boolean);
    const rooms = products.map((p) => p!.room);
    const roomCounts = new Map<RoomType, number>();
    rooms.forEach((r) => roomCounts.set(r, (roomCounts.get(r) || 0) + 1));
    const dominantRoom = Array.from(roomCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "home-decor";
    const styles = Array.from(new Set(products.map((p) => p!.style)));
    const price = products.reduce((sum, p) => sum + (p!.salePrice ?? p!.price), 0);
    return {
      slug: scene.slug,
      name: scene.name,
      description: scene.description,
      image: scene.image,
      room: dominantRoom,
      styles,
      price,
      pieces: products.length,
    };
  });
}

const ALL_STYLES = ["Contemporary", "Minimalist", "Mid-century", "Modern", "Scandinavian"];
const ROOM_LABELS: Record<RoomType, string> = {
  "living-room": "Living Room",
  bedroom: "Bedroom",
  "dining-room": "Dining Room",
  office: "Home Office",
  outdoor: "Outdoor",
  "home-decor": "Home Decor",
};

export const Route = createFileRoute("/rooms/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Shop the Room — NordHaus Living" },
      { name: "description", content: "Browse curated, shoppable room inspiration. Filter by room type, style and price to find your perfect look." },
      { property: "og:title", content: "Shop the Room — NordHaus Living" },
      { property: "og:description", content: "Browse curated, shoppable room inspiration." },
    ],
    links: [{ rel: "canonical", href: "/rooms" }],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const sp = Route.useSearch();
  const navigate = Route.useNavigate();
  const [maxPrice, setMaxPrice] = useState(sp.max ?? 8000);
  const sceneMeta = useMemo(() => computeSceneMeta(), []);

  const filtered = useMemo(() => {
    let list = [...sceneMeta];
    if (sp.room) list = list.filter((s) => s.room === sp.room);
    if (sp.style) { const style = sp.style; list = list.filter((s) => s.styles.includes(style)); }
    list = list.filter((s) => s.price <= maxPrice);
    switch (sp.sort) {
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "pieces": list.sort((a, b) => b.pieces - a.pieces); break;
    }
    return list;
  }, [sp, maxPrice, sceneMeta]);

  const setParam = (key: string, value: string | undefined) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, [key]: value || undefined }) });

  const filters = (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Room Type</legend>
        <div className="space-y-2">
          {Object.entries(ROOM_LABELS).map(([slug, label]) => (
            <label key={slug} className="flex items-center gap-2 text-sm">
              <Checkbox checked={sp.room === slug} onCheckedChange={(v) => setParam("room", v ? slug : undefined)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Style</legend>
        <div className="space-y-2">
          {ALL_STYLES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <Checkbox checked={sp.style === s} onCheckedChange={(v) => setParam("style", v ? s : undefined)} />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Max price: {formatPrice(maxPrice)}</legend>
        <Slider min={500} max={8000} step={100} value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} />
      </fieldset>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold">Shop the Room</h1>
      <p className="mt-1 text-sm text-muted-foreground">{filtered.length} curated rooms</p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 lg:hidden">
              <SlidersHorizontal className="size-4" /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetTitle className="mb-4">Filters</SheetTitle>
            {filters}
          </SheetContent>
        </Sheet>
        <div className="ml-auto">
          <Select value={sp.sort} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="pieces">Most Pieces</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">{filters}</aside>
        <div>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No rooms match your filters.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/rooms" search={{ sort: "featured" }}>Clear filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((scene, i) => (
                <Reveal key={scene.slug} delay={(i % 3) * 0.06}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={scene.image}
                        alt={scene.name}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-4 text-background">
                        <span className="text-xs font-medium uppercase tracking-wider text-background/80">{ROOM_LABELS[scene.room]}</span>
                        <h3 className="mt-1 font-display text-xl font-semibold">{scene.name}</h3>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="line-clamp-2 text-sm text-muted-foreground">{scene.description}</p>
                      <div className="mt-4 flex items-center gap-3 text-sm">
                        <span className="font-medium text-foreground">{formatPrice(scene.price)}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{scene.pieces} pieces</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {scene.styles.slice(0, 3).map((s) => (
                          <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{s}</span>
                        ))}
                      </div>
                      <div className="mt-auto pt-4">
                        <Button asChild className="w-full">
                          <Link to="/rooms/$slug" params={{ slug: scene.slug }}>
                            Shop the room <ArrowRight className="size-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
