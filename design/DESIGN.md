---
name: Clinical Excellence Framework
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f4944'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
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
  tertiary: '#344f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#476900'
  on-tertiary-container: '#aded3e'
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
  tertiary-fixed: '#b6f647'
  tertiary-fixed-dim: '#9bd929'
  on-tertiary-fixed: '#121f00'
  on-tertiary-fixed-variant: '#344e00'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
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
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  stack-sm: 4px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
This design system is engineered for professional academic medical research, balancing the institutional prestige of UAB with the editorial clarity of top-tier scientific journals like Nature. The brand personality is authoritative, meticulous, and transparent. It avoids decorative "AI-generated" aesthetics in favor of a structural, information-first approach.

The design style is **Corporate / Modern** with a focus on high-density information management. It utilizes a sophisticated "White Space First" philosophy to ensure complex medical data remains legible and reduces cognitive load for researchers and clinicians.

## Colors
The palette is rooted in a deep "Academic Green" to establish trust and institutional heritage. 
- **Primary & Dark Green:** Used for core branding, primary actions, and navigational headers.
- **Light Green Accent:** Reserved for success states, active progress indicators, and subtle highlights in data visualization.
- **Gold Accent:** Used exclusively as a "low-frequency" signal for high-importance alerts or special academic designations (e.g., featured research).
- **Surface Colors:** Pure white (#FFFFFF) is the primary work surface. Light gray (#F8F9FA) is used for section differentiation and background containers to group related research parameters.

## Typography
Inter is the exclusive typeface for this design system, chosen for its exceptional legibility in data-dense environments. 
- **Headlines:** Use tighter letter spacing and semi-bold weights to create a strong visual anchor for research papers and study titles.
- **Body Text:** Standard weight (400) with a generous line height (1.5x) to facilitate long-form reading of clinical abstracts and methodology.
- **Labels:** Small caps or uppercase with increased tracking (0.05em) should be used for metadata, such as DOI numbers, publication dates, and author tags.

## Layout & Spacing
The layout follows a **Fixed Grid** model on desktop, centered to create an editorial feel reminiscent of a scientific journal.
- **Grid:** A 12-column grid with 24px gutters.
- **Vertical Rhythm:** A strict 8px baseline grid ensures alignment across multi-column data views.
- **Breakpoints:** 
  - Mobile (<600px): 4 columns, 16px margins.
  - Tablet (600px - 1024px): 8 columns, 32px margins.
  - Desktop (>1024px): 12 columns, max-width 1280px.
- **White Space:** Use "Stack-LG" (32px) between major research sections and "Stack-MD" (16px) between elements within a card.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Low-contrast Outlines** rather than heavy shadows.
- **Level 0 (Background):** #F8F9FA.
- **Level 1 (Cards/Surface):** #FFFFFF with a 1px solid border (#E9ECEF).
- **Level 2 (Hover/Active):** A very soft, diffuse ambient shadow (0px 4px 12px rgba(0,0,0,0.05)) to indicate interactivity without breaking the flat academic aesthetic.
- **Depth Cues:** Use the Primary Green (#1E6B52) as a 2px top-border on cards to signify categorized content or "featured" research modules.

## Shapes
The shape language is **Soft** (4px / 0.25rem). This subtle rounding provides a modern touch while maintaining a professional, serious tone. 
- **Buttons & Inputs:** 4px border radius.
- **Cards:** 8px (rounded-lg) to provide clear container definition.
- **Data Tags/Chips:** Fully rounded (pill) to distinguish them from actionable buttons.

## Components
- **Academic Cards:** White background, 1px border (#E9ECEF), 8px radius. Include a 4px accent top-border in Primary Green for active studies.
- **Primary Buttons:** Solid Primary Green (#1E6B52) with white text. No gradients.
- **Secondary Buttons:** Ghost style with 1px border (#1E6B52) and Primary Green text.
- **Input Fields:** 1px border (#DEE2E6), 4px radius. Use Inter Body-MD. On focus, border changes to Primary Green with a 2px soft outer glow.
- **Data Visualizations:** Use a palette of Primary Green, Secondary Green, and Light Green. Avoid high-contrast clashing colors; use tonal variations for chart series.
- **Navigation:** Top-tier global nav in Dark Green (#144B39). Secondary "Breadcrumb" navigation in Gray for deep-link research hierarchies.
- **Status Indicators:** Use Light Green (#88C408) for "Open/Active" and Gold (#FFD602) for "Pending Review" or "Urgent Attention."