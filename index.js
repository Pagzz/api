import { createClient } from "@base44/sdk";

const SELECTED_DATAPACKS = [
  "RoofCondition",
  "Measurements",
  "PropertyAttributes",
  "Structure",
  "Imagery"
];

export default async function handler(req, res) {
  try {
    /* ======================================================
       HEALTH CHECK (GET)
       ====================================================== */
    if (req.method === "GET") {
      return res.status(200).json({
        status: "ok",
        message: "EagleView webhook API is LIVE"
      });
    }

    /* ======================================================
       ONLY ALLOW POST FOR WEBHOOK
       ====================================================== */
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    /* ======================================================
       VALIDATE PAYLOAD
       ====================================================== */
    const body = req.body;

    if (!body || !Array.isArray(body.products)) {
      return res.status(400).json({
        error: "Invalid payload structure"
      });
    }

    const { requestId, products } = body;

    /* ======================================================
       FILTER TO SELECTED DATAPACKS
       ====================================================== */
    const filteredProducts = products.filter(p =>
      SELECTED_DATAPACKS.includes(p.type)
    );

    if (filteredProducts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No relevant datapacks"
      });
    }

    /* ======================================================
       INIT BASE44 CLIENT
       ====================================================== */
    const base44 = createClient({
      apiKey: process.env.BASE44_API_KEY
    });

    /* ======================================================
       UPDATE BASE44
       ====================================================== */
    for (const product of filteredProducts) {
      if (!product.propertyId) continue;

      await base44.entities.Property.update(product.propertyId, {
        eagleview_report_id: requestId,
        eagleview_report: product,
        enrichment_status: "complete",
        last_enrichment_date: new Date().toISOString()
      });

      console.log(
        `[Base44] Updated property ${product.propertyId}`
      );
    }

    /* ======================================================
       DONE
       ====================================================== */
    return res.status(200).json({
      success: true,
      processed: filteredProducts.length
    });

  } catch (error) {
    console.error("[Webhook Error]", error);
    return res.status(500).json({
      error: error.message
    });
  }
}
