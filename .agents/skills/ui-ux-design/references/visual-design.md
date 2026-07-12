---
title: Visual Design Principles
impact: CRITICAL
impactDescription: Visual hierarchy determines whether users can find information and complete tasks. Poor visual design creates confusion and reduces trust regardless of underlying functionality.
tags: visual-design, typography, color, layout, gestalt, hierarchy
---

# Visual Design Principles

## Visual Hierarchy

### The 5 Tools of Hierarchy
1. **Size** — Larger elements are seen first
2. **Color & Contrast** — High-contrast elements draw attention
3. **Position** — Top-left (scanning pattern) is prime real estate
4. **Spacing (White Space)** — More space around an element elevates its importance
5. **Proximity** — Related items grouped together signal relationship

### Establishing Hierarchy

```css
/* Clear typographic hierarchy */
:root {
  --display-size: clamp(2.5rem, 5vw, 4rem);
  --heading-1: clamp(1.75rem, 3vw, 2.5rem);
  --heading-2: clamp(1.25rem, 2vw, 1.75rem);
  --heading-3: clamp(1.1rem, 1.5vw, 1.25rem);
  --body-size: 1rem;
  --small-size: 0.875rem;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}

h1 { font-size: var(--heading-1); font-weight: var(--font-weight-bold); }
h2 { font-size: var(--heading-2); font-weight: var(--font-weight-semibold); }
h3 { font-size: var(--heading-3); font-weight: var(--font-weight-medium); }
p  { font-size: var(--body-size); line-height: 1.6; }
```

### The F-Pattern & Z-Pattern

- **F-pattern**: For text-heavy content (articles, documentation). Users scan left-to-right, top-to-bottom in an F shape.
- **Z-pattern**: For visual/content-light pages (landing pages, dashboards). Users scan from top-left to top-right, then diagonally down to bottom-left, then to bottom-right.

## Typography

### Type Scale
Use a modular scale (1.25:1 for web, 1.333:1 for larger screens):

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### Readability Rules
- Line length: 45-75 characters (optimal ~66)
- Line height: 1.5 for body text, 1.2-1.3 for headings
- Minimum font size: 16px on mobile (prevents zoom)
- Maximum text width: ~720px for reading comfort

### Font Pairing Strategy
```
Pair a distinctive display font + a neutral body font:
  Display: Playfair Display (serif, personality)
  Body: Source Sans Pro (sans, readable)

  Display: Inter (clean, modern)
  Body: Merriweather (serif, warm)
```

## Color

### Color Psychology by Context

| Context | Recommended Approach |
|---------|---------------------|
| Productivity tools | Blues, cool grays — calm, focused |
| Wellness/health | Greens, earth tones — natural, soothing |
| Finance | Navy, white, green — trustworthy, stable |
| Creative/arts | Bold accent colors — energetic, expressive |
| E-commerce | High-contrast CTAs — urgency, action |

### Accessibility-First Color System

```css
:root {
  /* Primary palette — minimum 4.5:1 contrast on white */
  --primary-50: #eff6ff;   /* background tint */
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;  /* interactive */
  --primary-600: #2563eb;  /* hover */
  --primary-700: #1d4ed8;  /* active */

  /* Neutral palette — for text and surfaces */
  --neutral-50: #f9fafb;
  --neutral-100: #f3f4f6;
  --neutral-200: #e5e7eb;
  --neutral-600: #4b5563;  /* secondary text */
  --neutral-700: #374151;  /* body text */
  --neutral-900: #111827;  /* headings */

  /* Semantic colors */
  --success: #059669;
  --warning: #d97706;
  --error: #dc2626;
  --info: #2563eb;

  /* Ensure WCAG AA+ */
  --text-primary: var(--neutral-900);   /* 15:1 on white */
  --text-secondary: var(--neutral-600);  /* 5.5:1 on white */
  --text-disabled: var(--neutral-200);   /* only non-text uses */
}
```

### Color Usage Rules
- **60-30-10 rule**: 60% neutral (backgrounds), 30% primary (UI elements), 10% accent (CTAs, highlights)
- Never use color alone to convey information — always pair with text or icons
- Test all color combos with a contrast checker (minimum 4.5:1 for text)
- Limit palette to 3-5 colors maximum

## Gestalt Principles in UI

| Principle | Application |
|-----------|-------------|
| **Proximity** | Group related controls together with spacing |
| **Similarity** | Same color/style = same function |
| **Closure** | Users fill in gaps — use negative space creatively |
| **Figure-Ground** | Modal overlays with backdrops signal focus |
| **Common Region** | Cards, bordered sections group content |
| **Continuation** | Aligned elements create perceived paths |

### Applying Gestalt

```html
<!-- Proximity: form fields near their labels -->
<div class="field-group">
  <label for="email">Email</label>
  <input id="email" type="email" />
  <span class="hint">We'll never share your email</span>
</div>

<!-- Similarity: all buttons with same function look same -->
<button class="btn-primary">Save</button>
<button class="btn-primary">Update</button>

<!-- Common region: card groups related content -->
<div class="card">
  <img src="product.jpg" alt="Product" />
  <h3>Product Name</h3>
  <p>$29.99</p>
  <button>Add to Cart</button>
</div>
```

## Layout & Composition

### Grid Systems
- Use 4px or 8px base grid for consistent spacing
- 12-column grid most flexible for responsive design
- Vertical rhythm: consistent spacing between elements

```css
:root {
  --space-unit: 4px;
  --space-1: calc(var(--space-unit) * 1);   /* 4px */
  --space-2: calc(var(--space-unit) * 2);   /* 8px */
  --space-3: calc(var(--space-unit) * 3);   /* 12px */
  --space-4: calc(var(--space-unit) * 4);   /* 16px */
  --space-6: calc(var(--space-unit) * 6);   /* 24px */
  --space-8: calc(var(--space-unit) * 8);   /* 32px */
  --space-12: calc(var(--space-unit) * 12);  /* 48px */
  --space-16: calc(var(--space-unit) * 16);  /* 64px */
}

/* Consistent vertical rhythm */
.card-content > * + * {
  margin-top: var(--space-4);
}

.card-content > h2 {
  margin-top: var(--space-8);
}
```

### White Space Rules
- More white space = more perceived sophistication
- Increase padding rather than adding decorative elements
- Group related items closely, separate unrelated items generously
- Minimum padding: 16px on mobile, 24-32px on desktop

## Visual Weight & Balance

- Symmetrical balance = formal, stable, traditional
- Asymmetrical balance = dynamic, modern, interesting
- Radial balance = draws eye to center (good for CTAs)

```html
<!-- Asymmetrical layout with visual balance -->
<div class="hero-section">
  <!-- Heavy visual element on left (image) -->
  <div class="hero-image">
    <img src="hero.jpg" alt="" />
  </div>
  <!-- Balanced by text + CTA on right -->
  <div class="hero-content">
    <h1>Headline</h1>
    <p>Supporting text</p>
    <button>Get Started</button>
  </div>
</div>
```
