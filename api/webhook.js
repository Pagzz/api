import { createClient } from "@base44/sdk";

// Datapacks you want to process
const SELECTED_DATAPACKS = [
  "RoofCondition",
  "Measurements",
  "PropertyAttributes",
  "Structure",
  "Imagery",
  "Risk",
  "Parcel",
  "RoofGeometry",
  "Obstructions"
];

export default async function handler(req, res) {
  try {
    // Health check for GET
    if (req.method !== "POST") {
      return res.status(200).json({ status: "ok" });
    }

    const body = req.body;

    if (!body || !Array.isArray(body.products)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { requestId, products } = body;

    // Filter only datapacks we want
    const filtered = products.filter(p => SELECTED_DATAPACKS.includes(p.type));

    // Initialize Base44 client
    const base44 = createClient({
      apiKey: process.env.BASE44_API_KEY
    });

    let processedCount = 0;

    for (const product of filtered) {
      if (!product.propertyId) {
        console.warn("[Webhook Warning] Missing propertyId for product:", product);
        continue;
      }

      try {
        // Update property in Base44
        await base44.entities.Property.update(product.propertyId, {
          eagleview_report_id: requestId,
          eagleview_report: product,
          enrichment_status: "complete",
          last_enrichment_date: new Date().toISOString()
        });
        processedCount++;
      } catch (err) {
        console.error(`[Base44 Error] Could not update property ${product.propertyId}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      processed: processedCount
    });

  } catch (err) {
    console.error("[Webhook Error]", err);
    return res.status(500).json({ error: err.message });
  }
}
