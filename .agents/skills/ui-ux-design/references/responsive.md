---
title: Responsive & Mobile Design
impact: HIGH
impactDescription: Mobile devices account for the majority of web traffic. Non-responsive designs cause poor usability, high bounce rates, and lost revenue on mobile.
tags: responsive, mobile-first, breakpoints, touch-targets, adaptive-layouts
---

# Responsive & Mobile Design

## Mobile-First Approach

### Why Mobile-First?
- Forces prioritization of core content and functionality
- Progressive enhancement is easier than graceful degradation
- Mobile constraints lead to better design decisions for all screens
- Google uses mobile-first indexing

### Implementation Strategy

```css
/* Mobile-first: base styles are for mobile */
.container {
  padding: 16px;
  max-width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 24px;
    max-width: 720px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 960px;
  }
}

/* Wide desktop */
@media (min-width: 1280px) {
  .container {
    max-width: 1200px;
  }
}
```

## Breakpoint Strategy

### Recommended Breakpoints

| Name | Min Width | Target Devices |
|------|-----------|----------------|
| Mobile | 0 | Phones (portrait) |
| Mobile+ | 480px | Phones (landscape), small tablets |
| Tablet | 768px | Tablets (portrait) |
| Tablet+ | 1024px | Tablets (landscape), small laptops |
| Desktop | 1280px | Laptops, desktops |
| Wide | 1536px | Large desktops, ultra-wide |

### Content-Driven Breakpoints
Use content to determine breakpoints, not device categories:

```css
/* Break when the card grid looks cramped */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
```

## Touch Target Standards

### Minimum Sizing
- **Minimum**: 44×44px (Apple HIG)
- **Recommended**: 48×48px (Material Design)
- **Spacing**: Minimum 8px between touch targets

```css
/* Ensure touch targets meet minimum size */
.mobile-nav-link {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 12px 16px;  /* generous tap area */
}

/* Icon buttons */
.icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## Adaptive Layout Patterns

### Navigation Patterns

| Pattern | Mobile | Desktop |
|---------|--------|---------|
| Hamburger menu | Hidden behind icon | Full sidebar/top nav |
| Bottom tab bar | Fixed at bottom | Sidebar navigation |
| Top nav with overflow | Scrollable tabs | All tabs visible |

### Layout Shifts

```typescript
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    function onChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

function ResponsiveLayout() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (isDesktop) return <DesktopLayout />;
  if (isTablet) return <TabletLayout />;
  return <MobileLayout />;
}
```

### Content Prioritization

```typescript
interface ContentStrategy {
  mobile: { visible: string[]; priority: number };
  tablet: { visible: string[]; priority: number };
  desktop: { visible: string[]; priority: number };
}

// Show progressively more content at larger screens
const dashboardStrategy: ContentStrategy = {
  mobile: {
    visible: ['kpi-cards', 'recent-activity'],
    priority: 1
  },
  tablet: {
    visible: ['kpi-cards', 'recent-activity', 'chart-summary'],
    priority: 2
  },
  desktop: {
    visible: ['kpi-cards', 'recent-activity', 'chart-full', 'data-table', 'team-status'],
    priority: 3
  }
};
```

## Performance Considerations

### Image Loading
```html
<!-- Responsive images with srcset -->
<img
  src="hero-400.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
  sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
  alt="Hero image"
  loading="lazy"
  decoding="async"
/>
```

### Touch Events vs Click Events
```typescript
// Use pointer events for unified touch/mouse handling
function usePress() {
  // pointerdown/pointerup works for both touch and mouse
  // touchend has 300ms delay on mobile
}

// Prevent 300ms tap delay
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

## Mobile UX Patterns

### Bottom Sheets
```typescript
function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  return (
    <div
      className={`bottom-sheet ${isOpen ? 'bottom-sheet--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Sheet"
    >
      <div className="bottom-sheet__handle" aria-hidden />
      <div className="bottom-sheet__content">
        {children}
      </div>
    </div>
  );
}
```

### Swipe to Dismiss
- Track horizontal swipe distance
- Show visual resistance (reduce movement to 50% of finger distance)
- At threshold (30% of width), dismiss; otherwise snap back
- Provide Undo toast after dismissal

### Pull to Refresh
- Max pull distance: ~80px
- Show progress indicator at threshold
- Provide haptic feedback on supported devices
- Show last-updated timestamp after refresh
