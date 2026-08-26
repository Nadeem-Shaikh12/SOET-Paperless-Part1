# DESIGN.md — Paperless SOET · FWMS
## Ventriloc Design System · Comprehensive Reference

> **Version:** 2.0 · **Status:** Final / Authoritative
> **Project:** Faculty Workload Management System (FWMS) — MGM University, School of Engineering & Technology
> **Theme Name:** Ventriloc
> **Mode:** Light only
> **Last Updated:** August 2026

---

## 0. Overview & Philosophy

Ventriloc speaks in a **quiet, professional whisper against an off-white canvas** — a workspace where data feels approachable rather than intimidating. It is built on tight geometric type, an almost-monochrome neutral palette, and a **single warm orange** (`#ff682c`) that punctuates charts, icons, and identity marks with restrained energy.

### Design Principles

| Principle | Implementation |
|---|---|
| **Data-first** | Dashboard mockups ARE the hero imagery. No stock photography, no decorative illustrations. |
| **Monochrome-restrained** | One chromatic color (Signal Orange) across an otherwise achromatic system. |
| **Flat & airy** | Elevation is achieved through background-shift (Mist → Paper), not shadows. |
| **Typographically architectural** | Tight line-heights (0.91) on PolySans headings produce a "compressed monument" effect. |
| **Pill-shaped controls** | 20px border-radius on all interactive elements is a signature of this system. |

---

## 1. Color System

### 1.1 Full Palette

| Token Name | Hex Value | CSS Variable | Role |
|---|---|---|---|
| **Signal Orange** | `#ff682c` | `--color-signal-orange` | Brand accent — chart fills, logo swoosh, active indicators, overload alerts. The **only** chromatic color in the system. |
| **Sienna Bronze** | `#816729` | `--color-sienna-bronze` | Muted brand tone — icon strokes, decorative chart elements, secondary brand marks where subtler warmth is needed. |
| **Carbon** | `#202020` | `--color-carbon` | Primary text, filled button backgrounds, sidebar header. Near-black. |
| **Graphite** | `#4d4d4d` | `--color-graphite` | Secondary text, body emphasis, subdued nav labels, icon strokes. |
| **Slate** | `#828282` | `--color-slate` | Muted helper text, inactive nav items, tertiary borders, placeholder copy. |
| **Fog** | `#f5f5f5` | `--color-fog` | Alt surface tint, subtle bands within white cards, nav hover wash. |
| **Mist** | `#efefef` | `--color-mist` | **Page canvas** — the dominant warm-gray background that frames white cards. |
| **Chalk** | `#e8e8e8` | `--color-chalk` | Soft surface inset, nav backgrounds, subtle dividers, borders. |
| **Paper** | `#ffffff` | `--color-paper` | **Card surfaces** — dashboard panels, content blocks lifted off the canvas. |

### 1.2 Semantic Surface Tokens

```css
:root {
  --background:    var(--color-mist);           /* Page canvas */
  --foreground:    var(--color-carbon);         /* Primary text */
  --surface:       var(--color-paper);          /* Card / panel surface */
  --surface-hover: var(--color-fog);            /* Interactive surface hover */
  --border:        var(--color-chalk);          /* Default border color */
  --accent:        var(--color-signal-orange);  /* Interactive accent */
}
```

### 1.3 Status / Semantic Colors

Used exclusively for system state feedback — never as brand colors:

| State | CSS Variable | Hex | Usage |
|---|---|---|---|
| Success | `--color-success` | `#10B981` | Approved status, positive deltas |
| Warning | `--color-warning` | `#F59E0B` | Underload alerts, SLA warnings |
| Error | `--color-error` | `#EF4444` | Validation errors, rejection states |
| Info | `--color-info` | `#3B82F6` | Informational banners |

### 1.4 Workload Status Color Mapping

