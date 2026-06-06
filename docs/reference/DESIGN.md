---
name: Sophisticated Coastal
colors:
  surface: "#f7fafc"
  surface-dim: "#d7dadc"
  surface-bright: "#f7fafc"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f1f4f6"
  surface-container: "#ebeef0"
  surface-container-high: "#e5e9eb"
  surface-container-highest: "#e0e3e5"
  on-surface: "#181c1e"
  on-surface-variant: "#42474e"
  inverse-surface: "#2d3133"
  inverse-on-surface: "#eef1f3"
  outline: "#72787e"
  outline-variant: "#c2c7ce"
  surface-tint: "#366285"
  primary: "#00253b"
  on-primary: "#ffffff"
  primary-container: "#003b5c"
  on-primary-container: "#7aa5cc"
  inverse-primary: "#a0cbf3"
  secondary: "#7d5700"
  on-secondary: "#ffffff"
  secondary-container: "#feb71a"
  on-secondary-container: "#6b4b00"
  tertiary: "#00253a"
  on-tertiary: "#ffffff"
  tertiary-container: "#103b56"
  on-tertiary-container: "#80a5c5"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#cce5ff"
  primary-fixed-dim: "#a0cbf3"
  on-primary-fixed: "#001d31"
  on-primary-fixed-variant: "#1a4a6c"
  secondary-fixed: "#ffdeaa"
  secondary-fixed-dim: "#ffba2c"
  on-secondary-fixed: "#271900"
  on-secondary-fixed-variant: "#5f4100"
  tertiary-fixed: "#cbe6ff"
  tertiary-fixed-dim: "#a5cbec"
  on-tertiary-fixed: "#001e30"
  on-tertiary-fixed-variant: "#234a66"
  background: "#f7fafc"
  on-background: "#181c1e"
  surface-variant: "#e0e3e5"
typography:
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1.2"
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: "600"
    lineHeight: "1.3"
  headline-sm:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: "600"
    lineHeight: "1.4"
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.6"
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.5"
  label-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: "600"
    lineHeight: "1"
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: "500"
    lineHeight: "1"
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1280px
---

## Brand & Style

The design system is rooted in a "Sophisticated-Coastal" aesthetic. It balances the rugged, organic beauty of the Great Lakes with a polished, professional clarity. The target audience includes modern travelers, local residents, and maritime professionals who value reliability and warmth.

The style is **Corporate / Modern**. It avoids the clichés of tropical nautical themes, opting instead for a temperate, editorial feel. The UI should evoke a sense of a clear horizon: expansive, breathable, and structured. High-quality whitespace is used to emphasize content, while vibrant accents provide energy without overwhelming the functional requirements of the interface.

## Colors

This design system utilizes a palette drawn from the aging hand painted sign that is at the beginning of the long private road, and captured in workspaces/app/src/files/waneeta-beach-entrance-signx800.jpg

- **Primary (Deep Wave):** A high-contrast, authoritative navy used for headers, primary actions, and navigational anchors.
- **Secondary (Sunlit Sand):** A vibrant, warm yellow used sparingly for high-priority calls to action, notifications, or active states to ensure they "pop" against the cool palette.
- **Tertiary (Lake Mist):** A muted, mid-tone blue for secondary iconography, borders, and decorative elements.
- **Neutral (Pebble & Shore):** A range of off-whites and cool greys that provide the structural foundation. Surfaces should use a warm white to maintain the "coastal" warmth rather than a clinical pure white.

## Typography

The typographic hierarchy creates a dialogue between tradition and modernity. **Source Serif 4** provides an editorial, authoritative voice for headlines, reminiscent of classic maritime logs and prestigious news outlets. Its high readability and sturdy character evoke a sense of history and trust.

**Work Sans** serves as the functional workhorse. It is a grounded, neutral sans-serif that ensures clarity in data-heavy views and long-form body copy. Labels and navigational items should utilize the medium or semi-bold weights of Work Sans with slight letter-spacing to improve scannability in dense layouts.

## Layout & Spacing

The design system employs a **Fixed Grid** model for desktop to ensure a curated, editorial experience, while transitioning to a fluid layout for mobile devices.

