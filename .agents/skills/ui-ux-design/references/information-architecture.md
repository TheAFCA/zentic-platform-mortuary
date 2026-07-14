---
title: Information Architecture
impact: HIGH
impactDescription: Poor IA causes users to get lost, unable to find content or complete tasks. Well-structured IA reduces support costs and improves task success rates.
tags: information-architecture, navigation, content-organization, search, labeling
---

# Information Architecture

## Core IA Principles

### 1. The Pyramid of IA

```
       Task completion
      ┌─────────────┐
      │  Navigation  │
     ┌────────────────┐
     │ Content Structure│
    ┌────────────────────┐
    │  Labeling & Taxonomy │
   ┌────────────────────────┐
   │   User Needs & Context   │
   └────────────────────────┘
```

### 2. Organization Schemes

| Scheme | Best For | Example |
|--------|----------|---------|
| Alphabetical | Directories, indexes | A-Z employee list |
| Chronological | Time-based content | Blog posts, news |
| Hierarchical | Most web content | Category → subcategory → product |
| Geographical | Location-based | Store locator, events |
| Topical/Subject | Knowledge bases | Help center by topic |
| Task-oriented | Applications | "Create invoice", "Send report" |
| Audience-specific | Portals | Admin / Manager / Employee |

### 3. The 3-Click Rule (Guideline, Not Law)
Users should reach any content within 3 clicks. More important: users should always feel oriented and have confidence they're on the right path.

## Navigation Patterns

### Primary Navigation

```typescript
type NavItem = {
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: string;
  children?: NavItem[];
  isActive: boolean;
};

function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Main navigation">
      <ul>
        {items.map(item => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.isActive ? 'page' : undefined}
              className={item.isActive ? 'active' : ''}
            >
              {item.icon && <span aria-hidden>{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </a>
            {item.children && (
              <ul className="sub-nav">
                {item.children.map(child => (
                  <li key={child.href}>
                    <a href={child.href}>{child.label}</a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Breadcrumbs

```typescript
function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={item.label}
              aria-current={isLast ? 'page' : undefined}
            >
              {isLast ? (
                <span>{item.label}</span>
              ) : (
                <>
                  <a href={item.href}>{item.label}</a>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

### Search Architecture

**Search should be:**
- Always accessible (typically top-right or prominent)
- Visible by default (not hidden behind an icon on desktop)
- Tolerant of typos and partial matches
- Showing results as the user types (with debounce)

## Content Organization

### Card Sorting Method
1. Open card sort: users group items without predefined categories
2. Closed card sort: users place items into predefined categories
3. Hybrid: users can create new categories if needed

### Content Audit Checklist
- [ ] Every piece of content has a clear owner
- [ ] Remove or archive outdated content
- [ ] Merge duplicate or overlapping content
- [ ] Identify content gaps
- [ ] Standardize format across similar content types

## Labeling Conventions

### Navigation Labels
| Label | When to Use |
|-------|-------------|
| Home | Main landing / dashboard |
| Products | Commercial offerings |
| Services | What we do |
| Resources | Helpful content (docs, guides) |
| About | Company / team info |
| Contact | Get in touch |
| Blog | News / articles |
| Support / Help | Troubleshooting / FAQs |

### Page Titles & Headings
- Primary heading (h1): unique, descriptive, matches the link that led here
- Subheadings (h2, h3): scannable, information-rich
- Button labels: verb-driven ("Create report", not "Reports")

## IA Testing Methods

| Method | Users | When |
|--------|-------|------|
| Tree testing | Remote, unmoderated | Early structure validation |
| Card sorting | Remote, in-person | Discovery & organization |
| First-click testing | Remote | Navigation effectiveness |
| Reverse card sort | Remote | Label validation |
| Scent mapping | In-person | Task flow evaluation |
