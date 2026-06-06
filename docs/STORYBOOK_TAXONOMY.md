# Storybook Folder Taxonomy

Locked 2026-06-06 via dex `z30nev3r` (epic `k7snhn1p` Tier 4d) and refined the same day per Max review of the deployed Storybook. Every `*.stories.tsx` file's `meta.title` MUST start with exactly one of the two top-level groups below.

## Two top-level groups

- **`Pages/<PageName>`** — page-level surfaces rendered by a Next route OR error-boundary surfaces (`NotFound`, `ErrorBoundary`, `GlobalError`). `<PageName>` names what the user sees at the route, not the implementation file: NO `View` / `Form` / `Page` suffix. Prefix sibling routes that share a parent path so they group alphabetically in the sidebar (e.g. `/book/[r]` family is `BookingEntry` / `BookingIntake` / `BookingGift` / `BookingLetter`). Examples: `Pages/Home`, `Pages/Privacy`, `Pages/Listen`, `Pages/ThankYou`.
- **`Components/<Subcategory>/<ComponentName>`** — every other story. Subcategory is one of the 7 listed below.

## Components subcategories

| Subcategory | Intent |
|---|---|
| `UI/` | Atomic design primitives. No business logic, no Sanity coupling. |
| `Forms/` | Form-input primitives that wrap or extend native inputs with project-specific behavior. |
| `Navigation/` | Top-level navigation chrome consumed across many routes. |
| `Content/` | Composed marketing or content sections that sit inside a route's main body. Often Sanity-driven. |
| `Feedback/` | Status indicators and transient UI affordances. |
| `Decorative/` | Pure visual treatments with no semantic content of their own. |
| `Layouts/` | Shared structural wrappers consumed by 2+ routes. Provide chrome and slot children. |

## Full mapping

| Story | Title |
|---|---|
| AuthVerify | `Pages/AuthVerify` |
| BookingEntry | `Pages/BookingEntry` |
| BookingGift | `Pages/BookingGift` |
| BookingIntake | `Pages/BookingIntake` |
| BookingLetter | `Pages/BookingLetter` |
| ErrorBoundary | `Pages/ErrorBoundary` |
| GiftIntake | `Pages/GiftIntake` |
| GlobalError | `Pages/GlobalError` |
| Home | `Pages/Home` |
| Listen | `Pages/Listen` |
| NotFound | `Pages/NotFound` |
| Privacy | `Pages/Privacy` |
| RefundPolicy | `Pages/RefundPolicy` |
| Terms | `Pages/Terms` |
| ThankYou | `Pages/ThankYou` |
| UnderConstruction | `Pages/UnderConstruction` |
| Button | `Components/UI/Button` |
| GoldDivider | `Components/UI/GoldDivider` |
| SectionHeading | `Components/UI/SectionHeading` |
| DateTimePicker | `Components/Forms/DateTimePicker` |
| PickerStacking | `Components/Forms/PickerStacking` |
| Select | `Components/Forms/Select` |
| Footer | `Components/Navigation/Footer` |
| Navigation | `Components/Navigation/Navigation` |
| ContactForm | `Components/Content/ContactForm` |
| FaqSection | `Components/Content/FaqSection` |
| Hero | `Components/Content/Hero` |
| HowItWorks | `Components/Content/HowItWorks` |
| ReadingCard | `Components/Content/ReadingCard` |
| TestimonialCard | `Components/Content/TestimonialCard` |
| Loader | `Components/Feedback/Loader` |
| GiftStatusPill | `Components/Feedback/GiftStatusPill` |
| CelestialOrb | `Components/Decorative/CelestialOrb` |
| StarField | `Components/Decorative/StarField` |
| LegalPageLayout | `Components/Layouts/LegalPageLayout` |

## Picking a placement for a new story

1. Does it represent a Next route (or an error-boundary surface)? → `Pages/<RouteName>`. Use the user-facing name, not the file name.
2. Otherwise → `Components/<Subcategory>/<ComponentName>`. Pick the subcategory from the table above.

If no subcategory fits, the story may not belong in Storybook at all. Reach for a refactor before inventing a new subcategory.

## Stories deliberately excluded from the sidebar

- `RoutingHooks` — a regression-test harness for the Storybook routing decorators. Lives as a runtime check, not a UI surface; removed from the story sidebar on 2026-06-06.
