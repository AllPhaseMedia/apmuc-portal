# Mass Email Feature Design

## Overview

A dedicated admin page for composing and sending mass emails to filtered audiences, with campaign history tracking.

## Route

`/admin/email` — two tabs: Compose and History

## Compose Flow

### Step 1: Audience

Filter recipients using combinable conditions (OR within category, AND across categories):

- **By tag** — multi-select from existing user tags
- **By service** — multi-select service types (matches clients with those services, includes linked users)
- **By integration** — checkboxes: Has Analytics, Has Uptime, Has Billing (matches clients with populated fields, includes linked users)
- **By role** — Admin, Team Member, Client
- **Manual include/exclude** — recipient list with checkboxes to remove individuals or add extras

Live count: "X recipients matched" as filters adjust.

### Step 2: Compose

- Subject line input
- Rich text editor (TipTap) — bold, italic, underline, links, headings (h2/h3), bullet/ordered lists, horizontal rule
- Content wrapped in existing branded email template
- Preview button for rendered HTML

### Step 3: Review & Send

- Shows subject, body preview, full recipient list with emails
- "Send to X recipients" confirmation button
- Emails sent individually via existing SMTP/nodemailer
- 100ms delay between sends for rate limiting
- Success/error toast on completion

## History Tab

Table of past campaigns: subject, recipient count, sent date, sent by. Click to expand for full recipient list and body.

## Database Models

```prisma
model EmailCampaign {
  id             String           @id @default(uuid())
  subject        String
  body           String           @db.Text
  sentByUserId   String
  sentByName     String
  sentAt         DateTime         @default(now())
  recipientCount Int
  createdAt      DateTime         @default(now())
  recipients     EmailRecipient[]
}

model EmailRecipient {
  id         String        @id @default(uuid())
  campaignId String
  email      String
  name       String
  status     String        @default("sent")
  campaign   EmailCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId])
}
```

## Tech

- **Editor**: TipTap (headless, shadcn-compatible)
- **Sending**: Existing nodemailer SMTP via sendEmail() from src/lib/email.ts
- **Email template**: Wrap body in existing branded HTML template
- **Rate limiting**: 100ms delay between individual sends
- **SMTP**: Postmark SMTP credentials configured via existing admin settings
