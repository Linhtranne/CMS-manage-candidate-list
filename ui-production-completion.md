# Local UI production-completion plan

## Goal

Make the local CMS usable end-to-end through the browser for all seeded roles, without relying on API smoke checks.

## Tasks

- [ ] Map each failing UI query to its backend controller and OpenAPI shape.
- [ ] Repair work queue, candidate list, and reporting compatibility.
- [ ] Repair admin users, templates, mailbox, audit, and catalog flows.
- [ ] Rebuild containers and run static/unit verification.
- [ ] Re-test login, logout, role guards, routes, empty states, and form flows in the browser.

## Done when

- Each permitted route renders a stable data/empty/error state instead of a generic page crash.
- Restricted routes show the access-denied state.
- Browser login/logout and CSRF-protected writes work for every seeded role.
- Fresh verification evidence is recorded before claiming completion.
