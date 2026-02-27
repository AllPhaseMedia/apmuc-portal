# Dashboard Announcements, Custom Pages & Client Navigation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dismissable dashboard announcement banner, custom content pages, and admin-managed sidebar links for clients.

**Architecture:** Three features sharing the existing SystemSetting key-value store (announcements, sidebar links) plus a new CustomPage Prisma model. The announcement banner renders markdown on the dashboard with localStorage-based dismiss. Custom pages are CRUD managed by admin and served at `/pages/[slug]`. Client sidebar links are fetched in the dashboard layout and passed to AppSidebar.

**Tech Stack:** Next.js 15, Prisma, SystemSetting model, React markdown rendering, shadcn/ui components, RichEditor for custom pages.

---

### Task 1: Dashboard Announcement — Server Actions & Data Fetching

**Files:**
- Modify: `src/actions/admin/branding.ts`
- Modify: `src/lib/branding.ts`

**Step 1: Add announcement server actions to branding.ts**

Add to the end of `src/actions/admin/branding.ts`:

```typescript
// ─── Dashboard Announcement ─────────────────────────────────

export async function getDashboardMessage(): Promise<
  ActionResult<{ message: string; messageId: string }>
> {
  try {
    await requireStaff();
    const map = await getSettingMap(["dashboardMessage", "dashboardMessageId"]);
    return {
      success: true,
      data: {
        message: map.dashboardMessage ?? "",
        messageId: map.dashboardMessageId ?? "",
      },
    };
  } catch (error) {
    console.error("[branding] getDashboardMessage error:", error);
    return { success: false, error: "Failed to load dashboard message" };
  }
}

export async function saveDashboardMessage(
  message: string
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("dashboardMessage", message);
    // Generate new messageId so dismissed banners reappear
    await upsertSetting("dashboardMessageId", crypto.randomUUID());
    return { success: true, data: { message: "Dashboard message saved" } };
  } catch (error) {
    console.error("[branding] saveDashboardMessage error:", error);
    return { success: false, error: "Failed to save dashboard message" };
  }
}
```

**Step 2: Add public getter in branding.ts**

Add a new cached function to `src/lib/branding.ts` (no auth required — used on client dashboard):

```typescript
export const getDashboardAnnouncement = cache(async () => {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: ["dashboardMessage", "dashboardMessageId"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      message: map.dashboardMessage || "",
      messageId: map.dashboardMessageId || "",
    };
  } catch {
    return { message: "", messageId: "" };
  }
});
```

**Step 3: Commit**

```
feat: add dashboard announcement server actions and data fetching
```

---

### Task 2: Dashboard Announcement — Settings UI

**Files:**
- Create: `src/components/admin/settings/dashboard-tab.tsx`
- Modify: `src/app/(dashboard)/admin/settings/page.tsx`

**Step 1: Create the Dashboard settings tab**

Create `src/components/admin/settings/dashboard-tab.tsx` — a client component with a textarea for the markdown message. Pattern follows `header-tab.tsx`:

- `useEffect` to fetch via `getDashboardMessage()`
- Textarea for markdown content
- Helper text: "Supports markdown. Leave blank to hide the banner."
- Save button calls `saveDashboardMessage(message)`
- Toast on success/error

**Step 2: Add "Dashboard" tab to settings page**

Modify `src/app/(dashboard)/admin/settings/page.tsx`:

- Import `DashboardTab`
- Add `<TabsTrigger value="dashboard">Dashboard</TabsTrigger>` after "branding"
- Add `<TabsContent value="dashboard"><DashboardTab /></TabsContent>`

**Step 3: Commit**

```
feat: add Dashboard tab to admin settings for announcement message
```

---

### Task 3: Dashboard Announcement — Banner Component

**Files:**
- Create: `src/components/dashboard/announcement-banner.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Create the AnnouncementBanner component**

Create `src/components/dashboard/announcement-banner.tsx` — a client component that:

- Accepts `message: string` and `messageId: string` props
- Checks `localStorage` key `dismissed-announcement` against `messageId`
- If dismissed and IDs match, returns null
- Otherwise renders a Card with info styling (blue-ish border, `Info` icon from lucide)
- Renders markdown content using a simple approach: split on `\n`, handle `**bold**`, `[links](url)`, etc. — or use `react-markdown` if already a dependency. Otherwise, render as `whitespace-pre-wrap` text with link detection.
- X button to dismiss (saves `messageId` to localStorage)

**Step 2: Add banner to dashboard page**

Modify `src/app/(dashboard)/dashboard/page.tsx`:

- Import `getDashboardAnnouncement` from `@/lib/branding`
- Fetch announcement in the `Promise.all` at top
- Render `<AnnouncementBanner>` between the welcome header and the first content section (both in the success and error/admin paths)

**Step 3: Commit**

```
feat: add dismissable announcement banner to dashboard
```

---

### Task 4: Custom Pages — Prisma Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add CustomPage model**

Add to `prisma/schema.prisma` after the Form models section:

```prisma
// ============================================================
// CUSTOM PAGES
// ============================================================

