---
name: Lake Erie Shore
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#404850'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#707881'
  outline-variant: '#bfc7d1'
  surface-tint: '#006399'
  primary: '#005d90'
  on-primary: '#ffffff'
  primary-container: '#0077b6'
  on-primary-container: '#f3f7ff'
  inverse-primary: '#94ccff'
  secondary: '#785a00'
  on-secondary: '#ffffff'
  secondary-container: '#ffc300'
  on-secondary-container: '#6d5200'
  tertiary: '#405982'
  on-tertiary: '#ffffff'
  tertiary-container: '#59729c'
  on-tertiary-container: '#f6f7ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#94ccff'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#004b74'
  secondary-fixed: '#ffdf9a'
  secondary-fixed-dim: '#f8be00'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#d6e3ff'
  tertiary-fixed-dim: '#aec7f6'
  on-tertiary-fixed: '#001b3d'
  on-tertiary-fixed-variant: '#2d476f'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Source Serif Four
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Serif Four
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Source Serif Four
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  headline-xl-mobile:
    fontFamily: Source Serif Four
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  section-padding: 80px
---

## Brand & Style

This design system is built to evoke the crisp, refreshing atmosphere of a summer morning on the north shore of Lake Erie. The brand personality is neighborly, clear, and unpretentious. It avoids the clutter of traditional "community" portals in favor of a Modern Minimalist aesthetic that incorporates subtle tactile elements—inspired by hand-carved wooden signage and the physical depth of lake waves.

The visual language prioritizes high-contrast legibility and "airy" layouts to simulate the feeling of open water and sky. The target audience includes local residents and seasonal visitors who value straightforward information presented with a sophisticated, coastal touch.

## Colors

The palette is derived directly from the lakeside environment. The **Primary Blue** (#0077B6) represents the mid-day lake water, used for main actions and navigational elements. The **Secondary Yellow** (#FFC300) acts as a high-visibility accent for notifications or primary "Call to Action" buttons, mirroring the warmth of the sun. 

The **Tertiary Navy** (#002147) provides the "Deep Blue" of the gulls and the wave shadows, used primarily for typography and heavy borders. The background remains a **Neutral White/Gray** (#F8FAFC) to ensure the 18px body text maintains maximum contrast and readability against a clean, "sandy" canvas.

## Typography

This design system utilizes a "High-Contrast Serif" for headings to provide an elegant, established feel that echoes the carved lettering of the original beach sign. **Source Serif Four** offers the necessary weight and authority for community news and headers.

For body copy, **Plus Jakarta Sans** is employed to maintain a friendly, approachable, and modern tone. Per the accessibility requirements, the base body size starts at 18px. Line heights are kept generous (1.5x minimum) to ensure long-form community updates are easy to read for all age groups. Label styles use a slight tracking increase to ensure clarity at smaller sizes.

## Layout & Spacing

The layout follows a **Fixed Grid** model on desktop, centering the content at a maximum width of 1200px to maintain a focused, readable line length. On mobile devices, the layout transitions to a fluid, single-column grid with 16px side margins.

A "breathable" rhythm is achieved through an 8px base unit. Section-to-section spacing is intentionally large (80px+) to distinguish between different types of community information (e.g., weather alerts vs. event calendars), preventing a cluttered "bulletin board" appearance.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**. Surfaces do not "float" aggressively; instead, they use very soft, diffused shadows with a slight blue tint (#002147 at 5-8% opacity) to mimic the way light hits the carved wood of the beach sign.

Deep Navy outlines (1px) are used sparingly for input fields and card borders to provide "crispness" without adding visual weight. Active states for buttons and interactive elements use a subtle inset shadow to simulate the "pressed" feel of a physical sign.

## Shapes

The shape language is **Soft**. UI elements use a 0.25rem (4px) base radius. This provides a balance between the organic, hand-hewn nature of the lakefront and the modern, digital efficiency of the website. Large containers like cards or image wrappers may use the `rounded-lg` (8px) setting to appear more inviting and less "industrial."

## Components

### Buttons
Primary buttons use the Lake Blue fill with white text. Secondary buttons utilize the Sun Yellow to draw attention to high-priority community alerts or "Join" actions. All buttons feature a 2px bottom border in a slightly darker shade of their fill color to create a tactile, carved effect.

### Cards
Cards are used for news items and event listings. They feature a white background, a 1px Navy border at 10% opacity, and a "Soft" corner radius. On hover, the ambient shadow increases slightly to lift the card toward the user.

### Input Fields
Inputs are clean and unpretentious, using the Tertiary Navy for the label and a 1px border for the field. The focus state uses a 2px Lake Blue border to clearly indicate the active area.

### Chips & Tags
Used for categorizing content (e.g., "Beach Alert," "Social," "Meeting"). These are pill-shaped with a light tint of the Primary Blue and bold Tertiary Navy text to ensure readability against the background.

### Navigation Bar
A transparent or off-white top bar that pins to the top of the viewport. It uses high-contrast Navy links in the 14px uppercase label style, ensuring the menu is always legible against varying background images of the lake.