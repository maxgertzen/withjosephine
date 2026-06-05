# Storybook Folder Taxonomy

Locked 2026-06-05 via dex `z30nev3r` (epic `k7snhn1p` Tier 4d). Every `*.stories.tsx` file's `meta.title` MUST start with exactly one of the top-level groups below, in the form `<Group>/<ComponentName>`. The set is closed: no `Other`, no `Misc`, no nested sub-groups beyond `<Group>/<Component>/<Variant>` when a single component needs sub-organization.

## Groups

| Group | Intent |
|---|---|
| `Pages/` | Page-level Views rendered by a Next route. One story file per route's presentational shell. Includes error-boundary surfaces (`NotFound`, `ErrorBoundary`, `GlobalError`) per the error-boundary carve-out in `CONTAINER_PRESENTATIONAL.md`. |
| `Layouts/` | Shared structural wrappers consumed by 2+ routes. Provide chrome and slot children. |
| `UI/` | Atomic design primitives. No business logic, no Sanity coupling. |
| `Forms/` | Form-input primitives that wrap or extend native inputs with project-specific behavior. |
| `Navigation/` | Top-level navigation chrome consumed across many routes. |
| `Content/` | Composed marketing or content sections that sit inside a route's main body. Often Sanity-driven. |
| `Feedback/` | Status indicators and transient UI affordances. |
| `Decorative/` | Pure visual treatments with no semantic content of their own. |
| `Smoke/` | Smoke and harness stories that exist only to exercise the Storybook host or routing layer. Not customer-visible components. |

## Mapping

| Story | Group | Title |
|---|---|---|
| BookingEntryView | Pages | `Pages/BookingEntryView` |
| GiftForm | Pages | `Pages/GiftForm` |
| GiftIntakeView | Pages | `Pages/GiftIntakeView` |
| IntakeForm | Pages | `Pages/IntakeForm` |
| LetterView | Pages | `Pages/LetterView` |
| ListenView | Pages | `Pages/ListenView` |
| ThankYouView | Pages | `Pages/ThankYouView` |
| NotFound (new, T4b) | Pages | `Pages/NotFound` |
| ErrorBoundary (new, T4b) | Pages | `Pages/ErrorBoundary` |
| GlobalError (new, T4b) | Pages | `Pages/GlobalError` |
| LegalPageLayout (new, T4a) | Layouts | `Layouts/LegalPageLayout` |
| Button | UI | `UI/Button` |
| GoldDivider | UI | `UI/GoldDivider` |
| SectionHeading | UI | `UI/SectionHeading` |
| DateTimePicker | Forms | `Forms/DateTimePicker` |
| PickerStacking | Forms | `Forms/PickerStacking` |
| Select | Forms | `Forms/Select` |
| Footer | Navigation | `Navigation/Footer` |
| Navigation | Navigation | `Navigation/Navigation` |
| ContactForm | Content | `Content/ContactForm` |
| FaqSection | Content | `Content/FaqSection` |
| Hero | Content | `Content/Hero` |
| HowItWorks | Content | `Content/HowItWorks` |
| ReadingCard | Content | `Content/ReadingCard` |
| TestimonialCard | Content | `Content/TestimonialCard` |
| Loader | Feedback | `Feedback/Loader` |
| GiftStatusPill | Feedback | `Feedback/GiftStatusPill` |
| CelestialOrb | Decorative | `Decorative/CelestialOrb` |
| StarField | Decorative | `Decorative/StarField` |
| RoutingHooks | Smoke | `Smoke/RoutingHooks` |

## Picking a group for a new story

1. Is it the presentational surface of a Next route? → `Pages/`
2. Is it a shared structural wrapper used by 2+ routes? → `Layouts/`
3. Is it a primitive design token (button, divider, heading)? → `UI/`
4. Is it a form input primitive? → `Forms/`
5. Is it nav chrome? → `Navigation/`
6. Is it a content section embedded inside a route? → `Content/`
7. Is it a status indicator or transient affordance? → `Feedback/`
8. Is it pure visual decoration? → `Decorative/`
9. Is it a smoke or harness story? → `Smoke/`

If none fit, the story may not belong in Storybook at all. Reach for a refactor before inventing a new group.