model CustomPage {
  id          String   @id @default(uuid())
  title       String
  slug        String   @unique
  content     String   @default("")
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([slug])
  @@index([isPublished])
}
```

**Step 2: Push schema**

Run: `npx prisma db push`

**Step 3: Generate client**

Run: `npx prisma generate`

**Step 4: Commit**

```
feat: add CustomPage model to Prisma schema
```

---

### Task 5: Custom Pages — Server Actions

**Files:**
- Create: `src/actions/admin/pages.ts`

**Step 1: Create server actions**

Create `src/actions/admin/pages.ts` with:

- `listPages()` — `requireStaff()`, returns all pages ordered by title
- `getPage(id: string)` — `requireStaff()`, returns single page
- `createPage(data: { title, slug, content, isPublished })` — `requireStaff()`, Zod validation, creates page
- `updatePage(id, data)` — `requireStaff()`, Zod validation, updates page
- `deletePage(id)` — `requireStaff()`, deletes page
- `getPublishedPage(slug: string)` — NO auth (used by public route), finds published page by slug

Follow the patterns in `src/actions/admin/branding.ts` — Zod validate, try/catch, return `ActionResult`.

**Step 2: Commit**

```
feat: add CRUD server actions for custom pages
```

---

### Task 6: Custom Pages — Admin List Page

**Files:**
- Create: `src/app/(dashboard)/admin/pages/page.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Create admin pages list**

Create `src/app/(dashboard)/admin/pages/page.tsx`:

- Server component, `requireStaff()`
- Fetch all pages via `listPages()`
- Header with "Pages" title and "Create Page" button linking to `/admin/pages/new`
- Table with columns: Title, Slug, Status (Published/Draft badge), Updated, Actions (Edit/Delete)
- Delete uses an AlertDialog pattern (same as delete user)

**Step 2: Add "Pages" to admin sidebar**

Modify `src/components/layout/app-sidebar.tsx`:

- Add `FileText` icon import (already imported, but verify — may need a second icon like `Newspaper` or `PanelLeft`)
- Add to `staffNav` array: `{ label: "Pages", href: "/admin/pages", icon: "FileText" }`
- Place after "Forms" in the array
- If `FileText` is already used by KB, use a different icon like `Newspaper` — import it from lucide

**Step 3: Commit**

```
feat: add admin pages list and sidebar nav item
```

---

### Task 7: Custom Pages — Admin Create/Edit Page

**Files:**
- Create: `src/app/(dashboard)/admin/pages/new/page.tsx`
- Create: `src/app/(dashboard)/admin/pages/[id]/page.tsx`
- Create: `src/components/admin/page-form.tsx`

**Step 1: Create PageForm component**

Create `src/components/admin/page-form.tsx` — a client component:

- Props: `page?: CustomPage` (undefined for create mode)
- Fields: Title (Input), Slug (Input, auto-generated from title on create), Published toggle (Switch)
- Content: RichEditor component (same as homepage content blocks)
- Save button calls `createPage` or `updatePage`
- Slug auto-generation: on title change, if slug hasn't been manually edited, generate slug from title (lowercase, replace spaces with hyphens, strip special chars)
- Toast on success, redirect to `/admin/pages` on create

**Step 2: Create the new page route**

Create `src/app/(dashboard)/admin/pages/new/page.tsx`:
- `requireStaff()`
- Render `<PageForm />`

**Step 3: Create the edit page route**

Create `src/app/(dashboard)/admin/pages/[id]/page.tsx`:
- `requireStaff()`
- Fetch page via `getPage(params.id)`
- Render `<PageForm page={page} />`

**Step 4: Commit**

```
feat: add create/edit UI for custom pages with rich editor
```

---

### Task 8: Custom Pages — Public Route

**Files:**
- Create: `src/app/(dashboard)/pages/[slug]/page.tsx`

**Step 1: Create public page route**

Create `src/app/(dashboard)/pages/[slug]/page.tsx`:

- Server component, `requireAuth()` (pages are for logged-in users)
- Fetch via `getPublishedPage(params.slug)`
- If not found, call `notFound()`
- Render title as `<h1>` and content as `dangerouslySetInnerHTML` (same approach as KB articles)
- Wrap in a clean layout with max-width

**Step 2: Commit**

```
feat: add public /pages/[slug] route for custom pages
```

---

### Task 9: Custom Sidebar Links — Server Actions

**Files:**
- Modify: `src/actions/admin/branding.ts`
- Modify: `src/lib/branding.ts`
- Modify: `src/types/branding.ts`

