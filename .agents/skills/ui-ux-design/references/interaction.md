---
title: Interaction Design & Micro-interactions
impact: HIGH
impactDescription: Well-designed interactions reduce errors, increase satisfaction, and make interfaces feel responsive and alive. Poor interactions feel janky and untrustworthy.
tags: interaction, micro-interactions, feedback, transitions, progressive-disclosure
---

# Interaction Design & Micro-interactions

## The Anatomy of a Micro-interaction

Every micro-interaction has 4 parts:
1. **Trigger** — What starts it (user action or system state)
2. **Rules** — What happens (the logic)
3. **Feedback** — What the user sees/hears/feels
4. **Loops & Modes** — How it changes over time

### Example: Like Button

```typescript
// Trigger: click
// Rules: toggle state, animate, call API
// Feedback: visual pulse + color change + count update
// Loop: prevent double-tap during animation

function LikeButton({ postId, initialCount }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);

  async function handleLike() {
    if (animating) return; // Loop guard
    setAnimating(true);

    // Optimistic update
    setLiked(!liked);
    setCount(c => liked ? c - 1 : c + 1);

    try {
      await api.toggleLike(postId);
    } catch {
      // Rollback on error
      setLiked(liked);
      setCount(count);
    } finally {
      setAnimating(false);
    }
  }

  return (
    <button
      onClick={handleLike}
      className={`like-btn ${liked ? 'liked' : ''} ${animating ? 'pulse' : ''}`}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <HeartIcon className={animating ? 'heart-pop' : ''} />
      <span className="count">{count}</span>
    </button>
  );
}
```

```css
@keyframes heart-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.like-btn.liked { color: var(--accent); }
.heart-pop { animation: heart-pop 0.3s ease-out; }
.pulse { animation: pulse 0.3s ease-out; }
```

## Progressive Disclosure

Show advanced features only when needed. Reduce cognitive load by revealing complexity gradually.

### Pattern: Simple → Advanced Toggle

```typescript
function SearchForm() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <form>
      <fieldset>
        <legend>Basic Search</legend>
        <input type="search" placeholder="Search..." />
        <button type="submit">Search</button>
      </fieldset>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? 'Hide' : 'Show'} advanced filters
      </button>

      <Collapsible open={showAdvanced}>
        <fieldset>
          <legend>Advanced Filters</legend>
          <select aria-label="Category">{/* options */}</select>
          <input type="date" aria-label="From date" />
          <input type="date" aria-label="To date" />
        </fieldset>
      </Collapsible>
    </form>
  );
}
```

### Pattern: Wizard / Stepped Forms

Break complex forms into steps. Show progress and allow backtracking.

```typescript
type Step = { id: string; label: string; component: ReactNode };

function Wizard({ steps, onComplete }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div role="form" aria-label="multi-step form">
      <nav aria-label="Progress">
        <ol className="step-indicator">
          {steps.map((step, i) => (
            <li
              key={step.id}
              className={i === currentStep ? 'active' : i < currentStep ? 'completed' : ''}
              aria-current={i === currentStep ? 'step' : undefined}
            >
              {step.label}
            </li>
          ))}
        </ol>
      </nav>

      <section role="group" aria-label={steps[currentStep].label}>
        {steps[currentStep].component}
      </section>

      <div className="step-actions">
        {!isFirst && (
          <button onClick={() => setCurrentStep(s => s - 1)}>Back</button>
        )}
        {isLast ? (
          <button onClick={onComplete}>Complete</button>
        ) : (
          <button onClick={() => setCurrentStep(s => s + 1)}>Continue</button>
        )}
      </div>
    </div>
  );
}
```

## Touch & Gesture Interaction

### Touch Target Guidelines
- Minimum touch target: 44×44px (Apple HIG)
- Preferred touch target: 48×48px (Material Design)
- Spacing between targets: minimum 8px

### Common Gestures

| Gesture | Action | Feedback |
|---------|--------|----------|
| Tap | Select/activate | Visual press state (scale down) |
| Long press | Context menu | Haptic + visual indicator |
| Swipe | Dismiss/navigate | Follow finger with resistance |
| Pinch | Zoom | Scale transform |
| Pull to refresh | Refresh content | Spinner + haptic at threshold |

### Pull to Refresh Implementation

```typescript
function PullToRefresh({ onRefresh, children }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const threshold = 80;

  function handleTouchMove(e: React.TouchEvent) {
    if (window.scrollY > 0 || isRefreshing) return;
    const distance = Math.max(0, e.touches[0].clientY * 0.4);
    setPullDistance(Math.min(distance, threshold * 1.5));
  }

  function handleTouchEnd() {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  }

  return (
    <div
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="refresh-indicator"
        style={{
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance / threshold
        }}
      >
        {isRefreshing ? <Spinner /> : <PullIcon />}
      </div>
      {children}
    </div>
  );
}
```

## State Transitions

Every UI element has states that should communicate clearly:

| State | Visual Feedback |
|-------|----------------|
| Default | Normal appearance |
| Hover | Slight lift / color shift (desktop) |
| Focus | Focus ring (keyboard users) |
| Active/Press | Scale down / darken |
| Disabled | Reduced opacity (0.38-0.5) + no pointer events |
| Loading | Skeleton / spinner in place |
| Error | Red border + error message below |
| Success | Green checkmark / confirmation |

### Button States Example

```css
.btn {
  --bg: var(--primary-500);
  --text: white;

  background: var(--bg);
  color: var(--text);
  border: 2px solid transparent;
  transition: transform 100ms, box-shadow 150ms, background 200ms;
}

.btn:hover:not(:disabled) {
  --bg: var(--primary-600);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.btn:focus-visible {
  outline: none;
  border-color: var(--primary-700);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

.btn:disabled {
  --bg: var(--neutral-200);
  color: var(--neutral-400);
  cursor: not-allowed;
  box-shadow: none;
}

.btn[aria-busy="true"] {
  position: relative;
  color: transparent; /* hide text, show spinner */
}
```

## Skeletons & Loading States

```typescript
function Skeleton({ width = '100%', height = '1em', variant = 'text' }: SkeletonProps) {
  return (
    <div
      className={`skeleton skeleton--${variant}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

// Usage
function ProfileCardSkeleton() {
  return (
    <div className="card" aria-label="Loading profile...">
      <Skeleton variant="circle" width={48} height={48} />
      <Skeleton width="60%" height="1.25rem" />
      <Skeleton width="40%" height="1rem" />
      <Skeleton width="100%" height="3rem" variant="rect" />
    </div>
  );
}
```

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--neutral-100) 25%,
    var(--neutral-200) 37%,
    var(--neutral-100) 63%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton--circle { border-radius: 50%; }
.skeleton--rect { border-radius: 8px; }
```
