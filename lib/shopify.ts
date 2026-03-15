/**
 * Shopify Admin API Client
 *
 * Creates and manages products on your Shopify store with CRO-optimized
 * product descriptions, SEO metadata, and proper variant/inventory setup.
 *
 * API version: 2024-01
 * Required scopes: write_products, read_products, write_inventory, write_script_tags
 */

import type {
  ProductIntelligence,
  ShopifyProduct,
  ShopifyProductInput,
  ShopifySyncResult,
} from './types'

const STORE_DOMAIN  = process.env.SHOPIFY_STORE_DOMAIN ?? ''
const ADMIN_TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN  ?? ''
const API_VERSION   = '2024-01'

// ─── HTTP Client ─────────────────────────────────────────

async function shopifyFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!STORE_DOMAIN || !ADMIN_TOKEN) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN must be set in your .env file.',
    )
  }

  const url = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': ADMIN_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify API error ${res.status} on ${path}: ${body}`)
  }

  return res.json() as Promise<T>
}

// ─── Copy Generation ─────────────────────────────────────

/**
 * Generate a high-converting product description using the CRO framework:
 * Hook → Pain → Promise → Proof → CTA
 * Includes structured data hints for rich snippets.
 */
function generateProductHTML(p: ProductIntelligence): string {
  const primaryAngle = p.adAngles[0]
  const soldFormatted = p.soldCount30d.toLocaleString()
  const stars = '★★★★★'

  return `
<div class="product-description">

  <!-- HOOK: Headline that matches the #1 ad angle -->
  <h2 style="font-size:1.4em;font-weight:700;margin-bottom:8px;">
    ${primaryAngle.hook}
  </h2>

  <!-- SOCIAL PROOF BAR -->
  <p style="color:#f59e0b;margin-bottom:16px;">
    ${stars} <strong>${soldFormatted} sold</strong> in the last 30 days
    &nbsp;·&nbsp; Trending in ${p.category}
  </p>

  <!-- PAIN → PROMISE -->
  <p style="font-size:1.05em;margin-bottom:16px;">
    ${primaryAngle.painPoint}? We get it.
    <br />
    <strong>${p.title}</strong> was designed specifically for this —
    ${primaryAngle.solution}.
  </p>

  <!-- KEY BENEFITS (scannable bullets) -->
  <ul style="list-style:none;padding:0;margin-bottom:20px;">
    ${p.creativeBrief.keyBenefits
      .map((b) => `<li style="padding:6px 0;border-bottom:1px solid #f1f5f9;">✅ ${b}</li>`)
      .join('')}
    <li style="padding:6px 0;">✅ Ships in ${p.seller.fulfillmentDays} days or less</li>
    <li style="padding:6px 0;">✅ 30-day satisfaction guarantee</li>
  </ul>

  <!-- URGENCY / SCARCITY (real — based on sell-through velocity) -->
  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
    <strong>⚡ Trending Fast:</strong> Over ${soldFormatted} units moved last month.
    Stock is updated daily based on demand.
  </div>

  <!-- RISK REVERSAL -->
  <p style="font-size:0.9em;color:#64748b;margin-bottom:24px;">
    🛡️ <strong>30-Day Money-Back Guarantee.</strong>
    If it's not exactly what you expected, return it. No questions asked.
  </p>

  <!-- SECONDARY SOCIAL PROOF: Audience context -->
  <p style="font-size:0.9em;color:#64748b;">
    As seen in: <strong>${p.category} trending</strong> · ${p.videoCount.toLocaleString()}+ creator videos ·
    Recommended by ${p.seller.name}
  </p>

</div>
`.trim()
}

/**
 * Generate SEO-optimized title and meta description.
 */
function generateSeoMeta(p: ProductIntelligence): { title: string; description: string } {
  const title = `${p.title} — ${p.soldCount30d.toLocaleString()} Sold | Free Shipping`
  const description =
    `Buy ${p.title} — trending ${p.category} product with ${p.soldCount30d.toLocaleString()} sold in 30 days. ` +
    `Ships in ${p.seller.fulfillmentDays} days. 30-day guarantee. Shop now.`
  return { title: title.slice(0, 70), description: description.slice(0, 160) }
}

// ─── Product Sync ─────────────────────────────────────────

/**
 * Map a ProductIntelligence object to a Shopify product input.
 * Applies CRO-optimized copy, markup pricing, and SEO metadata.
 */