| Workload State | Color | Visual Indicator |
|---|---|---|
| **Normal** | `#10B981` Success Green | Green badge / heatmap cell |
| **Underload** | `#F59E0B` Warning Amber | Yellow badge / heatmap cell |
| **Overload** | `#ff682c` Signal Orange | Orange badge / heatmap cell |
| **Pending** | `#3B82F6` Info Blue | Blue badge |
| **Escalated** | `#EF4444` Error Red | Red badge with SA override required |

### 1.5 Color Rules

**Do:**
- Use Signal Orange for chart fills, the logo mark, and small functional highlights only
- Use Carbon (`#202020`) for filled button backgrounds
- Build all cards on the Mist canvas (`#efefef`) with Paper surfaces (`#ffffff`)

**Don't:**
- Don't use Signal Orange as a button background or large surface fill
- Don't introduce new chromatic colors beyond the defined palette
- Don't add neutrals beyond Carbon → Graphite → Slate → Fog → Mist → Chalk → Paper

---

## 2. Typography

### 2.1 Font Families

#### PolySans — Display & Heading Face

A geometric, slightly condensed custom sans-serif. Creates tight vertical density that feels **architectural**.

- **Role:** Logo wordmark, hero headlines, section headings (H1–H3)
- **Fallback Stack:** Space Grotesk → General Sans → DM Sans → Inter
- **Production Substitute (Web):** `Space Grotesk` (via Google Fonts)
- **CSS Variable:** `--font-heading`
- **Weight Used:** 400 (single-weight system — do not use bold variants)
- **Letter Spacing:** Always `-0.02em` across all sizes

```css
--font-heading: "Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif;
```

#### Inter — Body & UI Text

Clean geometric sans-serif. Handles paragraph copy, buttons, nav links, labels, table cells, and all secondary text.

- **Role:** All body text, form labels, button text, table cells, nav items
- **CSS Variable:** `--font-sans`
- **Weights Used:** 400 (body), 500 (labels / emphasis), 600 (button text / headings)

