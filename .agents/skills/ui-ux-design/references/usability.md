---
title: Usability Heuristics & Design
impact: CRITICAL
impactDescription: Poor usability causes user frustration, task failure, and abandonment. Usability issues directly impact conversion, retention, and support costs.
tags: usability, heuristics, error-prevention, feedback, user-control
---

# Usability Heuristics & Design

## Nielsen's 10 Usability Heuristics

### 1. Visibility of System Status
Keep users informed about what's happening with clear, timely feedback.

**Correct:**
```html
<!-- Loading state with progress -->
<button aria-busy="true" disabled>
  <span class="spinner"></span>
  Saving...
</button>

<!-- Success confirmation -->
<div role="status" class="toast-success">
  Document saved successfully
</div>

<!-- Error with recovery -->
<div role="alert" class="field-error">
  Email address is invalid. Please check your entry.
</div>
```

**Incorrect:**
```html
<!-- No feedback after action -->
<button>Save</button>
<!-- User clicks but nothing happens for 3 seconds -->

<!-- Silent failure -->
<!-- Form submits but API error is never shown to user -->
```

### 2. Match Between System and Real World
Use language, concepts, and metaphors familiar to the user. Follow real-world conventions.

**Correct:**
- Shopping cart icon (not "temporary holding container")
- "Delete" → confirmation dialog (mirrors physical irreversible actions)
- Date picker mirrors calendar layout
- Address forms follow real address format (street, city, state, zip)

**Incorrect:**
- Technical jargon like "CRUD operations" or "instance"
- Abstract icons without labels
- Date fields requiring specific format without examples

### 3. User Control and Freedom
Users often perform actions by mistake. Support undo, redo, and easy navigation.

**Correct:**
```typescript
// Undo support for destructive actions
function handleDelete(item: Item) {
  const deleted = removeItem(item);
  showToast({
    message: `"${item.name}" deleted`,
    action: {
      label: 'Undo',
      handler: () => restoreItem(deleted)
    },
    duration: 5000
  });
}
```

**Incorrect:**
- No way to cancel a multi-step flow
- No "back" button on wizard steps
- Permanent deletion without confirmation or undo

### 4. Consistency and Standards
Users should not wonder whether different words, situations, or actions mean the same thing.

**Correct:**
- Same button placement across all forms (Save bottom-right, Cancel bottom-left)
- Consistent terminology: always "Sign in" never mix "Sign in / Log in / Authenticate"
- Same icon means same action everywhere
- Primary action always uses the same color/style

**Incorrect:**
- Delete icon used for both "remove from list" and "permanently delete"
- "Submit" on one page, "Save" on another for the same action
- Inconsistent label placement (some labels above, some below fields)

### 5. Error Prevention
Prevent problems before they occur. Better than good error messages.

**Correct:**
```typescript
// Prevent invalid input
<input
  type="email"
  pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
  autocomplete="email"
  // Disable submit until valid
/>
<button disabled={!isValid}>Continue</button>

// Confirm destructive actions
async function handleDeleteAll() {
  const confirmed = await confirmDialog({
    title: 'Delete all items?',
    body: 'This action cannot be undone.',
    confirmLabel: 'Delete all',
    variant: 'danger'
  });
  if (!confirmed) return;
  await deleteAll();
}
```

**Incorrect:**
- Accepting invalid data then showing errors
- No confirmation on irreversible actions
- Submit button always enabled regardless of validation

### 6. Recognition Rather Than Recall
Minimize user memory load by making objects, actions, and options visible.

**Correct:**
- Show recently used items in a dropdown
- Icons with text labels on toolbar actions
- Autocomplete suggestions in search fields
- Breadcrumb navigation showing current location

**Incorrect:**
- Requiring users to remember a command or shortcut
- Hiding all navigation behind a hamburger menu
- No search history or recent items

### 7. Flexibility and Efficiency of Use
Provide shortcuts and customization for expert users while keeping the interface simple for novices.

**Correct:**
```typescript
// Keyboard shortcuts for power users
useEffect(() => {
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveDocument();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
    if (e.key === '/' && e.target === document.body) {
      searchInputRef.current?.focus();
    }
  }
  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}, []);
```

**Incorrect:**
- No keyboard shortcuts for repeated actions
- Removing power features for "simplicity"
- Forcing all users through the same flow regardless of expertise

### 8. Aesthetic and Minimalist Design
Interfaces should not contain irrelevant information. Every extra unit of information competes with relevant units.

**Correct:**
```typescript
// Minimal, focused form
interface SignInForm {
  email: string;
  password: string;
}
// Only two fields + submit — no fluff
```

**Incorrect:**
- Dashboard showing 15 charts when user needs 2 key metrics
- Forms with optional fields mixed with required
- Hero images and decorative elements in task-focused interfaces

### 9. Help Users Recognize, Diagnose, and Recover from Errors
Error messages should be expressed in plain language, precisely indicate the problem, and constructively suggest a solution.

**Correct:**
```html
<div role="alert">
  <strong>Connection lost</strong>
  <p>Your changes have been saved locally.</p>
  <button onclick="retrySync()">Retry connection</button>
</div>
```

**Incorrect:**
- "Error 0x80070057" — meaningless code
- "An error occurred" — no context
- "Invalid input" — doesn't say which field or what's wrong

### 10. Help and Documentation
Provide searchable, contextual help. Don't assume users will read documentation up front.

**Correct:**
```typescript
// Contextual tooltip
<button aria-describedby="export-help">
  Export
</button>
<div id="export-help" role="tooltip">
  Downloads your data as CSV or PDF. Max 10,000 rows.
</div>

// Inline help for complex fields
<label>
  Tax ID
  <span class="help-icon" aria-label="Format: XX-XXXXXXXX">?</span>
</label>
```

**Incorrect:**
- Only help is a 50-page PDF manual
- No tooltips or inline help for complex features
- Help content is generic, not context-aware

## Error Prevention Patterns

### Guarded Actions
```typescript
type GuardedAction<T> = {
  execute: () => Promise<T>;
  confirm?: {
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning';
  };
  undo?: {
    handler: () => Promise<void>;
    timeout?: number;
  };
};
```

### Form Validation Rules
- Validate inline (on blur), not just on submit
- Show errors near the relevant field
- Disable submit until form is valid (with explanation why)
- Preserve valid data when showing errors

## Feedback Patterns

| Type | Timing | Example |
|------|--------|---------|
| Immediate | < 0.1s | Button press, key stroke, toggle |
| Ongoing | 0.1s - 1s | Loading spinners, progress bars |
| Completion | After action | Toast, confirmation |
| Error | On failure | Alert with recovery |
| Empty state | First visit / no data | Illustration + CTA |

## Empty States

Every empty state should:
1. Explain what would normally appear here
2. Give the user a clear next action
3. Use an illustration or icon (optional, but adds personality)

```typescript
function EmptyState({ title, description, action }: {
  title: string;
  description: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div role="status" className="empty-state">
      <InboxIcon aria-hidden />
      <h2>{title}</h2>
      <p>{description}</p>
      <button onClick={action.onClick}>{action.label}</button>
    </div>
  );
}
```