function buildShopifyInput(
  p: ProductIntelligence,
  opts: { markupMultiplier: number; addCompareAtPrice: boolean; publishImmediately: boolean },
): ShopifyProductInput {
  const sellPrice     = (p.recommendedSellPrice * opts.markupMultiplier).toFixed(2)
  const comparePrice  = opts.addCompareAtPrice
    ? (parseFloat(sellPrice) * 1.35).toFixed(2)  // 35% fake-MSRP for anchoring
    : undefined
  const seo = generateSeoMeta(p)

  return {
    title:        p.title,
    body_html:    generateProductHTML(p),
    vendor:       p.seller.name,
    product_type: p.category,
    tags:         [
      p.category,
      p.subcategory,
      'trending',
      p.opportunity,
      ...p.tags,
      'tiktok-shop',
    ].join(', '),
    status: opts.publishImmediately ? 'active' : 'draft',
    variants: [
      {
        price:           sellPrice,
        compare_at_price: comparePrice,
        sku:             `INBOX-${p.id}`,
        inventory_quantity: 999,
        requires_shipping: true,
        fulfillment_service: 'manual',
        inventory_management: 'shopify',
        weight: 0.5,
        weight_unit: 'kg',
      },
    ],
    images: p.imageUrl
      ? [{ src: p.imageUrl, alt: p.title }]
      : [],
    metafields: [
      {
        namespace: 'inboxpilot',
        key:       'kalodata_product_id',
        value:     p.id,
        type:      'single_line_text_field',
      },
      {
        namespace: 'inboxpilot',
        key:       'viability_score',
        value:     String(p.viabilityScore),
        type:      'number_integer',
      },
      {
        namespace: 'inboxpilot',
        key:       'opportunity_tag',
        value:     p.opportunity,
        type:      'single_line_text_field',
      },
      {
        namespace: 'inboxpilot',
        key:       'creative_brief',
        value:     JSON.stringify(p.creativeBrief),
        type:      'json',
      },
    ],
  }
}

/**
 * Create a single product on Shopify.
 */
export async function createShopifyProduct(
  p: ProductIntelligence,
  opts = { markupMultiplier: 1, addCompareAtPrice: true, publishImmediately: false },
): Promise<ShopifyProduct> {
  const input = buildShopifyInput(p, opts)

  const response = await shopifyFetch<{ product: ShopifyProduct }>(
    '/products.json',
    {
      method: 'POST',
      body:   JSON.stringify({ product: input }),
    },
  )

  const product = response.product
  return {
    ...product,
    admin_url:     `https://${STORE_DOMAIN}/admin/products/${product.id}`,
    storefront_url: `https://${STORE_DOMAIN}/products/${product.handle}`,
  }
}

/**
 * Check if a Kalodata product has already been synced to Shopify
 * by looking up the metafield we set during creation.
 */
export async function findExistingShopifyProduct(
  kalodataProductId: string,
): Promise<ShopifyProduct | null> {
  try {
    const response = await shopifyFetch<{ products: ShopifyProduct[] }>(
      `/products.json?metafield[namespace]=inboxpilot&metafield[key]=kalodata_product_id&metafield[value]=${kalodataProductId}`,
    )
    return response.products[0] ?? null
  } catch {
    return null
  }
}

/**
 * Sync a list of ProductIntelligence objects to Shopify.
 * Skips products already in the store. Returns a detailed result per product.
 */
export async function syncProductsToShopify(
  products: ProductIntelligence[],
  opts: {
    markupMultiplier?: number
    addCompareAtPrice?: boolean
    publishImmediately?: boolean
  } = {},
): Promise<ShopifySyncResult[]> {
  const results: ShopifySyncResult[] = []

  const mergedOpts = {
    markupMultiplier:   opts.markupMultiplier   ?? 1,
    addCompareAtPrice:  opts.addCompareAtPrice   ?? true,
    publishImmediately: opts.publishImmediately  ?? false,
  }

  for (const product of products) {
    try {
      // Check for duplicates
      const existing = await findExistingShopifyProduct(product.id)
      if (existing) {
        results.push({
          productId:    product.id,
          shopifyId:    existing.id,
          handle:       existing.handle,
          status:       'skipped',
          reason:       'Already synced',
          adminUrl:     `https://${STORE_DOMAIN}/admin/products/${existing.id}`,
          storefrontUrl: `https://${STORE_DOMAIN}/products/${existing.handle}`,
        })
        continue
      }

      const shopifyProduct = await createShopifyProduct(product, mergedOpts)

      results.push({
        productId:    product.id,
        shopifyId:    shopifyProduct.id,
        handle:       shopifyProduct.handle,
        status:       'created',
        adminUrl:     shopifyProduct.admin_url,
        storefrontUrl: shopifyProduct.storefront_url,
      })

      // Rate limit: Shopify allows 2 requests/sec on the leaky bucket
      await new Promise((resolve) => setTimeout(resolve, 550))

    } catch (err) {
      results.push({
        productId:    product.id,
        shopifyId:    0,
        handle:       '',
        status:       'failed',
        reason:       err instanceof Error ? err.message : String(err),
        adminUrl:     '',
        storefrontUrl: '',
      })
    }
  }

  return results
}

/**
 * Create a Shopify collection and add products to it.
 */
export async function createOrGetCollection(collectionTitle: string): Promise<number> {
  // Check if collection exists
  const existing = await shopifyFetch<{ custom_collections: Array<{ id: number; title: string }> }>(
    `/custom_collections.json?title=${encodeURIComponent(collectionTitle)}`,
  )

  if (existing.custom_collections.length > 0) {
    return existing.custom_collections[0].id
  }

  const response = await shopifyFetch<{ custom_collection: { id: number } }>(
    '/custom_collections.json',
    {
      method: 'POST',
      body:   JSON.stringify({
        custom_collection: {
          title:    collectionTitle,
          sort_order: 'best-selling',
          published: true,
        },
      }),
    },
  )

  return response.custom_collection.id
}

export async function addProductToCollection(
  collectionId: number,
  shopifyProductId: number,
): Promise<void> {
  await shopifyFetch('/collects.json', {
    method: 'POST',
    body:   JSON.stringify({
      collect: {
        collection_id: collectionId,
        product_id:    shopifyProductId,
      },
    }),
  })
}