```css
--font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### 2.2 Type Scale

| Role | Size | Line Height | Letter Spacing | Font | Weight |
|---|---|---|---|---|---|
| `caption` | 12px | 1.50 | normal | Inter | 400 |
| `body` | 16px | 1.38 | normal | Inter | 400 |
| `body-lg` | 18px | 1.33 | normal | Inter | 400 |
| `label` | 13–14px | 1.25 | normal | Inter | 500 |
| `button` | 15–16px | 1.25 | normal | Inter | 500–600 |
| `subheading` | 32px | 1.19 | -0.64px | Space Grotesk | 400 |
| `heading` | 40px | 1.13 | -0.80px | Space Grotesk | 400 |
| `display` | 66px | 0.91 | -1.32px | Space Grotesk | 400 |

### 2.3 Typography Rules

```css
/* Applied globally in globals.css */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  letter-spacing: -0.02em;
}
```

**Critical Rules:**
- Never set heading font `line-height` above `1.20` for display sizes
- Always apply `-0.02em` letter-spacing to all heading text
- Never swap Inter for heading font on body text, or vice versa on headings

---

## 3. Spacing & Layout

### 3.1 Base Unit System

- **Base unit:** `4px`
- **Density:** Comfortable

### 3.2 Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `--spacing-unit` | 4px | Base grid unit |
| `--spacing-8` | 8px | Tight element gaps, icon padding |
| `--spacing-12` | 12px | Inner component padding |
| `--spacing-16` | 16px | Standard component padding |
| `--spacing-20` | 20px | Element gaps, button padding |
| `--spacing-36` | 36px | Card internal sections |
| `--spacing-40` | 40px | Card padding (min) |
| `--spacing-60` | 60px | Major section separators |
| `--spacing-80` | 80px | Section vertical breathing room |

### 3.3 Layout Grid

| Property | Value |
|---|---|
| **Page max-width** | 1200px |
| **Content max-width** | 7xl (`max-w-7xl` = 80rem) |
| **Section gap** | 80px |
| **Card padding** | 32–40px |
| **Element gap** | 20px |
| **Sidebar width** | 256px (16rem / `w-64`) |
| **Topbar height** | 56px (`h-14`) |
| **Main content padding** | 16px (mobile) → 24px (sm) → 32px (lg) |

### 3.4 Breakpoints (Tailwind CSS v4 defaults)

| Breakpoint | Screen Width | Behavior |
|---|---|---|
| (default) | < 640px | Mobile: sidebar hidden, single column layout |
| `sm` | ≥ 640px | Small tablet adjustments |
| `lg` | ≥ 1024px | Desktop: sidebar always visible (`lg:static`) |
| `xl` | ≥ 1280px | Wide desktop, expanded grids |

---

## 4. Border Radius

All border radius values are intentional — do not deviate.

| Token | Value | CSS Variable | Applied To |
|---|---|---|---|
| `sm` | 3px | `--radius-sm` | Error indicator bars, very small accents |
| `md` / `lg` | 8px | `--radius-md`, `--radius-cards`, `--radius-inputs` | Cards, form inputs, modals, panels |
| `xl` | 12px | `--radius-xl` | Larger modal containers |
| `2xl` / buttons | 20px | `--radius-buttons`, `--radius-tags` | **All buttons and tags** — signature pill shape |
| `full` / navPill | 200px | `--radius-full`, `--radius-navpill` | Floating navigation capsule |

---

## 5. Elevation & Shadows

Elevation is achieved **primarily through background color contrast** (Mist canvas → Paper surface), not heavy shadows.

| Level | CSS Value | Usage |
|---|---|---|
| **Base** | None | Canvas background, no elevation |
| **Card** | `0 1px 3px rgba(32,32,32,0.04), 0 4px 12px rgba(32,32,32,0.03)` | All dashboard cards and panels |
| **Modal** | `0 4px 24px rgba(32,32,32,0.08)` | Modal overlays |

```css
--elevation-card: 0 1px 3px rgba(32, 32, 32, 0.04), 0 4px 12px rgba(32, 32, 32, 0.03);
```

**Rule:** Never use shadows above `3–8% opacity` on cards. No heavy elevation effects.

---

## 6. Component Library

### 6.1 Filled Pill Button — Primary Action

**Visual:** Carbon background, white text, 20px border-radius, ~40–44px height.

```html
<button class="py-3 px-6 bg-[var(--color-carbon)] hover:bg-[var(--color-graphite)]
               text-white font-semibold rounded-[var(--radius-buttons)]
               transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed">
  Submit Allocation
</button>
```

| Property | Value |
|---|---|
| Background | Carbon `#202020` |
| Hover background | Graphite `#4d4d4d` |
| Text | White `#ffffff` |
| Font | Inter 500–600, 15–16px |
| Border | None |
| Border radius | 20px (pill) |
| Height | ~40–44px |
| Transition | 200ms ease |

---

### 6.2 Outlined Pill Button — Secondary Action

**Visual:** Carbon text, 1px Carbon border, transparent background.

```html
<button class="py-3 px-6 border border-[var(--color-carbon)]
               text-[var(--color-carbon)] font-medium rounded-[var(--radius-buttons)]
               hover:bg-[var(--color-fog)] transition-all duration-200">
  Cancel
</button>
```

---

### 6.3 Sidebar Navigation

**Structure:**
- Fixed `w-64` (256px) vertical sidebar on mobile; `lg:static` on desktop
- Carbon (`#202020`) header with white "FWMS Portal" wordmark
- Paper white body with Fog hover on nav items
- Signal Orange accent icon + dot indicator on active item

```html
<!-- Active Nav Item -->
<a class="flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold
           bg-[var(--color-fog)] text-[var(--color-carbon)]">
  <Icon class="w-5 h-5 mr-3 text-[var(--color-signal-orange)]" />
  Dashboard
  <div class="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-signal-orange)]" />
</a>

<!-- Default Nav Item -->
<a class="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium
           text-[var(--color-graphite)] hover:bg-[var(--color-fog)] hover:text-[var(--color-carbon)]">
  <Icon class="w-5 h-5 mr-3 text-[var(--color-slate)]" />
  Allocations
</a>
```

