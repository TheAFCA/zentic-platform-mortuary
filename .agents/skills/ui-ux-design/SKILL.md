---
name: ui-ux-design
description: Design exceptional user interfaces and user experiences grounded in usability heuristics, visual design principles, and human-centered design. Use when asked to design UI/UX, create wireframes, improve usability, design user flows, craft design systems, build prototypes, or conduct user research for web and mobile applications.
license: MIT
metadata:
  author: zentic-platform
  version: "1.0"
---

# UI/UX Design

User interface and user experience design based on established design principles, usability research, and industry best practices. This skill covers the full design process from research and ideation to visual design and interaction patterns.

## Design Process Overview

| Phase | Activities | Outputs |
|-------|-----------|---------|
| **Empathize** | User research, interviews, analytics | Personas, journey maps, pain points |
| **Define** | Problem framing, requirements | Problem statement, user stories |
| **Ideate** | Sketching, brainstorming, conceptual directions | Wireframes, design directions |
| **Prototype** | Hi-fi mockups, interactive prototypes | Clickable prototypes, design specs |
| **Test** | Usability testing, heuristic evaluation | Test findings, iteration priorities |

## Quick Reference

| Rule | Category | Impact | See |
|------|----------|--------|-----|
| Follow usability heuristics | Usability | CRITICAL | [usability.md](./references/usability.md) |
| Establish visual hierarchy | Visual Design | CRITICAL | [visual-design.md](./references/visual-design.md) |
| Use consistent design patterns | Design Systems | HIGH | [design-systems.md](./references/design-systems.md) |
| Design accessible interfaces | Accessibility | CRITICAL | [accessibility.md](./references/accessibility.md) |
| Apply Gestalt principles | Visual Design | HIGH | [visual-design.md](./references/visual-design.md) |
| Use progressive disclosure | Interaction | HIGH | [interaction.md](./references/interaction.md) |
| Design for mobile first | Responsive | HIGH | [responsive.md](./references/responsive.md) |
| Create clear error states | Usability | HIGH | [usability.md](./references/usability.md) |
| Use appropriate typography | Visual Design | MEDIUM | [visual-design.md](./references/visual-design.md) |
| Maintain color contrast | Accessibility | CRITICAL | [accessibility.md](./references/accessibility.md) |
| Design meaningful micro-interactions | Interaction | MEDIUM | [interaction.md](./references/interaction.md) |
| Structure information clearly | IA | HIGH | [information-architecture.md](./references/information-architecture.md) |
| Use motion with purpose | Animation | MEDIUM | [motion.md](./references/motion.md) |
| Design empty states | Usability | MEDIUM | [usability.md](./references/usability.md) |
| Follow platform conventions | Design Systems | HIGH | [design-systems.md](./references/design-systems.md) |

## Related Skills

- [accessibility](../accessibility/SKILL.md) — Deep dive on WCAG compliance
- [frontend-design](../frontend-design/SKILL.md) — Production frontend implementation
- [tailwind-css-patterns](../tailwind-css-patterns/SKILL.md) — Utility-first CSS implementation

## Design Principles

### 1. Usability First
A beautiful interface that confuses users is a failure. Every design decision must be evaluated against: Is this intuitive? Does it reduce cognitive load? Does it prevent errors?

### 2. Consistency Reduces Friction
Users build mental models from repeated patterns. Consistent placement, behavior, and visual language across screens reduces learning cost and builds confidence.

### 3. Visual Hierarchy Guides Action
The eye should naturally flow through content in order of importance. Use size, color, contrast, spacing, and position to create clear focal points and reading sequences.

### 4. Accessibility is Not Optional
Design for all users from the start. Accessible design benefits everyone — high contrast helps users in sunlight, good labels help non-native speakers, keyboard navigation helps power users.

### 5. Context Over Consistency
Consistency is important, but context wins. A mobile form should feel different from a desktop dashboard. The design should adapt to the user's goals, device, and environment.

## References

Detailed guidance on each topic is in the `references/` directory:

| File | Topics |
|------|--------|
| [usability.md](./references/usability.md) | Nielsen's heuristics, error prevention, feedback, user control |
| [visual-design.md](./references/visual-design.md) | Typography, color, layout, Gestalt principles, hierarchy |
| [interaction.md](./references/interaction.md) | Micro-interactions, transitions, feedback loops, progressive disclosure |
| [information-architecture.md](./references/information-architecture.md) | Navigation, content organization, search, labeling |
| [design-systems.md](./references/design-systems.md) | Component libraries, design tokens, documentation, governance |
| [accessibility.md](./references/accessibility.md) | Inclusive design, screen readers, keyboard nav, color contrast |
| [responsive.md](./references/responsive.md) | Mobile-first, breakpoints, touch targets, adaptive layouts |
| [motion.md](./references/motion.md) | Animation principles, timing, easing, meaningful motion |

## Sources

- Nielsen Norman Group — Usability heuristics and research
- Material Design 3 — Design guidelines and components
- Human Interface Guidelines — Apple's design principles
- WCAG 2.2 — Web Content Accessibility Guidelines
- Laws of UX — Design psychology principles
