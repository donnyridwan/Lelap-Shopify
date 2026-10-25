# Lelap — Shopify theme

Online Store 2.0 theme for **lelap** (doctor-guided sleep gummies), built 1:1 from the Figma file
[`lelap — All Screens`](https://www.figma.com/design/qTxp75F4TEBAM7fE0QKjDk/Untitled?node-id=86-551).

- Liquid sections + JSON templates (every page is editable in the theme editor).
- Desktop (1440 / 1920), tablet (768) and mobile (390) layouts from the design.
- Design tokens from the Figma variables (`assets/base.css`), Figtree + Fraunces fonts, the full Figma icon set (`snippets/icon.liquid`).
- Real product content: the four formulas from the design (Sleep Classic, Sleep Deep, Sleep Reset, Sleep Calm).
  If a product has no images or metafields yet, the theme falls back to the Figma photos and copy for that handle
  (`snippets/product-fact.liquid`, `snippets/product-image.liquid`), so nothing ever renders as a placeholder.

## Install

1. Upload the theme: zip this folder (or connect the GitHub repo in **Online Store → Themes → Add theme → Connect from GitHub**),
   or with the Shopify CLI:
   ```bash
   shopify theme push --store your-store.myshopify.com --unpublished
   ```
2. Import the products: **Products → Import → `import/products.csv`**. The handles must stay
   `sleep-classic`, `sleep-deep`, `sleep-reset`, `sleep-calm` (the theme uses them for the Figma copy and images).
   Add the pouch photos from `assets/pouch-sleep-*.jpg` as product media (or upload your high-res originals).
3. Subscriptions: install a subscription app (Shopify Subscriptions, Recharge, …) and create a "Subscribe & save 20%"
   selling plan for the four products. The theme shows the selling-plan price ($28 / $34 / $24 / $27) next to the
   one-time price ($35 / $42 / $30 / $34), exactly like the design; without a plan it shows 80% of the price.
4. Create the pages (Online Store → Pages) and assign the template:

   | Page | Handle | Template |
   |---|---|---|
   | (see "Pages" section below — filled in after the build) | | |

5. Navigation (optional): the header and footer already contain the design's links. To manage them from the admin,
   create menus and select them in **Theme settings → Header / Footer**.

## Development

```bash
shopify theme dev --store your-store.myshopify.com   # live preview
shopify theme check                                   # lint
python3 scripts/build_template.py templates/index.json hero social-proof ...   # rebuild a template from section presets
```

## What is not part of a theme

Checkout, payment (3-D Secure) and the order-status page are hosted by Shopify and can't be themed
(Checkout Extensibility on Shopify Plus covers branding there). Subscription management screens
(skip, pause, change formula, change date, cancel) come from the subscription app's customer portal.
