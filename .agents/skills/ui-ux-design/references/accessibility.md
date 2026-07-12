---
title: Accessibility & Inclusive Design
impact: CRITICAL
impactDescription: Inaccessible design excludes users with disabilities, violates legal requirements, and degrades experience for all users in varying contexts.
tags: accessibility, inclusive-design, screen-readers, keyboard-navigation, color-contrast
---

# Accessibility & Inclusive Design

> **Deep dive reference**: See the [accessibility skill](../../accessibility/SKILL.md) for comprehensive WCAG 2.2 guidance. This file covers the most critical UI/UX-specific accessibility patterns.

## WCAG Quick Reference

| Level | Requirement | Minimum Ratio |
|-------|-------------|---------------|
| AA | Normal text contrast | 4.5:1 |
| AA | Large text (18px+ bold or 24px+ regular) | 3:1 |
| AAA | Normal text contrast | 7:1 |
| AA | Non-text contrast (UI components) | 3:1 |

## Keyboard Navigation

### Focus Management

```typescript
// Focus trap for modals
function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Focus first focusable element
      const first = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    } else {
      // Restore focus on close
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  // Trap focus within modal
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = modalRef.current!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dialog"
      ref={modalRef}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
```

### Tab Order Rules
- Tab order follows visual order (left-to-right, top-to-bottom)
- Remove `tabindex` values > 0 (use DOM order instead)
- Skip links for navigation-heavy pages

```html
<!-- Skip link for keyboard users -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<nav><!-- navigation --></nav>
<main id="main-content"><!-- primary content --></main>
```

## Screen Reader Support

### ARIA Labels

```html
<!-- Icon-only buttons MUST have labels -->
<button aria-label="Close dialog">
  <XIcon aria-hidden />
</button>

<!-- Described by for additional context -->
<button aria-describedby="export-hint">Export</button>
<div id="export-hint" role="tooltip">
  Downloads data as CSV (max 10,000 rows)
</div>

<!-- Live regions for dynamic updates -->
<div aria-live="polite" aria-atomic="true">
  Cart updated: 3 items
</div>
```

### Semantic HTML Over Div Soup

```html
<!-- ❌ Bad -->
<div class="card" onclick="handleClick()">
  <div class="title">Product Name</div>
  <div class="price">$29.99</div>
</div>

<!-- ✅ Good -->
<article>
  <h2>Product Name</h2>
  <p>$29.99</p>
  <button>Add to Cart</button>
</article>
```

## Color & Contrast

### Never Use Color Alone

```typescript
// ❌ Bad — relies solely on color
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge--${status}`}>
      {status}
    </span>
  );
}

// ✅ Good — uses icon + text + color
function StatusBadge({ status }: { status: 'active' | 'inactive' | 'error' }) {
  const config = {
    active: { icon: CheckCircleIcon, label: 'Active' },
    inactive: { icon: MinusCircleIcon, label: 'Inactive' },
    error: { icon: AlertCircleIcon, label: 'Error' }
  };

  const { icon: Icon, label } = config[status];

  return (
    <span className={`badge badge--${status}`}>
      <Icon aria-hidden />
      <span>{label}</span>
    </span>
  );
}
```

### Link Underlines
- Links within text blocks must be visually distinguishable (underline preferred)
- Links in navigation blocks can omit underlines when context is clear

## Reduced Motion

Respect user preferences for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Forms Accessibility

```typescript
function FormField({
  label,
  error,
  hint,
  required,
  children
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="field" role="group">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      {React.cloneElement(children, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': [
          error ? errorId : null,
          hint ? hintId : null
        ].filter(Boolean).join(' ') || undefined,
        'aria-required': required
      })}

      {error && (
        <span id={errorId} role="alert" className="field__error">
          {error}
        </span>
      )}

      {hint && !error && (
        <span id={hintId} className="field__hint">
          {hint}
        </span>
      )}
    </div>
  );
}
```

## Testing Checklist

- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (VoiceOver, NVDA, JAWS)
- [ ] Test with 200% browser zoom
- [ ] Verify color contrast with tools (WebAIM, axe)
- [ ] Test with prefers-reduced-motion: reduce
- [ ] Ensure all form fields have labels
- [ ] Verify focus order matches visual order
- [ ] Check touch targets are minimum 44×44px
