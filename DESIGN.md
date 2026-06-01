---
name: Aura Precision
colors:
  surface: '#121315'
  surface-dim: '#121315'
  surface-bright: '#38393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1d'
  surface-container: '#1f2021'
  surface-container-high: '#292a2b'
  surface-container-highest: '#343536'
  on-surface: '#e3e2e3'
  on-surface-variant: '#c6c5d5'
  inverse-surface: '#e3e2e3'
  inverse-on-surface: '#303032'
  outline: '#908f9e'
  outline-variant: '#454652'
  surface-tint: '#bdc2ff'
  primary: '#bdc2ff'
  on-primary: '#121f8b'
  primary-container: '#5e6ad2'
  on-primary-container: '#fdfaff'
  inverse-primary: '#4854bb'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#ffb867'
  on-tertiary: '#482900'
  tertiary-container: '#a56500'
  on-tertiary-container: '#fffaf8'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000965'
  on-primary-fixed-variant: '#2e3aa2'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#ffddbb'
  tertiary-fixed-dim: '#ffb867'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#121315'
  on-background: '#e3e2e3'
  surface-variant: '#343536'
  surface-base: '#08090A'
  surface-raised: '#0C0D0E'
  surface-overlay: '#161718'
  border-subtle: rgba(255, 255, 255, 0.08)
  border-bright: rgba(255, 255, 255, 0.15)
  text-muted: '#8B93A1'
  accent-glow: rgba(94, 106, 210, 0.3)
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
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
  unit: 4px
  container-max: 1200px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for high-performance teams who value clarity, speed, and aesthetic refinement. It draws heavily from **Minimalism** and **Glassmorphism**, creating a workspace that feels like a premium instrument rather than a cluttered tool.

The brand personality is sophisticated and technical. It leverages a "Deep Dark" aesthetic to reduce eye strain during long sessions while using vibrant accent "glows" to signal action and importance. The interface utilizes "Bento Box" modularity—cleanly defined rectangular segments that organize dense data into digestible, breathable chunks. The overall emotional response should be one of focused calm and professional mastery.

## Colors
The palette is rooted in a non-pure black `#08090A` to maintain depth without losing detail in shadows. 

- **Primary & Secondary:** An electric purple-to-blue spectrum is reserved for high-intent actions and active states. 
- **Subtle Gradients:** Use linear gradients (e.g., `primary` to `secondary`) sparingly for primary action buttons or progress indicators.
- **Borders:** The primary method for section definition is a `1px` solid border using `border-subtle`. 
- **Interactive States:** Use "subtle glows"—small, soft box-shadows or radial gradients behind icons—to indicate focus or hover states using `accent-glow`.

## Typography
The system uses a tiered typographic approach to manage data density. **Geist** provides a sharp, geometric feel for headings, while **Inter** ensures maximum legibility for body text and long-form content. 

- **Hierarchy:** High contrast is achieved through weight and color rather than just size. Headlines use pure white (`#FFFFFF`), while body text uses a slightly dimmed white, and metadata uses `text-muted`.
- **Mono Accents:** **JetBrains Mono** is used for labels, IDs, shortcuts, and technical values to provide a "developer-first" aesthetic.
- **Spacing:** Tighten letter-spacing on larger headings to maintain a modern, "locked-in" look.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a "Bento" structure. Content is housed in discrete cards that reflow based on screen size.

- **The Bento Grid:** On desktop, use a 12-column grid. Components should span columns in increments of 3 or 4.
- **Rhythm:** Use a strict 4px/8px baseline. Most internal padding for cards should be 24px (`6 units`) to ensure the "airy" feel requested.
- **Mobile Adaptivity:** At the 768px breakpoint, the grid collapses into a single column. Horizontal margins reduce from 40px to 16px. Surfaces should lose their outer borders in favor of full-width divisions to maximize horizontal space.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.

- **Surface Tiers:** 
    - `Base`: The main background (`surface-base`).
    - `Raised`: Cards and bento boxes (`surface-raised`) with a `1px` border.
    - `Overlay`: Modals and dropdowns (`surface-overlay`) with a subtle `Backdrop Filter: blur(12px)`.
- **Shadows:** Use a single, highly-diffused shadow for overlays: `0 20px 40px rgba(0,0,0,0.4)`. 
- **Glows:** For primary buttons, add a very soft `0 0 15px rgba(94, 106, 210, 0.2)` to simulate light emission.

## Shapes
The shape language is controlled and geometric. 

- **Radius:** A base radius of `8px` is used for inputs and small components. 
- **Containers:** Larger Bento cards and modals use `12px` (`rounded-lg`) to feel more substantial.
- **Buttons:** Use the base `8px` radius to maintain a professional, slightly sharp edge. Avoid pills except for status tags/chips.

## Components
- **Buttons:** Primary buttons use a linear gradient from Primary to Secondary. Ghost buttons use `border-subtle` and transition to `border-bright` on hover.
- **Input Fields:** Background should be `surface-overlay` with a `1px` border. Focus state should trigger a `1px` solid Primary color border with a subtle outer glow.
- **Bento Cards:** Use `surface-raised`, `1px` border, and `12px` corner radius. Group related data within these cards using `text-muted` for labels.
- **Chips/Status:** Small, mono-spaced text inside a `2px` rounded container. Use subtle background tints (e.g., 10% opacity of the status color).
- **Glass Modals:** Use `surface-overlay` with `80%` opacity and a heavy backdrop blur. The border should be slightly brighter than standard surfaces to define the edge against the blurred background.
- **Command Menu (K-Menu):** A central component of this design system. It should be centered, floating, with a `surface-overlay` background and high-contrast typography for keyboard shortcuts.