---
name: Kinetic HR
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Geist
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
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is built for a modern, high-velocity HR environment. It prioritizes clarity, efficiency, and professional trust. The brand personality is **reliable yet progressive**, designed to reduce cognitive load during check-ins and administrative tasks.

The design style is **Modern Corporate Minimalism** with a focus on **Tonal Layering**. It utilizes significant white space, high-quality ambient shadows to define hierarchy, and a refined geometric structure. The interface should feel "breathable," avoiding clutter to allow employee feedback and status updates to remain the focal point. 

Key visual principles:
- **Clarity over Decoration:** Every element serves a functional purpose.
- **Soft Precision:** High border radii (2xl) are paired with sharp, precise typography.
- **Intentional Density:** Dashboard views use a modular grid to organize complex data without feeling overwhelming.

## Colors

The palette is anchored by a deep **Indigo-600** to project authority and stability. The system utilizes a functional color logic where Emerald, Amber, and Rose are reserved strictly for status communication (Success, Warning, and Error/Alert).

- **Primary (Indigo):** Used for primary actions, active navigation states, and brand touchpoints.
- **Success (Emerald):** Used for positive check-in completions and "on-track" status indicators.
- **Alerts (Amber/Rose):** Reserved for pending actions, missed check-ins, or critical HR alerts.
- **Neutrals (Slate):** A cool-toned gray scale used for text hierarchy and subtle borders to maintain a clean, "tech-forward" feel.
- **Surface Strategy:** Main application backgrounds use Slate-50 to provide contrast for White cards, creating a clear physical distinction between the canvas and interactive elements.

## Typography

This system uses a dual-font approach. **Geist** is employed for headings and UI labels to provide a technical, precise character. **Inter** is used for body text to ensure maximum readability for long-form feedback and employee comments.

- **Headlines:** Use Geist with tight letter spacing for a modern, high-end feel.
- **Body:** Use Inter with standard tracking. Line heights are generous (1.5x) to prevent eye fatigue during data review.
- **Labels:** Small caps or medium-weight Geist are used for data headers and metadata to distinguish them from interactive text.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a 12-column structure for desktop. A strict 4px / 8px baseline rhythm ensures vertical consistency across all components.

- **Grid:** Use a 12-column grid on desktop with 24px gutters. On mobile, transition to a single-column layout with 16px side margins.
- **Card Spacing:** Internal padding for cards should default to `lg` (24px) to maintain a premium, spacious feel.
- **Section Spacing:** Major dashboard sections should be separated by `2xl` (48px) to create clear visual grouping.

## Elevation & Depth

Depth is conveyed through **Ambient Shadows** and **Tonal Layering** rather than heavy borders.

- **Level 0 (Canvas):** Slate-50. Used for the background.
- **Level 1 (Cards/Base):** White surface. Soft shadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`. 
- **Level 2 (Dropdowns/Modals):** White surface. Elevated shadow: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`.
- **Interactive States:** Buttons and interactive cards should use a subtle lift effect (smaller shadow transition) on hover to signal clickability.

## Shapes

The design system uses a "Hyper-Soft" geometric approach to counter-balance the professional tone with approachability.

- **Cards & Large Containers:** Use `rounded-2xl` (1.5rem / 24px) to create a distinct, modern SaaS aesthetic.
- **Buttons & Inputs:** Use `rounded-lg` (0.5rem / 8px) for a more structured, functional feel.
- **Chips/Badges:** Use full pill-shaped rounding for easy identification as status elements.
- **Avatars:** Strictly circular to distinguish people from objects/cards.

## Components

### Buttons
- **Primary:** Indigo-600 background, white text. `rounded-lg`. High-contrast.
- **Secondary:** White background, Slate-200 border, Slate-900 text.
- **Ghost:** No background or border. Primary color text for actions within cards.

### Input Fields
- White background with a 1px Slate-200 border.
- On focus: 1px Indigo-600 border with a 3px Indigo-100 outer glow.
- Labels use `label-md` Geist above the field.

### Cards (The "Check-in" Unit)
- White background, `rounded-2xl`.
- Level 1 Shadow.
- For "Check-in Posts," use a 24px internal padding. Title in `title-lg`, body in `body-md`.

### Status Chips
- **Success:** Emerald-50 background (low opacity) with Emerald-700 text.
- **Alert:** Rose-50 background with Rose-700 text.
- Use `label-sm` weight for text.

### Navigation
- Sidebar-based for desktop. Use a "washed-out" Indigo or Slate-900 for the background to provide a strong anchor to the light-themed content area.
- Active states use a solid Indigo-600 vertical bar on the left edge.

### Dashboard Stats
- Large `headline-lg` numbers in Indigo-600 paired with `label-sm` descriptors in Slate-500.