// api/fetch-listings.js

const MARKETPLACE_BASE =
  "https://prod.marketplace.tryrelevance.com/public/listings";

// Optional: shorten very long descriptions so emails don't blow out
function truncate(str = "", max = 260) {
  const s = String(str);
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

module.exports = async (req, res) => {
  // Only allow POST (as used by Intercom Data Connector / automation)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse body defensively (Intercom sends JSON)
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const user = body.user || {};
    // Reserved for future personalisation
    void user;

    // Build query to get the 4 latest agent listings
    const url = new URL(MARKETPLACE_BASE);
    url.searchParams.set("entityType", "agent");      // change to "workforce" if you want those instead
    url.searchParams.set("orderBy", "created_at");    // latest first
    url.searchParams.set("orderDirection", "desc");
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "4");

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Marketplace API error", resp.status, text);
      return res.status(502).json({ error: "Marketplace API failed" });
    }

    const data = await resp.json();
    const results = (data && data.results) || [];
    const [l1, l2, l3, l4] = results;

    const toUrl = (l) =>
      l && l.display_id
        ? `https://marketplace.tryrelevance.com/listings/${l.display_id}`
        : "";

    const payload = {
      // Listing 1
      listing_1_name: l1?.name || "",
      listing_1_desc: truncate(l1?.description),
      listing_1_url: toUrl(l1),
      listing_1_image: l1?.image || "",

      // Listing 2
      listing_2_name: l2?.name || "",
      listing_2_desc: truncate(l2?.description),
      listing_2_url: toUrl(l2),
      listing_2_image: l2?.image || "",

      // Listing 3
      listing_3_name: l3?.name || "",
      listing_3_desc: truncate(l3?.description),
      listing_3_url: toUrl(l3),
      listing_3_image: l3?.image || "",

      // Listing 4
      listing_4_name: l4?.name || "",
      listing_4_desc: truncate(l4?.description),
      listing_4_url: toUrl(l4),
      listing_4_image: l4?.image || ""
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error("Server error in fetch-listings:", err);
    return res
      .status(500)
      .json({ error: "Internal server error in fetch-listings" });
  }
};
