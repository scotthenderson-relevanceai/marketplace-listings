// api/fetch-listings.js

const MARKETPLACE_BASE =
  "https://prod.marketplace.tryrelevance.com/public/listings";

// Basic HTML escaping to avoid breaking the email if there are special chars
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = async (req, res) => {
  // We only expect POST from Intercom / your automation
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse body defensively (Intercom sends JSON)
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const user = body.user || {};
    // At the moment we don't personalise by user, but we keep this for future use
    void user;

    // Build query to get TOP 5 LATEST listings
    const url = new URL(MARKETPLACE_BASE);
    url.searchParams.set("entityType", "agent");     // change to "workforce" if needed
    url.searchParams.set("orderBy", "created_at");   // latest first
    url.searchParams.set("orderDirection", "desc");
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "5");

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

    // Build HTML snippet (email-safe table layout)
    let html =
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">';

    for (const listing of results) {
      if (!listing) continue;

      const name = escapeHtml(listing.name || "");
      const desc = escapeHtml(listing.description || "");
      const image = listing.image || "";
      const displayId = listing.display_id || "";
      const listingUrl = displayId
        ? `https://marketplace.tryrelevance.com/listings/${displayId}`
        : "#";

      html += `
        <tr>
          <td width="80" valign="top" style="padding:8px 0;">
            ${
              image
                ? `<img src="${image}" alt="${name}" width="80" style="border-radius:8px; display:block;">`
                : ""
            }
          </td>
          <td valign="top" style="padding:8px 12px;">
            <strong style="font-size:14px; line-height:1.3;">${name}</strong><br>
            <span style="font-size:13px; line-height:1.4; color:#555555;">${desc}</span><br>
            <a href="${listingUrl}" style="font-size:13px; color:#3366ff;">View template →</a>
          </td>
        </tr>
      `;
    }

    html += "</table>";

    // Return as a single field for Intercom to map to a user attribute
    return res.status(200).json({
      listings_html: html
    });
  } catch (err) {
    console.error("Server error in fetch-listings:", err);
    return res
      .status(500)
      .json({ error: "Internal server error in fetch-listings" });
  }
};
