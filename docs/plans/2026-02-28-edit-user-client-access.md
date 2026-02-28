# Edit User Client Access Design

## Overview

Expand the Edit User dialog with a "Client Access" section for managing client links and per-client permissions inline.

## Client Access Section

Below existing name/role/tags fields in Edit User dialog:

**Linked Clients list** — For each linked client:
- Client name
- Role label (editable text input)
- 6 permission toggles: Dashboard, Billing, Analytics, Uptime, Support, Site Health
- Remove link button with confirmation

**Add Client** — Combobox to pick from unlinked clients. Creates link with all permissions enabled by default.

## Save Behavior

- Adding/removing client links happens immediately via existing server actions
- Permission/role label changes save per-client via updateClientContact
- Main form (name, role, tags) saves separately as today

## Data Requirements

- Expand ClerkUserInfo.linkedClients to include full ClientContact data (permissions, roleLabel)
- New listAllClients action for the client picker (existing listAvailableUsers is client-scoped)
- Reuse existing addClientContact, updateClientContact, removeClientContact actions