**Nav Items by Role:**

| Nav Item | Path | Roles |
|---|---|---|
| Dashboard | `/dashboard` | super_admin, dept_admin, faculty |
| Institutional Config | `/institutional` | super_admin only |
| Master Data | `/master-data` | super_admin, dept_admin |
| Subjects & Classes | `/subjects` | super_admin, dept_admin |
| Allocations | `/allocations` | All roles |
| Approvals | `/approvals` | super_admin, dept_admin |
| Faculty Management | `/faculty` | super_admin, dept_admin |
| Workload Report | `/workload-report` | super_admin, dept_admin |

---

### 6.4 Metric KPI Card

**Structure:** Paper surface card showing a large stat value, title, and optional delta.

```html
<div class="bg-[var(--surface)] rounded-[var(--radius-cards)] p-6
            shadow-[var(--elevation-card)] border border-[var(--border)]">
  <p class="text-sm font-medium text-[var(--color-graphite)] mb-1">Total Faculty</p>
  <p class="text-3xl font-bold text-[var(--foreground)]"
     style="font-family: var(--font-heading); letter-spacing: -0.02em;">42</p>
  <p class="text-xs text-[var(--color-success)] mt-1">+3 this term</p>
</div>
```

| Element | Style |
|---|---|
| Title | Inter 13–15px, weight 500, Graphite |
| Value | Space Grotesk 32–40px, weight 400, Carbon |
| Delta | Inter 12px, weight 400, status color |

---

### 6.5 Content / Dashboard Card

**Visual:** White card on Mist canvas. Subtle shadow. 8px radius. Standard container for all page sections.

```html
<div class="bg-[var(--surface)] rounded-[var(--radius-cards)]
            shadow-[var(--elevation-card)] border border-[var(--border)] p-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-lg font-semibold text-[var(--foreground)]"
        style="font-family: var(--font-heading); letter-spacing: -0.02em;">
      Department Workload
    </h2>
  </div>
  <!-- Card content -->
</div>
```

---

### 6.6 Data Table

**Structure:** Paper card containing a clean tabular layout.

| Element | Style |
|---|---|
| Header row | Fog background, Graphite text, 13px Inter 500, left-aligned |
| Data row | Paper background, Carbon text, 14px Inter 400 |
| Row hover | Fog background transition |
| Row border | 1px Chalk bottom border |
| Cell padding | `px-4 py-3` |
| Actions column | Right-aligned, Ghost or outlined pill buttons |

---

### 6.7 Status Badge / Pill Tag

Border-radius always `rounded-full` for badge-shaped pills.

```html
<!-- Draft -->
<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Draft</span>

<!-- Pending Approval -->
<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Pending Approval</span>

<!-- Approved -->
<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>

<!-- Rejected -->
<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>

<!-- Escalated to Super Admin -->
<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-[var(--color-signal-orange)]">Escalated</span>
```

---

### 6.8 Form Inputs

```html
<label class="block text-sm font-medium text-[var(--color-graphite)] mb-2">
  Label Text
</label>
<input class="w-full px-4 py-3 rounded-[var(--radius-inputs)]
              border border-[var(--border)] bg-[var(--color-fog)]
              text-[var(--foreground)] placeholder:text-[var(--color-slate)]
              focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--color-carbon)]
              transition-all outline-none" />
```

| State | Background | Ring / Border |
|---|---|---|
| Default | Fog `#f5f5f5` | 1px Chalk |
| Focus | Paper `#ffffff` | 2px Carbon ring |
| Error | Fog | 2px Error Red ring |
| Disabled | Fog 50% opacity | 1px Chalk |

---

### 6.9 Modal

**Visual:** Glassmorphism card centered on a dark-blurred backdrop. 8px radius.

