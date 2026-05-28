---
name: PromptFlow Studio
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#414753'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#717785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005cbb'
  primary: '#0059b5'
  on-primary: '#ffffff'
  primary-container: '#0071e3'
  on-primary-container: '#fcfbff'
  inverse-primary: '#abc7ff'
  secondary: '#006e28'
  on-secondary: '#ffffff'
  secondary-container: '#6ffb85'
  on-secondary-container: '#00732a'
  tertiary: '#9b3f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c25100'
  on-tertiary-container: '#fffaf9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#abc7ff'
  on-primary-fixed: '#001b3f'
  on-primary-fixed-variant: '#00458f'
  secondary-fixed: '#72fe88'
  secondary-fixed-dim: '#53e16f'
  on-secondary-fixed: '#002107'
  on-secondary-fixed-variant: '#00531c'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb693'
  on-tertiary-fixed: '#341000'
  on-tertiary-fixed-variant: '#7a3000'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-xs:
    fontFamily: Inter
    fontSize: 11px
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
  base: 4px
  gutter: 16px
  margin-page: 32px
  panel-padding: 20px
  stack-gap: 12px
---

## Brand & Style

The design system is anchored in a philosophy of "Technical Precision." It caters to prompt engineers and developers who require a focused, distraction-free environment for complex logic construction. The aesthetic draws heavily from high-end minimalist interfaces, prioritizing clarity, whitespace, and a strict adherence to a grid. 

The emotional response should be one of "effortless control"—where the interface recedes into the background, allowing the user's workflow to take center stage. This is achieved through a "Lite-Pro" visual language: professional and capable, yet visually light and airy.

## Colors

The palette is intentionally restrained to maintain focus on content. 

- **Canvas & Background:** Use `#fafafa` for the primary application background to differentiate from white UI elements.
- **Surfaces:** Use pure white (`#ffffff`) for interactive cards, sidebars, and modular panels.
- **Accents:** Use Blue (`#0071e3`) for primary actions and "system-active" states. Use Green (`#34c759`) exclusively for successful executions, test passes, and deployment statuses.
- **Borders:** A universal hairline border of `#e5e5e7` is used for all structural containment. Avoid darker grays to prevent visual clutter.

## Typography

This design system utilizes **Inter** for all UI elements and navigation to ensure maximum legibility at small sizes. **Geist** (Monospace) is reserved strictly for prompt inputs, parameter values, and code snippets, providing the necessary technical distinction.

- **Scale:** Maintain a tight typographic scale. Significant contrast is achieved through weight (Regular to Semi-Bold) rather than massive size differences.
- **Code Rendering:** All monospace blocks should include a slight background tint of the neutral color to separate them from prose.
- **Hierarchy:** Use the `label-xs` style for section headers in sidebars to provide clear categorization without overwhelming the vertical space.

## Layout & Spacing

The layout follows a "Modular IDE" model. It uses a 3-tier horizontal structure:
1. **Global Navigation (64px):** A slim, icon-based left rail.
2. **Configuration Sidebar (280px - 320px):** For prompt parameters and variables.
3. **Fluid Canvas:** A flexible center area for the visual flow or editor.

The spacing rhythm is based on a 4px scale. Components should be spaced generously to allow the "hairline border" style to breathe. Use `24px` or `32px` gaps between major functional groups and `12px` gaps within component stacks.

## Elevation & Depth

In line with the "Apple/Stripe" aesthetic, this design system avoids heavy drop shadows. Depth is communicated through:
- **Tonal Layering:** The primary canvas is `#fafafa`, while floating or interactive elements are `#ffffff`.
- **Hairline Outlines:** 1px solid borders in `#e5e5e7` define all interactive boundaries.
- **Subtle Mesh Grid:** The main canvas should feature a subtle 16px dot-grid pattern in a very faint gray (20% opacity of the border color) to suggest a workspace environment.
- **Zero-Shadow State:** Elements should appear flat. Use a 2px "Soft Blur" shadow with 5% opacity only for high-priority overlays like dropdown menus or modals.

## Shapes

The design system utilizes "Soft" geometry. While the overall vibe is sharp and precise, subtle rounding prevents the UI from feeling aggressive.

- **Standard Elements:** Buttons, inputs, and cards use a `4px` (0.25rem) radius.
- **Large Containers:** Main panels or large modal views may scale up to `8px` (0.5rem) to soften the transition against the browser edges.
- **Icons:** Use linear icons with a 1.5pt or 2pt stroke weight to match the hairline border thickness of the containers.

## Components

- **Buttons:** Primary buttons are solid `#0071e3` with white text. Secondary buttons use a white background with a `#e5e5e7` border and blue text. All buttons have a fixed 32px or 36px height for a compact, professional feel.
- **Cards:** Pure white background, 1px border, no shadow. Padding should be a minimum of 20px.
- **Input Fields:** Use a subtle inset look or a simple 1px border. Focus states must use a 1px blue outline without a "glow" effect.
- **Chips/Badges:** Use for variable tags within prompts. These should be light gray with a slightly darker text color, using the `code-sm` typography style.
- **Lists:** Clean, border-bottom separation only. Use hover states that change the background to `#f5f5f7` (a slightly darker version of the neutral background).
- **Nodes (Flow Editor):** Use white cards with a thick (2px) colored left-border to indicate node type (e.g., Blue for Input, Green for Output, Purple for LLM).