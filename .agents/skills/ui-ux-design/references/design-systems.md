---
title: Design Systems
impact: HIGH
impactDescription: Design systems ensure consistency, speed up development, and create a unified brand experience. Without one, teams accumulate design debt and inconsistent experiences.
tags: design-systems, components, design-tokens, documentation, governance
---

# Design Systems

## Core Components of a Design System

### 1. Design Tokens
The atomic values that define the visual language.

```css
:root {
  /* Brand Colors */
  --brand-primary: #2563eb;
  --brand-secondary: #7c3aed;
  --brand-accent: #f59e0b;

  /* Neutral Palette */
  --neutral-50: #f8fafc;
  --neutral-100: #f1f5f9;
  --neutral-200: #e2e8f0;
  --neutral-300: #cbd5e1;
  --neutral-400: #94a3b8;
  --neutral-500: #64748b;
  --neutral-600: #475569;
  --neutral-700: #334155;
  --neutral-800: #1e293b;
  --neutral-900: #0f172a;

  /* Semantic Colors */
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --info: #3b82f6;

  /* Typography */
  --font-display: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing Scale (4px base) */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);

  /* Transitions */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

### 2. Component Architecture

Each component should have:
- **API**: Props/inputs with TypeScript types
- **States**: Default, hover, focus, active, disabled, loading, error
- **Variants**: Primary, secondary, ghost, danger, etc.
- **Sizes**: sm, md, lg
- **Accessibility**: ARIA attributes, keyboard handling, focus management

Example Button Component:

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <>
          {icon && <span className="btn__icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
```

### 3. Component Categories

| Category | Examples | Rules |
|----------|----------|-------|
| **Foundations** | Color, typography, spacing, icons | Cannot depend on other components |
| **Atoms** | Button, Input, Label, Badge, Icon | Built from foundations |
| **Molecules** | Field (Label + Input), Card, Alert | Built from atoms |
| **Organisms** | Form, Header, Sidebar, DataTable | Built from molecules |
| **Templates** | Page layouts, content wrappers | Built from organisms |
| **Pages** | Full page implementations | Specific instances |

### 4. Documentation Requirements

Every component should document:
```markdown
## Component Name

### Usage
When to use this component vs alternatives.

### Props
TypeScript interface with each prop documented.

### Examples
- Basic usage
- With all variants
- With all sizes
- Edge cases (empty state, error, etc.)

### Accessibility
- ARIA roles/attributes used
- Keyboard interactions
- Focus management
- Screen reader notes

### Related Components
Links to similar or complementary components.
```

## Governance & Versioning

### Review Process
1. **Proposal**: Component request with rationale and mockups
2. **Design Review**: visual, UX, accessibility
3. **Engineering Review**: API design, performance, bundle size
4. **Documentation**: Write usage docs and examples
5. **Release**: Version bump + changelog entry

### Versioning Strategy (Semantic)
- **Major**: Breaking API changes, redesigns
- **Minor**: New components, new variants
- **Patch**: Bug fixes, accessibility improvements

## Adoption Checklist

- [ ] Design tokens published and consumed by all apps
- [ ] Core components built and documented (Button, Input, Card, Modal, etc.)
- [ ] Component playground (Storybook, Histoire)
- [ ] Contribution guide for adding new components
- [ ] Automated visual regression testing
- [ ] Accessibility testing in CI