```html
<!-- Backdrop -->
<div class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />

<!-- Modal Panel -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div class="glass w-full max-w-lg p-8 rounded-[var(--radius-cards)]">
    <!-- Content -->
  </div>
</div>
```

The `.glass` utility class is defined globally:

```css
.glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-chalk);
  box-shadow: var(--elevation-card);
}
```

---

### 6.10 Area / Line Chart Card (Recharts)

Used in Super Admin and HOD dashboards for temporal or aggregate data.

| Element | Style |
|---|---|
| Chart line stroke | Carbon `#202020`, ~2px |
| Chart area fill | Signal Orange at ~15–20% opacity |
| Grid lines | None or very faint Chalk |
| Axis labels | Inter 12px, Slate `#828282` |
| Chart card container | Paper surface, 8px radius |

---

### 6.11 Donut / Pie Chart Card (HOD Dashboard)

Recharts `PieChart` for course hour distribution breakdown.

| Element | Style |
|---|---|
| Primary arc | Signal Orange `#ff682c` |
| Secondary arcs | Sienna Bronze, Graphite tones |
| Center value label | Space Grotesk 32px, Carbon |
| Legend | Inter 12–13px with color dot indicators |

---

### 6.12 Radial Progress Gauge (Faculty Dashboard)

Recharts `RadialBarChart` for personal weekly hours vs. designation limit.

| Load State | Arc Color |
|---|---|
| Normal load | Signal Orange `#ff682c` |
| Underload | Warning Amber `#F59E0B` |
| Overload | Error Red `#EF4444` |

---

### 6.13 Workload Heatmap Grid (Super Admin Dashboard)

Color-coded faculty × department cell grid. Each cell = individual faculty's load state.

| Cell Color | Meaning |
|---|---|
| Green `#10B981` | Normal — within min/max designation band |
| Yellow `#F59E0B` | Underload — below minimum |
| Orange/Red `#ff682c` / `#EF4444` | Overload — exceeds designation maximum |

---

### 6.14 Floating Topbar

```html
<header class="flex items-center justify-between h-14 px-4 sm:px-6
               border-b border-[var(--border)] bg-[var(--surface)] z-10">
  <!-- Left: Mobile hamburger (Menu icon, lg:hidden) -->
  <!-- Right: "Paperless SOET" — Inter 12px, Slate, uppercase tracking-wider -->
</header>
```

---

### 6.15 Force Password Change Screen

Triggered when `user.mustChangePassword === true` — intercepts all protected routes via `RouteGuard`.

- Full-screen Mist canvas
- `.glass` card centered (`max-w-md`)
- Decorative blurred Chalk/Fog circle accents for depth (absolute positioned, pointer-events-none)
- Carbon background box with `KeyRound` (Lucide) icon
- Two password inputs with `Lock` icon prefix
- Carbon filled pill submit button

---

## 7. Icons

**Library:** `lucide-react` (v0.475+)

| Icon Component | Usage |
|---|---|
| `LayoutDashboard` | Dashboard nav item |
| `Settings` | Institutional Config nav |
| `Database` | Master Data nav |
| `BookOpen` | Subjects & Classes nav |
| `Calendar` | Allocations nav |
| `ClipboardList` | Approvals nav |
| `Users` | Faculty Management nav |
| `FileSpreadsheet` | Workload Report nav |
| `LogOut` | Sign out action |
| `Menu` / `X` | Mobile sidebar toggle |
| `KeyRound` | Password change screen header |
| `Lock` | Password input prefix icon |
| `Loader2` | Loading spinner (`animate-spin`) |
| `AlertCircle` | Error feedback banners |
| `CheckCircle2` | Success feedback banners |

**Standard sizes:** Nav icons: `w-5 h-5` · Button icons: `w-4 h-4` · Card hero icons: `w-6 h-6` – `w-8 h-8`

**Default icon color:** Slate (`#828282`) when inactive → Signal Orange when active.

---

## 8. Animation & Motion

### 8.1 Page Transition (Enter)

Applied to all protected page content containers:

```html
<div class="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
  {children}
</div>
```

