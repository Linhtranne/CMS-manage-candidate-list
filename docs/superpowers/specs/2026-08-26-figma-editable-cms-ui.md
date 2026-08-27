# Figma editable CMS UI — implementation specification

## Outcome

The legacy Figma file (`YAg8I8FmOutAuUQGTBznFp`) will contain a first page with a production-reviewable, fully editable representation of the local CMS. Primary screens must be built from Figma frames, text, vectors, auto-layout containers, and reusable components. Raster screenshots are reference-only and must not be the primary UI.

## Source of truth

- Product routes: `/work`, `/clients`, `/orders`, `/candidates`, `/applications`, `/supply-journeys`, `/mailbox`, `/reports`, `/admin`, `/account`, candidate profile, and application detail.
- Product font: Be Vietnam Pro (400, 600, 700); Japanese locale uses Noto Sans JP.
- Product tokens from `apps/web/src/app/globals.css`: surface `#fbfaf7`, panel `#ffffff`, text `#182233`, muted text `#667085`, accent `#245ea8`, danger `#b42318`, success `#18794e`, warning `#a15c00`, border `#d9dee7`, control radius `8px`, panel shadow `0 10px 30px rgb(24 34 51 / 8%)`.
- Existing editable frames on the archive page are the starting scaffold. They are retained as a backup until the new page is visually verified.

## Page and frame structure

Create/repurpose a page named `UI editable · current screens` and place it before the archive page. Each route is a top-level frame at 1440px width with a consistent app shell:

1. `/work` — work queue table, priority/status chips, filters, row drawer.
2. `/clients` — client list, create/edit form, detail drawer.
3. `/orders` — order list, status/SLA fields, create/edit form, detail drawer.
4. `/candidates` — candidate list, filters, create/edit form, detail drawer.
5. `/applications` — screening list, candidate/order links, stage/decision actions.
6. `/supply-journeys` — journey list, progress/status, detail drawer.
7. `/mailbox` — conversation list, message thread, composer and send state.
8. `/reports` — KPI cards, source quality, customer/order, journey, mailbox/SLA, workload, data-quality sections, funnel table, and metric detail modal.
9. `/admin` — compact navigation tabs plus real sections for users/permissions, catalogs, templates, mailbox health, and audit.
10. `/account` — editable personal account profile, credentials/session area, save/error/success states.
11. Candidate profile — full candidate detail with editable profile sections, applications and activity.
12. Application detail — application header, stage history, interview/result/decision actions, linked candidate/order context.

## Reusable editable components

Create local Figma main components and use instances where repeated: app shell/sidebar item, top-bar action, button (primary/secondary/ghost/danger), text input/select, status chip (neutral/info/success/warning/danger), table header/row, tab, drawer header, modal header/footer, toast, empty/loading/error state. Components should use auto-layout and be named by purpose, not by screenshot coordinates.

## Required states

Include editable state frames or clearly labelled variants for create/edit candidate, client, order, application and account; interview scheduling/result/decision; mail composer/sent/error; report metric/funnel detail modal; notification popover; empty, loading, error, and forbidden states. Keep each state visually consistent with the shared shell.

## Content rules

- Use realistic Vietnamese CMS copy and the local route labels.
- Remove `DEMO-` identifiers, raw enum keys, placeholder headings, and explanatory marketing prose from the visible UI.
- Preserve the information architecture and interactions represented by the local app; do not invent unrelated CRM or candidate-portal functionality.
- Reports must show human-readable labels, correct percentages, and a chart/funnel area that can be edited as vectors/text rather than a screenshot.

## Review and acceptance criteria

- The current page opens to editable nodes; no primary screen is an image fill.
- Text can be selected and edited in Figma; repeated controls are instances of local components.
- At 1440×900, no visible crop, overlap, raw enum/`DEMO-` copy, or clipped modal/drawer content exists on the reviewed screens.
- Be Vietnam Pro is asserted on all free-standing text nodes; colors/radii/shadow match the source tokens.
- Verify at least `/work`, `/reports`, `/admin`, `/account`, candidate profile, application detail, one modal, one drawer, and one notification state with Figma screenshots before marking complete.

## Delivery notes

The old editable page remains as a backup. The screenshot-reference page is labelled as reference-only and is not used as the deliverable UI. After visual verification, the first page is the editable current page and the file URL remains the existing legacy file URL.
