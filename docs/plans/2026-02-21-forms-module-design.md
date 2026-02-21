# Forms Module Design

## Summary

A full forms module for the APMUC portal: admin-built dynamic forms with drag-and-drop visual builder, public/private form pages, configurable submission handling (email + DB + webhook), and service CTA integration replacing the current URL/mailto approach.

## Problem

Service CTA buttons under "Grow Your Business" currently open external URLs or mailto links. This is inconsistent and clunky for clients already logged into the portal. Additionally, the support ticket form is hardcoded and can't be edited without code changes.

## Solution

A general-purpose forms system that:
- Replaces service CTAs with pre-filled inquiry forms
- Makes the support form admin-editable
- Enables public standalone forms for lead gen, feedback, etc.
- Stores submissions with configurable notification routing

---

## Data Models

### Form

| Field       | Type             | Description                                    |
|-------------|------------------|------------------------------------------------|
| id          | String (uuid)    | Primary key                                    |
| name        | String           | Admin-facing name ("SEO Inquiry Form")         |
| slug        | String (unique)  | URL slug for public access                     |
| description | String?          | Optional subtitle shown on the form            |
| fields      | Json             | Array of field definitions                     |
| settings    | Json             | Notification/behavior config                   |
| isActive    | Boolean          | Can be deactivated without deleting            |
| isPublic    | Boolean          | Accessible at /forms/[slug] without auth       |
| createdAt   | DateTime         |                                                |
| updatedAt   | DateTime         |                                                |

#### fields JSON structure

```json
[
  {
    "id": "field_abc123",
    "type": "text|textarea|email|phone|select|checkbox|radio|heading|divider",
    "label": "Your Name",
    "placeholder": "Enter your name",
    "required": true,
    "options": ["Option A", "Option B"],
    "width": "full|half",
    "order": 0,
    "conditions": [
      { "fieldId": "field_xyz", "operator": "equals", "value": "Yes" }
    ],
    "prefillKey": "name|email|website|serviceName"
  }
]
```

#### settings JSON structure

```json
{
  "type": "standard|helpscout",
  "emailNotification": true,
  "emailTo": "support@allphasemedia.com",
  "storeSubmissions": true,
  "webhookUrl": null,
  "submitButtonLabel": "Submit",
  "successMessage": "Thanks! We'll be in touch.",
  "redirectUrl": null
}
```

### FormSubmission

| Field     | Type                    | Description                              |
|-----------|-------------------------|------------------------------------------|
| id        | String (uuid)           | Primary key                              |
| formId    | String                  | FK to Form                               |
| data      | Json                    | Submitted field values                   |
| metadata  | Json                    | clientId, email, ip, userAgent           |
| status    | Enum (NEW, READ, ARCHIVED) | Submission lifecycle                  |
| createdAt | DateTime                |                                          |

### RecommendedService change

Add `formId String?` — FK to Form. When set, the CTA opens the assigned form (pre-filled). When null, falls back to existing `ctaUrl` behavior.

---

## Admin Form Builder UI

### /admin/forms — List page

Table: Name, Slug, Active/Inactive, Public?, Submission count, Edit/Delete actions. "Create Form" button.

### /admin/forms/[id] — Builder page

**Left panel:**
- Top: draggable field type palette (Text, Textarea, Email, Phone, Select, Radio, Checkbox, Heading, Divider)
- Below: current form's field list as draggable cards (type icon, label, drag handle, click to configure, delete)

**Right panel (two modes):**
1. Preview mode (default): live form preview as clients see it
2. Configure mode (field selected): field settings — label, placeholder, required, options, width, conditions, prefill key

**Top bar:**
- Inline-editable form name
- Auto-generated slug (editable)
- Active/Public toggles
- Settings button (drawer: email to, store submissions, webhook, success message, submit label)
- Save button

**DnD library:** @dnd-kit/core

### /admin/forms/[id]/submissions — Submissions page

Table: Date, key field preview, Status. Click for detail. Bulk actions: Mark Read, Archive, Delete. CSV export.

---

## Client Experience

### Service CTA flow (dashboard)

1. Client sees "Grow Your Business" cards
2. Service with `formId`: CTA opens a modal dialog with the form
3. Client info (name, email) and service name pre-filled via prefillKey
4. Submit: client-side validation, server action processes, success message, dialog closes

### Public form pages: /forms/[slug]

- Standalone page, no auth required
- Branded layout (APM | UC, centered card)
- Same FormRenderer component as modal
- Logged-in clients get auto-prefill; anonymous users start empty

### Support form

- Default "Support Request" form created during migration/seed
- /support/new renders this form via FormRenderer
- Form has `settings.type = "helpscout"` — submissions create Help Scout conversations
- Admin can add/remove/reorder fields without code changes

---

## Form Renderer Component

Shared `<FormRenderer>` component:
- Input: form fields JSON + optional prefill data
- Renders all field types with validation
- Reactive conditional show/hide logic
- Works in modal and full-page contexts
- Client-side Zod validation dynamically built from field config

---

## Submission Processing

```
submitForm(formId, data) ->
  1. Auth check (optional — skip for public forms)
  2. Load form from DB
  3. Validate data against form field schema
  4. If settings.type === "helpscout": create Help Scout conversation
  5. If storeSubmissions: save FormSubmission to DB
  6. If emailNotification: send email to configured address
  7. If webhookUrl: POST JSON payload
  8. Return success/error
```

### Email notifications

- Formatted email with form name, all field values, timestamp, link to admin submissions
- Configurable "To" address per form
- Uses Nodemailer or Resend (TBD based on existing setup)

---

## Field Types

| Type     | Renders As         | Has Options | Has Placeholder |
|----------|--------------------|-------------|-----------------|
| text     | Text input         | No          | Yes             |
| textarea | Textarea           | No          | Yes             |
| email    | Email input        | No          | Yes             |
| phone    | Tel input          | No          | Yes             |
| select   | Dropdown           | Yes         | Yes             |
| radio    | Radio group        | Yes         | No              |
| checkbox | Checkbox group     | Yes         | No              |
| heading  | H3 text (display)  | No          | No              |
| divider  | Horizontal rule    | No          | No              |

---

## Conditional Logic

Simple show/hide: each field can have a `conditions` array. All conditions must be met (AND logic) for the field to show. Supported operators: `equals`, `notEquals`, `contains`, `isEmpty`, `isNotEmpty`.

---

## Routes Summary

| Route                          | Auth     | Purpose                      |
|--------------------------------|----------|------------------------------|
| /admin/forms                   | Admin    | Form list                    |
| /admin/forms/[id]              | Admin    | Form builder                 |
| /admin/forms/[id]/submissions  | Admin    | Submission list + detail     |
| /forms/[slug]                  | Public   | Public form page             |
| /support/new                   | Client   | Support form (renders Form)  |