### 8.2 Micro-Interaction Specs

| Interaction | Duration | Easing |
|---|---|---|
| Button hover (background color) | 200ms | ease |
| Sidebar slide-in (mobile) | 300ms | ease-in-out |
| Nav item hover (background) | 200ms | ease |
| Form input focus ring | `transition-all` | default |
| Loading spinner | — | `animate-spin` |

### 8.3 Motion Rules

- All transitions: 150–300ms. Never exceed 500ms for micro-interactions.
- Use `ease-out` for entrance animations, `ease-in` for exits.
- Spinner: `animate-spin` on Loader2, Carbon color.

---

## 9. Page-Level Layout Patterns

### 9.1 Application Shell

```
┌─────────────────────────────────────────────────────────┐
│              Topbar (h-14, bg: Paper, border-b Chalk)   │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   Sidebar    │       Main Content Area                  │
│   (w-64)     │  bg: Mist · overflow-y-auto              │
│   bg: Paper  │  padding: p-4 sm:p-6 lg:p-8              │
│   border-r   │  max-w-7xl mx-auto                       │
│   Chalk      │                                          │
│              │  ┌─────────────────────────────────┐     │
│  ┌────────┐  │  │   KPI Card Grid                 │     │
│  │ Header │  │  │   grid-cols-1 → sm:2 → lg:4     │     │
│  │ Carbon │  │  └─────────────────────────────────┘     │
│  └────────┘  │                                          │
│  Nav Items   │  ┌─────────────────────────────────┐     │
│              │  │   Chart / Data Table Card        │     │
│  ┌────────┐  │  │   bg: Paper · 8px radius         │     │
│  │  User  │  │  └─────────────────────────────────┘     │
│  │ Footer │  │                                          │
│  └────────┘  │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### 9.2 Dashboard Grid Patterns

**Super Admin Dashboard:**
- Row 1: 4 KPI cards — `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`
- Row 2: Stacked Bar Chart (Theory vs. Practical per department) — full width
- Row 3: Faculty Workload Heatmap Grid

**HOD Dashboard:**
- Row 1: 3–4 KPI cards
- Row 2: 2-column — Donut Chart + Faculty Workload Table (`grid-cols-1 lg:grid-cols-2`)

**Faculty Dashboard:**
- Row 1: Radial Progress Gauge (large card, centered)
- Row 2: Assigned subjects list cards
- Row 3: Vertical approval status timeline log

### 9.3 Login Page

Centered `.glass` card (`max-w-md`) on full-bleed Mist canvas (`min-h-screen`). Decorative blurred Chalk/Fog circles (absolute, pointer-events-none) for visual depth.

---

## 10. CSS Architecture

### 10.1 Token Hierarchy

```
tokens.json           → Raw design token definitions
    │
variables.css         → Global CSS Custom Properties (:root)
    │
globals.css           → Tailwind v4 @theme block + @layer base overrides
    │
Component classes     → Tailwind utility classes referencing CSS variables
```

### 10.2 CSS Files Reference

| File | Location | Purpose |
|---|---|---|
| `variables.css` | `/Paperless SOET/variables.css` | Full CSS Custom Properties token set |
| `theme.css` | `/Paperless SOET/theme.css` | Global utility CSS classes |
| `tokens.json` | `/Paperless SOET/tokens.json` | Raw token definitions |
| `globals.css` | `fwms/apps/web/src/app/globals.css` | Tailwind v4 `@theme` + `@layer base` |

### 10.3 Tailwind v4 Configuration

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* Ventriloc Color Palette */
  --color-signal-orange: #ff682c;
  --color-sienna-bronze: #816729;
  --color-carbon:        #202020;
  --color-graphite:      #4d4d4d;
  --color-slate:         #828282;
  --color-fog:           #f5f5f5;
  --color-mist:          #efefef;
  --color-chalk:         #e8e8e8;
  --color-paper:         #ffffff;

  /* Semantic Status Colors */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error:   #EF4444;
  --color-info:    #3B82F6;

  /* Typography */
  --font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif;

  /* Border Radius */
  --radius-sm:      3px;
  --radius-md:      8px;
  --radius-lg:      8px;
  --radius-xl:      12px;
  --radius-2xl:     20px;
  --radius-cards:   8px;
  --radius-inputs:  8px;
  --radius-buttons: 20px;
  --radius-tags:    20px;
  --radius-full:    200px;
}

@layer base {
  :root {
    --background:    var(--color-mist);
    --foreground:    var(--color-carbon);
    --surface:       var(--color-paper);
    --surface-hover: var(--color-fog);
    --border:        var(--color-chalk);
    --accent:        var(--color-signal-orange);
    --elevation-card: 0 1px 3px rgba(32,32,32,0.04), 0 4px 12px rgba(32,32,32,0.03);
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    letter-spacing: -0.02em;
  }
}

.glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-chalk);
  box-shadow: var(--elevation-card);
}
```

