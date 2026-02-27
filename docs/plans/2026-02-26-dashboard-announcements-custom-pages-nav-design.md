# Dashboard Announcements, Custom Pages & Client Navigation

**Date:** 2026-02-26

## 1. Dashboard Announcement Banner

- SystemSetting keys: `dashboardMessage` (markdown), `dashboardMessageId` (random string, changes on update)
- Renders at top of dashboard as info card with markdown content
- Dismissable via localStorage (keyed by messageId — reappears when message changes)
- Empty message = no banner
- Managed in Settings > Dashboard tab (new tab) — simple textarea

## 2. Custom Pages

- New `CustomPage` Prisma model: id, title, slug, content (HTML), isPublished, createdAt, updatedAt
- Served at `/pages/[slug]` for authenticated users
- New "Pages" admin section with list + create/edit UI
- Rich HTML editor for content
- Published/draft toggle

## 3. Custom Sidebar Links

- SystemSetting key: `clientNavLinks` — JSON array of `{ label, href, openInNewTab, order }`
- href can be external URL or internal path (e.g. `/pages/getting-started`)
- Rendered in client sidebar below existing nav items
- Managed in Settings > Navigation tab (renamed from Header), new "Client Sidebar Links" section
- Same add/remove UI as header links, plus "open in new tab" toggle per link
