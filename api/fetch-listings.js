const MARKETPLACE_BASE =
  "https://prod.marketplace.tryrelevance.com/public/listings";

module.exports = async (req, res) => {
  // Only allow POST from Intercom
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const user = body.user || {};
    const email = user.email || null;
    const company = user.company || null;

    // Build Marketplace query
    const url = new URL(MARKETPLACE_BASE);
    url.searchParams.set("entityType", "agent");
    url.searchParams.set("orderBy", "clone_count");
    url.searchParams.set("orderDirection", "desc");
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "3");

    // Optional: personalise by email domain / company if your API supports tags
    // if (company) {
    //   url.searchParams.set("tag", company.toLowerCase());
    // } else if (email && email.includes("@")) {
    //   const domain = email.split("@")[1];
    //   url.searchParams.set("tag", domain.split(".")[0]);
    // }

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
    const [l1, l2, l3] = results;

    const listingUrl = (l) =>
      l && l.display_id
        ? `https://marketplace.tryrelevance.com/listings/${l.display_id}`
        : "";

    const payload = {
      listing_1_name: l1?.name || "",
      listing_1_desc: l1?.description || "",
      listing_1_url: listingUrl(l1),
      listing_1_image: l1?.image || "",

      listing_2_name: l2?.name || "",
      listing_2_desc: l2?.description || "",
      listing_2_url: listingUrl(l2),
      listing_2_image: l2?.image || "",

      listing_3_name: l3?.name || "",
      listing_3_desc: l3?.description || "",
      listing_3_url: listingUrl(l3),
      listing_3_image: l3?.image || ""
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error("Server error in fetch-listings:", err);
    return res
      .status(500)
      .json({ error: "Internal server error in fetch-listings" });
  }
};