---

## 11. Navigation & Route Architecture

### 11.1 Complete Route Map

| Route | Access Level |
|---|---|
| `/` | Public — redirects to `/login` or `/dashboard` |
| `/login` | Public |
| `/unauthorized` | Public |
| `/dashboard` | All authenticated roles |
| `/institutional` | `super_admin` only |
| `/master-data` | `super_admin`, `dept_admin` |
| `/subjects` | `super_admin`, `dept_admin` |
| `/allocations` | All authenticated roles |
| `/approvals` | `super_admin`, `dept_admin` |
| `/faculty` | `super_admin`, `dept_admin` |
| `/workload-report` | `super_admin`, `dept_admin` |

### 11.2 Route Guard Decision Tree

```
User visits protected route
    │
    ├── isLoading?  → Show Loader2 spinner
    │
    ├── !isAuthenticated? → Redirect to /login?redirect=<path>
    │
    ├── mustChangePassword?  → Render ForcePasswordChange screen (ALL routes)
    │
    └── role NOT in allowedRoles? → Redirect to /unauthorized
```

---

## 12. Application-Specific Design Patterns

### 12.1 Allocation Status Visual Hierarchy

| Status | Badge Color | Description |
|---|---|---|
| `draft` | Gray | Initial state, not submitted |
| `pending_approval` | Blue | Awaiting HOD review |
| `approved` | Green | Finalized for the term |
| `rejected` | Red | Terminal rejection state |
| `escalated_to_super_admin` | Signal Orange / Red | Overload or SLA breach — SA override required |

### 12.2 Workload Gauge States

| Condition | Radial Arc Color | Label |
|---|---|---|
| Hours < minWeeklyHours | Amber `#F59E0B` | Underload warning |
| minWeeklyHours ≤ hours ≤ maxWeeklyHours | Signal Orange `#ff682c` | Normal |
| Hours > maxWeeklyHours | Error Red `#EF4444` | Overload — SA override |

### 12.3 AI Workload Ingestion UX Flow

1. HOD/SA uploads document (JPEG/PNG/WEBP/PDF, max 20MB) via file picker
2. `Loader2 animate-spin` shown while Gemini 2.5 Flash processes the document
3. **Dry-run preview:** Paper card table renders parsed `WorkloadReportRow` data for verification
4. User confirms → system persists rows to database
5. Success badge + full report view renders

### 12.4 SLA Escalation Cue

When an allocation remains `pending_approval` beyond `slaDaysForHodReview` (default: 3 days):
- Badge changes from Blue `Pending Approval` → Signal Orange/Red `Escalated`
- `requiresSaOverride: true` flag activates Super Admin-only action buttons
- HOD sees a disabled approval button with "Escalated to Super Admin" tooltip

### 12.5 Approval Timeline (Faculty Dashboard)

Vertical timeline list of recent allocation status changes. Each entry:
- Timestamp in Inter 12px Slate (right-aligned)
- Status transition badge
- Reviewer name in Inter 13px Graphite
- Optional remarks in Inter 12px italic

