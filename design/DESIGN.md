---
name: Institutional Research & Editorial
colors:
  surface: '#f7faf6'
  surface-dim: '#d8dbd7'
  surface-bright: '#f7faf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f0'
  surface-container: '#ecefeb'
  surface-container-high: '#e6e9e5'
  surface-container-highest: '#e0e3df'
  on-surface: '#181c1a'
  on-surface-variant: '#3f4944'
  inverse-surface: '#2d312f'
  inverse-on-surface: '#eff1ed'
  outline: '#6f7974'
  outline-variant: '#bfc9c2'
  surface-tint: '#1d6a51'
  primary: '#00523c'
  on-primary: '#ffffff'
  primary-container: '#1e6b52'
  on-primary-container: '#9ee9c9'
  inverse-primary: '#8cd5b7'
  secondary: '#346854'
  on-secondary: '#ffffff'
  secondary-container: '#b4ecd3'
  on-secondary-container: '#386c58'
  tertiary: '#733430'
  on-tertiary: '#ffffff'
  tertiary-container: '#904b46'
  on-tertiary-container: '#ffcec9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a7f2d2'
  primary-fixed-dim: '#8cd5b7'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#b7eed5'
  secondary-fixed-dim: '#9cd2ba'
  on-secondary-fixed: '#002116'
  on-secondary-fixed-variant: '#1a503d'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#3a0908'
  on-tertiary-fixed-variant: '#723430'
  background: '#f7faf6'
  on-background: '#181c1a'
  surface-variant: '#e0e3df'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system is engineered for high-trust academic environments, balancing the institutional authority of a research university with the crisp editorial clarity of a scientific journal. It is designed to facilitate complex navigation through research data and roadmaps without overwhelming the user.

The aesthetic follows a **Modern Corporate** style with an **Editorial** influence. This is achieved through generous white space, precise grid alignment, and a sophisticated green-dominant palette. The interface should feel structured and stable, evoking a sense of reliability and peer-reviewed quality. Every element is prioritized for legibility and clarity, ensuring that the "Navigator" function remains the primary focus.

## Colors
The palette is rooted in a spectrum of greens to establish an institutional identity. 

- **Primary Green (#1E6B52):** Used for key headers, primary actions, and navigational anchors. 
- **Secondary Dark Green (#144B39):** Reserved for deep hierarchy levels, footer backgrounds, and high-contrast text.
- **Accent Light Green (#88C408):** Used for progress indicators, success states, and secondary visual interest.
- **Highlight Gold (#FFD602):** A high-visibility color used strictly for hover states on primary buttons or critical status alerts to ensure attention is drawn only when necessary.
- **Neutral/Background:** The design system utilizes a pure white (#FFFFFF) for main content areas and a soft light gray (#F8F9FA) for subtle surface differentiation, such as sidebars or card containers.

## Typography
The design system relies exclusively on **Inter** to maintain a modern, utilitarian, and highly legible experience across all data densities.

- **Headlines:** Use tighter letter-spacing and heavier weights to create a strong visual anchor for research sections.
- **Body Text:** Optimized for long-form reading with a generous line height (1.5x) to mirror the clarity of editorial journals.
- **Labels:** Small labels utilize semi-bold weights and slight tracking increases to maintain legibility in UI metadata and pill badges.
- **Hierarchy:** Contrast is established through weight and color (Primary Green for headers, Main Text for body) rather than excessive font mixing.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop screens to preserve the editorial "container" feel, while transitioning to a fluid model for mobile devices.

- **Desktop:** 12-column grid with a max-width of 1280px. Gutters are set to 24px to provide clear separation between data columns.
- **Mobile/Tablet:** Gutters shrink to 16px, and margins reduce to 20px. 
- **Rhythm:** An 8px baseline grid governs all vertical rhythm. Components should use 24px (md) or 40px (lg) padding to ensure a breathable, non-claustrophobic feel, even when displaying dense academic tables.

## Elevation & Depth
Depth in the design system is handled through **Subtle Ambient Shadows** and **Tonal Layering**. 

- **Surface Levels:** The primary background is white. Secondary areas (sidebars, metadata panels) use the neutral light gray surface.
- **Cards:** Elevated cards use a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)) to suggest they are interactive without appearing "heavy" or skeuomorphic. 
- **Interactions:** On hover, cards may transition to a slightly deeper shadow or a 1px Primary Green border to indicate focus. Shadows should never use high-contrast blacks; instead, use slightly tinted grays to keep the UI feeling airy.

## Shapes
The shape language is structured but approachable, using a standardized corner radius to soften the academic rigor.

- **Standard Elements (8px):** Applied to buttons, input fields, and pill badges. This provides a modern, professional look.
- **Container Elements (12px):** Applied to academic cards and main content modules. The larger radius on larger components creates a clearer visual containment.
- **Full Rounding:** Reserved exclusively for progress tracks and "Roadmap Pins" to distinguish them from standard interactive buttons.

## Components
Consistent component styling reinforces the authoritative tone of the design system.

- **Academic Cards:** Use 12px rounding, a white background, and a subtle 1px border (#E9ECEF). The header of the card should use Primary Green for the title.
- **Pill Badges:** Small, 8px rounded containers with a background tint of Primary or Accent green (10% opacity) and high-contrast text. Used for status or category tags.
- **Clean Data Tables:** No vertical borders. Use 1px horizontal dividers. The header row should have a light gray background and use the `label-sm` typography style for column titles.
- **Roadmap Pins:** Circular indicators with Primary Green fills. Active pins should feature a soft glow effect or a secondary rings to indicate the user's current progress.
- **Buttons:** Primary buttons use the Primary Green background with white text. Hover states transition to Secondary Green or utilize a subtle Highlight Gold underline/glow if an urgent call-to-action is required.
- **Input Fields:** Minimalist with an 8px radius. Focus states use a 2px Primary Green border with no heavy outer glow.