**Step 1: Add ClientNavLink type**

Add to `src/types/branding.ts`:

```typescript
export type ClientNavLink = {
  id: string;
  label: string;
  href: string;
  openInNewTab: boolean;
  order: number;
};
```

**Step 2: Add server actions for client nav links**

Add to `src/actions/admin/branding.ts`:

```typescript
// ─── Client Sidebar Links ───────────────────────────────────

export async function getClientNavLinks(): Promise<
  ActionResult<{ links: ClientNavLink[] }>
> {
  try {
    await requireStaff();
    const map = await getSettingMap(["clientNavLinks"]);
    let links: ClientNavLink[] = [];
    if (map.clientNavLinks) {
      try { links = JSON.parse(map.clientNavLinks); } catch { /* ignore */ }
    }
    return { success: true, data: { links } };
  } catch (error) {
    console.error("[branding] getClientNavLinks error:", error);
    return { success: false, error: "Failed to load client nav links" };
  }
}

export async function saveClientNavLinks(
  links: ClientNavLink[]
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireStaff();
    await upsertSetting("clientNavLinks", JSON.stringify(links));
    return { success: true, data: { message: "Client navigation saved" } };
  } catch (error) {
    console.error("[branding] saveClientNavLinks error:", error);
    return { success: false, error: "Failed to save client navigation" };
  }
}
```

**Step 3: Add public getter in branding.ts**

Add a cached function to `src/lib/branding.ts`:

```typescript
export const getClientNavLinks = cache(async (): Promise<ClientNavLink[]> => {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: "clientNavLinks" },
    });
    if (rows.length > 0 && rows[0].value) {
      return JSON.parse(rows[0].value);
    }
    return [];
  } catch {
    return [];
  }
});
```

Import `ClientNavLink` from `@/types/branding`.

**Step 4: Commit**

```
feat: add client nav links server actions and data fetching
```

---

### Task 10: Custom Sidebar Links — Settings UI

**Files:**
- Modify: `src/components/admin/settings/header-tab.tsx`
- Modify: `src/app/(dashboard)/admin/settings/page.tsx`

**Step 1: Rename Header tab to Navigation**

In `src/app/(dashboard)/admin/settings/page.tsx`:
- Change `<TabsTrigger value="header">Header</TabsTrigger>` to `<TabsTrigger value="header">Navigation</TabsTrigger>`

**Step 2: Add client sidebar links section to header-tab.tsx**

Modify `src/components/admin/settings/header-tab.tsx` (which is now the "Navigation" tab):

- Import `getClientNavLinks` and `saveClientNavLinks` from branding actions
- Import `Switch` from shadcn
- Add state for `clientLinks` array and `savingClientLinks` boolean
- Fetch client links in the existing `useEffect`
- Add a second Card below the header links card:
  - Title: "Client Sidebar Links"
  - Description: "Links shown in the sidebar for logged-in clients."
  - Same add/remove pattern as header links, but each link also has:
    - Label input
    - URL input
    - "Open in new tab" Switch
  - Save button calls `saveClientNavLinks(clientLinks)`

**Step 3: Commit**

```
feat: add client sidebar links management to Navigation settings tab
```

---

### Task 11: Custom Sidebar Links — Render in Sidebar

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Fetch client nav links in layout**

Modify `src/app/(dashboard)/layout.tsx`:

- Import `getClientNavLinks` from `@/lib/branding`
- Add to the `Promise.all`: `getClientNavLinks()`
- Pass as new prop: `customLinks={clientNavLinks}`

**Step 2: Render custom links in AppSidebar**

Modify `src/components/layout/app-sidebar.tsx`:

- Add `customLinks` to Props type: `customLinks?: ClientNavLink[]`
- Import `ClientNavLink` from `@/types/branding`
- Import `ExternalLink` icon from lucide-react
- After the client nav `SidebarGroup` (line ~167), render custom links if any exist:
  - New `SidebarGroup` with no label
  - Map over `customLinks` sorted by order
  - Each link uses `SidebarMenuButton` with:
    - `<a>` tag (not `<Link>`) if `openInNewTab` is true, with `target="_blank" rel="noopener noreferrer"`
    - `<Link>` tag for internal links
    - Small `ExternalLink` icon suffix for new-tab links

**Step 3: Commit**

```
feat: render custom client nav links in sidebar
```

---

### Task 12: Final Integration & Cleanup

**Step 1: Test all three features end-to-end**

- Settings > Dashboard tab: set a message, verify it shows on dashboard, dismiss it, change the message, verify it reappears
- Settings > Navigation tab: add client sidebar links (internal + external), verify they render in client sidebar
- Admin > Pages: create a page, publish it, verify it renders at `/pages/[slug]`, add a sidebar link pointing to it

**Step 2: Commit any fixes**

**Step 3: Push**

```bash
git push
```
