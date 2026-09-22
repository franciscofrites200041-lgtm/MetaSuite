// Google Places API v1 (New) client. Uses GOOGLE_PLACES_API_KEY. Silent
// no-op if the key isn't set (analysis still produces the SEO half).

export type PlaceDigest = {
  place_id: string;
  displayName: string | null;
  types: string[];
  address: string | null;
  rating: number | null;
  userRatingCount: number | null;
  regularHours: string | null;
  phone: string | null;
  websiteUri: string | null;
  photoCount: number;
  latestReviews: Array<{ rating: number; text: string; publishTime: string; replied: boolean }>;
};

/** Resolves a Google Maps URL (short or long) into a Place object.
 *  Returns null when the API key is missing, the URL can't be parsed,
 *  or the API refuses. */
export async function analyzePlace(mapsUrl: string): Promise<PlaceDigest | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !mapsUrl) return null;

  const placeId = await resolvePlaceId(mapsUrl, key);
  if (!placeId) return null;

  const fields = [
    "id",
    "displayName",
    "types",
    "formattedAddress",
    "rating",
    "userRatingCount",
    "regularOpeningHours",
    "nationalPhoneNumber",
    "websiteUri",
    "photos",
    "reviews",
  ].join(",");

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fields,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const p = (await res.json()) as PlaceRaw;

  return {
    place_id: placeId,
    displayName: p.displayName?.text ?? null,
    types: p.types ?? [],
    address: p.formattedAddress ?? null,
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    regularHours: p.regularOpeningHours?.weekdayDescriptions?.join("; ") ?? null,
    phone: p.nationalPhoneNumber ?? null,
    websiteUri: p.websiteUri ?? null,
    photoCount: p.photos?.length ?? 0,
    latestReviews: (p.reviews ?? []).slice(0, 5).map((r) => ({
      rating: r.rating,
      text: r.text?.text?.slice(0, 300) ?? "",
      publishTime: r.publishTime,
      // Places v1 doesn't return owner replies directly; we heuristically
      // detect based on authorAttribution === 'owner' if present later.
      replied: false,
    })),
  };
}

type PlaceRaw = {
  displayName?: { text: string };
  types?: string[];
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  photos?: Array<{ name: string }>;
  reviews?: Array<{ rating: number; text?: { text: string }; publishTime: string }>;
};

/** Turns a Maps URL into a Place ID. Handles:
 *  - shortlinks (maps.app.goo.gl/xxx) via HEAD-follow
 *  - place/... URLs with place_id= param
 *  - place/... URLs with hex CID (!1s0x...)
 *  - falls back to the Places v1 findPlaceFromText endpoint using the name
 *    slug in the URL. */
async function resolvePlaceId(mapsUrl: string, apiKey: string): Promise<string | null> {
  let url = mapsUrl.trim();

  // Expand shortlinks (maps.app.goo.gl or goo.gl/maps)
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url)) {
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000) });
      if (res.url) url = res.url;
    } catch { /* fall through */ }
  }

  // ?place_id=ChIJ... query param
  try {
    const parsed = new URL(url);
    const pid = parsed.searchParams.get("place_id");
    if (pid) return pid;
  } catch { /* fall through */ }

  // /place/<name>/data=...!1s0x<hex>:0x<hex> (Google encodes the CID here)
  // We can pass CID directly to a lookup, but v1 doesn't accept CIDs — use
  // the text search fallback.
  const nameMatch = url.match(/\/place\/([^/@?]+)/);
  const query = nameMatch ? decodeURIComponent(nameMatch[1]).replace(/\+/g, " ") : null;
  if (!query) return null;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { places?: Array<{ id: string }> };
    return j.places?.[0]?.id ?? null;
  } catch { return null; }
}