---

## 13. Dos and Don'ts

### ✅ Do

- Use **Space Grotesk / PolySans weight 400** for all display text and headings
- Set line-height to **0.91–1.00** for heading display sizes (32px+) for the compressed, architectural feel
- Apply **-0.02em letter-spacing** to all heading text
- Use **20px border-radius** for all buttons, tags, and pill-shaped controls
- Use **Signal Orange** sparingly: chart fills, active nav indicator dot, overload state only
- Build all cards on **Mist canvas** (`#efefef`) with **Paper surfaces** (`#ffffff`)
- Keep shadows extremely subtle: `rgba(32,32,32,0.03–0.08)` opacity maximum

### ❌ Don't

- Don't use **heavy drop shadows** — keep shadows at 1–3% opacity on cards
- Don't add **chromatic color** to buttons, links, or body text — actions stay Carbon-filled or Carbon-outlined
- Don't use **sharp corners** (0–4px radius) on any card, input, or button
- Don't break the **type pairing** — Inter is for body, Space Grotesk for headings. Never swap.
- Don't set heading **line-height above 1.20** for display sizes
- Don't introduce **new neutral colors** beyond the defined 9-color scale
- Don't use **photography, stock imagery, or decorative illustrations**
- Don't use **Signal Orange as a button background** or any large surface fill

---

## 14. Similar Reference Brands

| Brand | Shared Characteristics |
|---|---|
| **Tableau** | Dashboard-as-hero, white analytics cards on neutral canvas |
| **Mode Analytics** | Light-mode data product, single warm accent, geometric sans-serif |
| **ThoughtSpot** | Monochrome chrome with orange data accents, pill controls, tight geometric type |
| **Sisense** | White cards on warm-gray canvas, minimal shadows, condensed display headings |
| **Power BI** | Dashboard-heavy preview aesthetic, chart cards in white panels, restrained palette |

---

## 15. Quick Reference — Token Cheat Sheet

```css
/* ── Brand Colors ── */
--color-signal-orange: #ff682c;   /* Brand accent / overload alerts */
--color-carbon:        #202020;   /* Primary text / button backgrounds */
--color-graphite:      #4d4d4d;   /* Secondary text / nav labels */
--color-slate:         #828282;   /* Muted text / placeholders / inactive icons */
--color-fog:           #f5f5f5;   /* Hover wash / input backgrounds */
--color-mist:          #efefef;   /* PAGE CANVAS (primary background) */
--color-chalk:         #e8e8e8;   /* Borders / dividers */
--color-paper:         #ffffff;   /* CARD SURFACES */

/* ── Semantic Tokens ── */
--background:  var(--color-mist);
--surface:     var(--color-paper);
--foreground:  var(--color-carbon);
--border:      var(--color-chalk);
--accent:      var(--color-signal-orange);

/* ── Elevation ── */
--elevation-card: 0 1px 3px rgba(32,32,32,0.04), 0 4px 12px rgba(32,32,32,0.03);

/* ── Border Radius ── */
--radius-cards:   8px;    /* Cards, inputs, modals */
--radius-inputs:  8px;    /* Form inputs */
--radius-buttons: 20px;   /* Buttons, tags — pill shape signature */
--radius-tags:    20px;   /* Status badges, pill tags */
--radius-full:    200px;  /* Nav capsule */

/* ── Typography ── */
--font-sans:    "Inter", ...;          /* Body, UI text */
--font-heading: "Space Grotesk", ...;  /* Headings, display */

/* ── Status Colors ── */
--color-success: #10B981;   /* Approved / positive */
--color-warning: #F59E0B;   /* Underload / SLA warning */
--color-error:   #EF4444;   /* Rejected / overload */
--color-info:    #3B82F6;   /* Pending / informational */
```

---

*This document is the **single source of truth** for all UI/UX decisions in the Paperless SOET — FWMS project. Any deviations must be reviewed against the principles outlined in §0 (Philosophy).*