- **Desktop:** 12-column grid with 24px gutters. The layout is centered with a max-width of 1280px to prevent excessive line lengths in the typography.
- **Mobile:** Single column with 16px side margins.
- **Rhythm:** All vertical spacing must be a multiple of the 8px base unit. Section-level spacing should be generous (80px–120px) to allow the "breathable" coastal feeling to manifest through white space.

## Elevation & Depth

To modernize the roadside-sign inspiration, this design system replaces flat colors with **Ambient Shadows** and **Tonal Layers**.

Hierarchy is established by stacking surfaces. Backgrounds are the lowest layer (Neutral 50), while cards and containers sit on "Level 1" elevation. Shadows should be extra-diffused with a low opacity (8-12%) and a slight tint of the Primary color (#003B5C) to create a more natural, environmental depth rather than a muddy grey.

Subtle backdrop blurs (10px–20px) may be used on sticky navigation bars or modal overlays to simulate the misty quality of the lake shore without sacrificing legibility.

## Shapes

The shape language is defined as **Rounded**. This softens the professional tone, making the UI feel more approachable and "warm" as requested.

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Hero sections or prominent feature cards use 1rem (16px) to emphasize the modern, friendly aesthetic.
- **Iconography:** Should follow a "soft-corner" geometric style, matching the 2px–3px stroke weights used in the neutral UI borders.

## Components

### Buttons

All buttons use **subtle rounded corners** (`border-radius: 1rem / 16px`) for a polished, modern appearance that feels approachable without the full pill-shape aesthetic.

**Primary Buttons** — `.button`

- Background: `var(--color-primary)` (Deep Wave Navy #00253b)
- Text: `var(--color-on-primary)` (White)
- Border radius: 1rem (16px) — subtle, not full-pill
- Min height: 48px (touch target)
- Padding: 8px (vertical) × 16px (horizontal) — `var(--space-2) × var(--space-3)`
- Font: 14px / 0.875rem, weight 600, letter-spacing 0.02em (label-md)
- Used for: Form submissions, primary CTAs ("Post Message", "Sign In", "Create Account")
- Hover state: Opacity 0.85

**Secondary Buttons** — `.button.outline`

- Background: Transparent
- Border: 1px solid `var(--color-primary)`
- Text: `var(--color-primary)`
- Border radius: 1rem (16px) — matches primary styling
- Same sizing, padding, and hover as primary
- Used for: Cancellations, back actions, alternative paths ("Cancel", "Back to Messages")

**Button Groups & Spacing**

- Single action buttons: Right-aligned by default (desktop)
- Multiple buttons: Right-aligned with 16px gap (`var(--space-3)`)
- Mobile: Stack vertically (flex-direction: column, flex: 1 width) only if needed for space
- **Never stretch buttons to fill horizontal space on desktop.** Keep them compact and intentional.

**Icon + Text Buttons**

- Icon size: 20px
- Icon margin from text: 0.5em
- Example: "New Message" button with add_circle icon
- Icons use Material Symbols Outlined

**Example HTML**

```html
<!-- Primary button -->
<button type="submit" class="button">Post Message</button>

<!-- Secondary button -->
<button type="reset" class="button outline">Cancel</button>

<!-- Link styled as button -->
<a href="/login" class="button">Sign In</a>

<!-- Icon + text button -->
<button id="new-message" class="button">
  <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
  New Message
</button>
```

### Cards

Cards are the primary container for content. They feature a white background, a very thin 1px border in a light-blue neutral tint, and a Level 1 ambient shadow. Padding inside cards should be generous (min 24px).

### Input Fields

Inputs use a light grey background with a subtle bottom-border in the Tertiary blue. When focused, the border transitions to Primary blue with a soft glow effect.

### Chips & Tags

Used for categories (e.g., "Dining," "Public Beach"). These should use the Tertiary blue at a very low opacity (10%) with darker text to maintain a soft, professional look.

### Lists

Lists use clean dividers (1px) with ample vertical padding (16px). Hover states should utilize a very pale Sunlit Sand tint to provide a warm, interactive feedback loop.
