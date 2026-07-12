---
title: Motion & Animation Design
impact: MEDIUM
impactDescription: Animation enhances usability when purposeful, but distracts and frustrates when overused or poorly executed. Good motion design communicates hierarchy, state changes, and spatial relationships.
tags: motion, animation, timing, easing, transitions
---

# Motion & Animation Design

## Principles of UI Animation

### 1. Purposeful Motion
Every animation should serve a purpose:
- **Spatial**: Show where something came from / went to
- **Hierarchical**: Direct attention to important changes
- **Feedback**: Confirm user actions
- **Narrative**: Guide through a sequence
- **Perceived performance**: Fill loading time, feel faster

### 2. Natural Timing
Animations should mimic real-world physics:

```css
/* Standard easing curves */
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* Deceleration */
  --ease-in: cubic-bezier(0.4, 0, 1, 0.5);         /* Acceleration */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* Standard */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Spring / bounce */
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);     /* Material default */
}

/* Duration scale */
--duration-instant: 0ms;
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;
```

### 3. Duration Guidelines

| Action | Duration | Easing |
|--------|----------|--------|
| Hover state | 100-150ms | ease-out |
| Button press | 50-100ms | ease-out |
| Fade in | 200-300ms | ease-out |
| Slide in | 250-350ms | ease-out |
| Expand/collapse | 200-300ms | ease-in-out |
| Page transition | 300-500ms | ease-in-out |
| Loading skeleton | 1-2s loop | linear (shimmer) |

## Common UI Animations

### 1. Shared Element Transitions

```typescript
// Animate element between views using FLIP technique
// First, Last, Invert, Play

function useFLIP(ref: RefObject<HTMLElement>, deps: any[]) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const first = el.getBoundingClientRect();
    
    // Deps change triggers layout update
    // After update, capture last rect
    
    requestAnimationFrame(() => {
      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const dw = first.width / last.width;
      const dh = first.height / last.height;

      if (dx === 0 && dy === 0 && dw === 1 && dh === 1) return;

      el.style.transform = `translate(${dx}px, ${dy}px) scale(${dw}, ${dh})`;
      el.style.transition = 'none';

      requestAnimationFrame(() => {
        el.style.transform = '';
        el.style.transition = 'transform 300ms var(--ease-out)';
      });
    });
  }, deps);
}
```

### 2. Staggered List Animation

```css
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.list-item {
  animation: slide-in 300ms var(--ease-out) both;
}

.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
/* etc. */
```

```typescript
// Dynamic staggered animation
function AnimatedList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li
          key={item.id}
          className="list-item"
          style={{
            '--delay': `${i * 50}ms`
          } as React.CSSProperties}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

```css
.list-item {
  animation: slide-in 300ms var(--ease-out) both;
  animation-delay: var(--delay);
}
```

### 3. Page Transitions

```typescript
function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      {children}
    </motion.div>
  );
}
```

## When NOT to Animate

- **Don't** animate form submissions (instant feedback is better)
- **Don't** animate elements the user is trying to interact with
- **Don't** animate critical information (reading text, error messages)
- **Don't** use parallax or scroll-jacking on content pages
- **Don't** loop animations unless they convey loading or recording state

## Performance Best Practices

```css
/* ✅ Animate only compositor-only properties */
.optimized {
  will-change: transform;
  
  /* opacity and transform are GPU-accelerated */
  transition: transform 200ms, opacity 200ms;
}

/* ❌ Avoid animating layout-triggering properties */
.expensive {
  transition: width 200ms, height 200ms, top 200ms, left 200ms;
}
```

## Accessibility & Motion

Always respect user preferences:

```typescript
function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

function useAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  
  return {
    duration: prefersReduced ? 0 : 200,
    easing: 'var(--ease-out)',
    enabled: !prefersReduced
  };
}
```

## CSS-Only Animation Patterns

### Loading Spinner
```css
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--neutral-200);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Skeleton Shimmer
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--neutral-100) 25%,
    var(--neutral-200) 50%,
    var(--neutral-100) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Attention Pulse
```css
@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
  100% { box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); }
}

.pulse-ring {
  animation: pulse-ring 1.5s ease-out 3; /* max 3 pulses */
}
```
