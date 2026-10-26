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
   | About | `about` | `page.about` |
   | Science & doctors | `science-doctors` | `page.science` |
   | Help center | `help` | `page.help` |
   | Refund request | `refund-request` | `page.refund` |
   | Terms of service | `terms-of-service` | `page.terms` |
   | Telehealth consent | `telehealth-consent` | `page.telehealth` |
   | Sleep quiz | `sleep-quiz` | `page.quiz` |
   | Care team (account) | `care-team` | `page.account-care-team` |
   | Profile & health (account) | `profile-health` | `page.account-profile` |

   Also create a blog **Sleep library** with handle `sleep-library` (templates `blog` / `article`) and tag articles
   *Falling asleep, Staying asleep, Travel & shifts, Stress & mind, Melatonin 101* for the topic filters.
   Use **classic customer accounts** (Settings → Customer accounts) so the designed account pages are used.

5. Navigation (optional): the header and footer already contain the design's links. To manage them from the admin,
   create menus and select them in **Theme settings → Header / Footer**.

## Optional data (metafields, namespace `lelap`)

Everything renders with the Figma copy by default. To edit per product/customer/order without touching code:

- **Product:** `code`, `tagline`, `badge`, `card_desc`, `rating`, `reviews`, `dose`, `intro`, `highlights`, `benefits`,
  `facts`, `doctor_note`, `when_to_take`, … (see `snippets/product-fact.liquid` and `snippets/product-fact-pdp.liquid`).
- **Order tags** drive the doctor-review states: `doctor-needs-info`, `not-approved`, `doctor-approved`, `delivered`.
  Optional order metafields: `doctor_question`, `doctor_decision`, `approved_at`, `eta`.
- **Customer:** `doctor_name`, `doctor_photo`, `doctor_status`, `doctor_note`, `next_delivery`, `care_messages` (JSON),
  `plan_formula`, `plan_when`, `dob`, `medication`, `conditions`, `allergies`, …
- **Article:** `read_time`, `reviewer`, `reviewer_role`.
- Set the subscription app's customer-portal URL in **Account overview → Subscription portal link**
  (skip / pause / change formula / change date / cancel open it).

## Before launch

- Replace the design's draft copy: "[F]" / "[Founder name]" (About), the legal notice on Terms, "BPOM reg. no. to be added".
- Have a doctor review the sleep-quiz questions and health-screening rules (8 of the 10 questions were written to fit
  the design, which only shows two of them).
- Images were exported from Figma at 1x (the build environment couldn't download originals). Upload high-res
  originals via the image settings in the theme editor and as product media.

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
