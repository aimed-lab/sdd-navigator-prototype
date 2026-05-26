---
name: Clinical Intelligence Horizon
colors:
  surface: '#0e1322'
  surface-dim: '#0e1322'
  surface-bright: '#343949'
  surface-container-lowest: '#090e1c'
  surface-container-low: '#161b2b'
  surface-container: '#1a1f2f'
  surface-container-high: '#25293a'
  surface-container-highest: '#2f3445'
  on-surface: '#dee1f7'
  on-surface-variant: '#b9caca'
  inverse-surface: '#dee1f7'
  inverse-on-surface: '#2b3040'
  outline: '#849495'
  outline-variant: '#3a494a'
  surface-tint: '#00dce5'
  primary: '#e9feff'
  on-primary: '#003739'
  primary-container: '#00f5ff'
  on-primary-container: '#006c71'
  inverse-primary: '#00696e'
  secondary: '#d1bcff'
  on-secondary: '#3c0090'
  secondary-container: '#7000ff'
  on-secondary-container: '#ddcdff'
  tertiary: '#faf9ff'
  on-tertiary: '#002b75'
  tertiary-container: '#d3dcff'
  on-tertiary-container: '#0057db'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#63f7ff'
  primary-fixed-dim: '#00dce5'
  on-primary-fixed: '#002021'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d1bcff'
  on-secondary-fixed: '#23005b'
  on-secondary-fixed-variant: '#5700c9'
  tertiary-fixed: '#dae1ff'
  tertiary-fixed-dim: '#b3c5ff'
  on-tertiary-fixed: '#001849'
  on-tertiary-fixed-variant: '#003fa4'
  background: '#0e1322'
  on-background: '#dee1f7'
  surface-variant: '#2f3445'
  glass-surface: rgba(255, 255, 255, 0.03)
  glass-border: rgba(255, 255, 255, 0.1)
  data-mono: '#94a3b8'
  status-pulse: '#00f5ff'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  max-width: 1440px
---

## Brand & Style
The brand personality is authoritative, visionary, and hyper-precise. It operates at the intersection of life sciences and advanced computation, evoking the feeling of a "Mission Control for Human Biology." The target audience consists of clinical researchers and data scientists who require high-density information without sacrificing clarity.

The design style is a hybrid of **Glassmorphism** and **Corporate Modern**, infused with a **Sci-Fi** technical layer. The interface utilizes depth through translucent surfaces and "glowing" light sources to guide the eye toward critical medical insights. The atmosphere is quiet, focused, and sterile, yet intellectually stimulating.

## Colors
The palette is rooted in a deep, nocturnal base of #0a0f1e to reduce eye strain during long research sessions. The **Medical Cyan (#00f5ff)** acts as the primary signature color, used for interactive elements and "active" AI states. 

A secondary deep violet and tertiary blue provide depth for data visualization categories. The "Glass Surface" color is a low-opacity white that interacts with the background gradients to create the frosted medical glass effect. High-contrast white is reserved strictly for primary reading paths and critical labels.

## Typography
The typography system uses a tri-font approach to maximize the "technical but readable" requirement. 
- **Hanken Grotesk** is used for headlines, providing a sharp, modern, and clinical Swiss-inspired look.
- **Inter** handles the heavy lifting for body text, ensuring maximum legibility for dense research papers and findings.
- **JetBrains Mono** is the "Technical Accent" font, used for DNA sequences, coordinates, medical IDs, and status indicators. This adds a layer of precision and helps differentiate raw data from narrative content.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy within a max-width container. A 12-column grid is used for the dashboard views, allowing cards to span 3, 4, 6, or 12 columns. 

Large margins on desktop (64px) create a premium, spacious feel, while the 24px gutter ensures that complex data cards have enough "air" to be scanned individually. On mobile, the system collapses to a single-column stack with 16px margins. Components should prioritize vertical rhythm using increments of 8px (base unit).

## Elevation & Depth
Depth is created through **Glassmorphism** rather than traditional drop shadows. 
1.  **Level 0 (Background):** Deep navy with subtle radial gradients of medical blue in the corners.
2.  **Level 1 (Sub-surface):** Subtle DNA/Molecule grid patterns at 5% opacity.
3.  **Level 2 (Containers):** Semi-transparent surfaces (3-5% white) with a 20px backdrop blur and a thin 1px border (glass-border).
4.  **Level 3 (Active/Interactive):** Elements that are hovered or active receive an outer glow (box-shadow) using the primary cyan color at low opacity to simulate a "lit" display.

## Shapes
The shape language is "Soft" (0.25rem - 0.75rem) to maintain a professional, scientific rigor. Sharp corners are avoided to keep the UI feeling approachable, but excessive rounding is also avoided to prevent it from looking "toy-like." Large cards use 0.75rem (`rounded-xl`), while small UI elements like input fields and buttons use 0.25rem (`rounded-sm`).

## Components
### Buttons & Controls
Buttons use a solid Primary Cyan fill with black text for high contrast. Secondary buttons use a "Ghost" style with a cyan border and a subtle hover glow. All interactive controls should have a 150ms ease-in-out transition for their glow states.

### Glass Data Cards
The core component of the system. Cards must have a `backdrop-filter: blur(20px)` and a `border: 1px solid rgba(255,255,255,0.1)`. Headers within cards should use the `data-label` monospace font for a "readout" effect.

### Pulsing Status Indicators
For AI processing states, use a small 8px circle with a `status-pulse` color. Apply a keyframe animation that expands a secondary outer ring from 100% to 200% size while fading opacity to 0, creating a "heartbeat" effect.

### Technical Inputs
Input fields should be dark and recessed, with a subtle 1px bottom border that lights up in Cyan when focused. Data-heavy tables should use zebra-striping with the `glass-surface` color for better row tracking.