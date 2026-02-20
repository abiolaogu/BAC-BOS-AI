# Figma Make Prompts -- BAC-BOS-AI
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

## 1. Overview

This document contains structured prompts for generating UI designs using Figma's AI-powered design tools (Figma Make / Figma AI). Each prompt describes a specific screen or component of the BAC-BOS-AI (NEXUS Business Operating System) platform, including layout, functionality, and visual style guidance.

### 1.1 Design System Foundations
- **Framework**: TailwindCSS + shadcn/ui component library
- **Typography**: Inter (headings), system font stack (body)
- **Color Palette**: Primary blue (#2563EB), secondary slate (#475569), accent emerald (#10B981), error red (#EF4444), warning amber (#F59E0B)
- **Border Radius**: 8px (cards), 6px (buttons), 4px (inputs)
- **Spacing**: 4px grid system, 16px base padding, 24px section gaps
- **Dark Mode**: Full support with slate-900 backgrounds and appropriate contrast ratios

---

## 2. Authentication Screens

### Prompt 2.1: Login Page
```
Design a modern SaaS login page for "NEXUS Business Operating System" by BAC.

Layout: Centered card on a gradient background (blue-600 to indigo-700).
Card contents: NEXUS logo at top, "Welcome back" heading, email input field,
password input field with show/hide toggle, "Remember me" checkbox,
"Sign in" primary button (blue-600, full width), "Forgot password?" link below,
divider with "or", "Sign in with Google" and "Sign in with Microsoft" social
buttons with icons. Footer text: "Don't have an account? Contact your admin."

Style: Clean, professional, shadcn/ui components, Inter font, rounded-lg card
with shadow-xl. Mobile responsive with the card taking full width on small screens.
```

### Prompt 2.2: MFA Verification
```
Design an MFA verification screen for NEXUS platform.

Layout: Same centered card style as login. Heading: "Two-Factor Authentication".
Subtext: "Enter the 6-digit code from your authenticator app."
Six individual digit input boxes in a row (auto-advance on input).
"Verify" primary button. "Use a different method" link offering SMS or Email OTP.
"Back to login" link at bottom. Show a small authenticator app icon illustration
above the heading.

Style: Consistent with login page. Clean, minimal, focused on the verification task.
```

---

## 3. Dashboard Screens

### Prompt 3.1: Main Dashboard
```
Design the main dashboard for NEXUS Business Operating System.

Layout: Left sidebar navigation (240px, dark slate-800 background) with icon+label
menu items: Home, CRM, Finance, Projects, HR, Inventory, Marketing, Support, Office
(expandable submenu: Mail, Drive, Writer, Sheets, Slides, Calendar, Chat, Meet),
AI Copilot. User avatar and name at sidebar bottom.

Top bar: Global search input (Ctrl+K hint), notification bell with badge count,
user avatar dropdown.

Main content area with a 2x3 grid of dashboard widgets:
1. Revenue chart (line chart, last 30 days)
2. Active deals (pipeline summary with stage counts)
3. Tasks due today (list with checkboxes and assignees)
4. Recent activity feed (icon + description + timestamp)
5. Calendar widget (mini monthly view with dots for events)
6. AI Copilot quick input (text field with "Ask AI..." placeholder)

Floating AI Copilot button in bottom-right corner (blue-600, circular, chat icon).

Style: Light background (slate-50), white cards with subtle shadows, blue-600 accents.
Professional SaaS dashboard aesthetic. TailwindCSS + shadcn/ui.
```

### Prompt 3.2: Admin Dashboard
```
Design an administrator dashboard for NEXUS platform management.

Layout: Same sidebar pattern but with admin-specific menu: Dashboard, Tenants,
Users, Modules, Monitoring, Security, Integrations, Settings.

Main content: Key metrics row at top (4 stat cards): Total Tenants, Active Users,
System Uptime (percentage with green indicator), Alerts (count with severity badges).

Below metrics: Left 60% is a "Service Health" panel showing a grid of service
status indicators (green/yellow/red circles with service names: nexus-engine,
crm-service, finance-service, ai-service, mail-service, etc.).
Right 40% is "Recent Activations" showing last 5 tenant activations with
business name, region, plan, and timestamp.

Bottom section: "Resource Utilization" with CPU, Memory, and Storage horizontal
bar charts across cluster nodes.

Style: Data-dense but clean. Use color coding for status. Monospace font for
technical values. Professional ops dashboard feel.
```

---

## 4. CRM Screens

### Prompt 4.1: Contact List View
```
Design a CRM contact list page for NEXUS platform.

Layout: Page header with "Contacts" title, search bar, filter button, and
"+ New Contact" primary button.

Below header: Active filter chips showing applied filters (removable with X).
Data table with columns: Checkbox, Avatar+Name, Email, Phone, Company, Tags
(colored badges), Last Activity, Actions (three-dot menu).

Table features: Sortable column headers, row hover highlight, bulk action bar
appears when checkboxes selected (Export, Tag, Delete). Pagination at bottom
with "Showing 1-50 of 1,234 contacts" and cursor-based navigation.

Right panel (slide-over, 400px): Contact detail preview showing when a row is
clicked. Shows avatar, full name, all fields, activity timeline, and quick
action buttons (Edit, Email, Call, Convert to Lead).

Style: Clean data table using shadcn/ui Table component. Subtle row borders.
Tags as small colored rounded badges. Professional CRM aesthetic.
```

### Prompt 4.2: Sales Pipeline Board
```
Design a visual sales pipeline board (Kanban style) for NEXUS CRM.

Layout: Page header with "Pipeline" title, filter controls, and view toggle
(Board/List/Forecast).

Pipeline columns (horizontally scrollable): Prospecting, Qualification,
Proposal, Negotiation, Closed Won, Closed Lost. Each column header shows
count and total value (e.g., "Proposal (8) - $125,000").

Deal cards in each column: Company name, deal title, value (bold), expected
close date, owner avatar, probability percentage. Card has a colored left
border matching the stage color. Drag handles for moving between stages.

At the bottom of each column: "+ Add deal" button.

Style: Card-based Kanban layout. Column backgrounds in subtle stage colors
(blue-50, green-50, yellow-50, etc.). Cards are white with rounded-lg and
shadow-sm. Drag-and-drop visual cue with dashed border placeholder.
```

---

## 5. Finance Screens

### Prompt 5.1: Invoice Builder
```
Design an invoice creation page for NEXUS Finance module.

Layout: Two-column form. Left column (60%): Customer selector (searchable
dropdown linked to CRM), invoice number (auto-generated), invoice date, due date,
payment terms dropdown (Net 15, Net 30, Custom).

Line items section: Table with columns: Item Description (text input),
Quantity (number input), Unit Price (currency input), Amount (calculated, read-only).
"+ Add Item" button below the table. Subtotal, Tax Rate (percentage input with
dropdown for saved rates), Discount (amount or percentage toggle), Total (bold,
large font).

Right column (40%): Live invoice preview card showing how the final invoice
looks with tenant branding (logo, company name, address, colors). Updates
in real-time as the form is filled.

Action bar at bottom: "Save as Draft" secondary button, "Send Invoice" primary
button, "Preview PDF" text button.

Style: Professional form layout. Currency values right-aligned. Preview card
resembles a printed invoice. shadcn/ui form components.
```

---

## 6. Office Suite Screens

### Prompt 6.1: Mail Client
```
Design an email client interface for NEXUS Mail service.

Layout: Three-panel layout. Left panel (220px): Folder tree (Inbox with unread
count badge, Sent, Drafts, Trash, custom folders). "Compose" primary button at
top of panel.

Middle panel (350px): Email list showing sender avatar, sender name, subject
(bold if unread), preview text (truncated), timestamp, star/flag toggle.
Search bar at top. Selected email has blue-50 background highlight.

Right panel (remaining): Email reader showing From, To, CC, Subject, date,
action buttons (Reply, Reply All, Forward, Archive, Delete, More). Email body
with proper HTML rendering. Attachment chips at bottom with download buttons.

Compose modal (overlay): Full email composer with To/CC/BCC fields, subject,
rich text editor toolbar (bold, italic, lists, links, images), attachment
button (upload or select from Drive), Send button.

Style: Gmail-inspired but with NEXUS branding. Clean, fast-looking. Unread
emails with bolder font weight. Subtle borders between panels.
```

### Prompt 6.2: Document Editor (Writer)
```
Design a collaborative document editor for NEXUS Writer service.

Layout: Top toolbar: File name (editable), Share button, collaborator avatars
(stacked, showing online status with green dots), Export dropdown (PDF, DOCX, HTML).

Formatting toolbar: Font family, font size, Bold, Italic, Underline, Strikethrough,
text color, highlight color, alignment (left/center/right/justify), heading levels
(H1-H3), bullet list, numbered list, indent, outdent, insert table, insert image,
insert link, code block.

Document canvas: A4-proportioned white page centered on a light gray background.
Content area with comfortable margins and line spacing. Show a colored cursor
with a collaborator's name label when others are editing.

Style: Google Docs-inspired. Toolbar with subtle gray background and icon buttons.
Clean document canvas focused on content. Minimal chrome. Smooth real-time
collaboration indicators.
```

---

## 7. AI Copilot Interface

### Prompt 7.1: AI Copilot Panel
```
Design an AI Copilot side panel for NEXUS platform.

Layout: Slide-over panel from right side (400px wide). Header: "AI Copilot"
title, model indicator (e.g., "GPT-4"), close button.

Chat area: Message bubbles. User messages right-aligned (blue-600 background,
white text). AI responses left-aligned (white background, dark text, with subtle
border). AI responses support: markdown formatting, tables, code blocks, charts,
and action buttons (e.g., "View in CRM", "Create Invoice", "Export to Sheets").

When AI is processing: Animated typing indicator (three dots pulsing).
When AI uses a tool: Show a collapsed "Queried CRM Service" badge that expands
to show the tool call details.

Input area at bottom: Text input with placeholder "Ask anything about your
business...", attachment button, send button. Above the input: suggested
prompts as clickable chips ("Revenue this month", "Overdue tasks", "New leads today").

Style: Modern chat interface. Smooth scrolling. Messages have rounded corners
and gentle shadows. Action buttons within AI responses styled as small outlined
buttons. The panel should feel intelligent and helpful.
```

---

## 8. Project Management Screens

### Prompt 8.1: Kanban Task Board
```
Design a project task board (Kanban view) for NEXUS Projects module.

Layout: Page header: Project name (dropdown to switch projects), view toggle
(Kanban/List/Gantt/Calendar), filter button, "+ Add Task" button.

Kanban columns: To Do, In Progress, In Review, Done. Each column header shows
task count. Columns are horizontally scrollable on mobile.

Task cards: Title (bold), colored priority indicator (red=Critical, orange=High,
blue=Medium, gray=Low), assignee avatar, due date (red if overdue), tag chips,
checklist progress bar (e.g., "3/5"), comment count icon.

Quick add: Each column has a "+ Add task" input at the bottom that creates a
task with just a title (details can be added later).

Task detail modal: Opens when clicking a card. Full task editing: title,
description (rich text), assignee selector, priority, due date, tags, checklist
items, comments thread, activity log, time tracking toggle.

Style: Trello/Linear-inspired. Clean white cards on a subtle gray column
background. Drag-and-drop with smooth animations. Priority colors as a small
left border accent on each card.
```

---

## 9. Business Activation Flow

### Prompt 9.1: Activation Wizard
```
Design a multi-step business activation wizard for NEXUS platform.

Layout: Full-page wizard with a progress stepper at top showing 7 steps:
1. Business Info, 2. Industry & Region, 3. Features, 4. Payments, 5. Communication,
6. Branding, 7. Review & Activate.

Step 1 (Business Info): Business name input, team size slider (5-500+),
preferred domain input.

Step 2 (Industry & Region): Industry card selector (grid of cards with icons:
eCommerce, Healthcare, Logistics, Education, Professional Services, etc.),
Region dropdown, Currency auto-selected based on region.

Step 3 (Features): Toggle grid showing all available modules with descriptions.
Each toggle card has an icon, module name, brief description, and on/off switch.
Industry preset has pre-selected relevant modules.

Step 7 (Review & Activate): Summary of all selections in a clean card layout.
"Activate My Business" large primary button.

After activation: Animated progress page showing each of the 7 provisioning
steps with checkmarks appearing as they complete. Confetti animation on completion.
Final screen shows credentials and "Go to Dashboard" button.

Style: Modern onboarding wizard. One step visible at a time. Back/Next buttons.
Clean typography, generous spacing. Exciting and confidence-building for new users.
```

---

## 10. Responsive Design Prompts

### Prompt 10.1: Mobile Navigation
```
Design mobile-responsive navigation for NEXUS platform.

Layout: Bottom tab bar (5 items): Home, CRM, Office, Projects, More.
"More" opens a full-screen menu with all other modules.

Top bar: Hamburger menu (opens full sidebar overlay), page title, notification
bell, profile avatar.

Content: Full-width cards, stacked vertically. Tables become card-based lists
on mobile. Sidebar panel components become full-screen modals on mobile.

AI Copilot: Floating action button in bottom-right, opens full-screen chat
overlay on mobile.

Style: Touch-friendly (44px minimum tap targets). Bottom tab bar with icon
and label. Smooth transitions between views. Consistent with desktop design
language but optimized for thumb navigation.
```

---

## 11. Design Token Reference

### 11.1 Colors
```
--primary: #2563EB (blue-600)
--primary-hover: #1D4ED8 (blue-700)
--secondary: #475569 (slate-600)
--accent: #10B981 (emerald-500)
--error: #EF4444 (red-500)
--warning: #F59E0B (amber-500)
--success: #22C55E (green-500)
--background: #F8FAFC (slate-50)
--surface: #FFFFFF
--text-primary: #0F172A (slate-900)
--text-secondary: #64748B (slate-500)
--border: #E2E8F0 (slate-200)
```

### 11.2 Typography
```
--font-heading: 'Inter', sans-serif
--font-body: system-ui, -apple-system, sans-serif
--font-mono: 'JetBrains Mono', monospace

--text-xs: 0.75rem    --text-sm: 0.875rem
--text-base: 1rem     --text-lg: 1.125rem
--text-xl: 1.25rem    --text-2xl: 1.5rem
--text-3xl: 1.875rem  --text-4xl: 2.25rem
```

### 11.3 Spacing and Layout
```
--radius-sm: 4px   --radius-md: 6px   --radius-lg: 8px   --radius-xl: 12px
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.07)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1)
--sidebar-width: 240px
--topbar-height: 64px
```

---

*These prompts are designed for use with Figma's AI design tools. Adjust specificity based on the tool's capabilities. All designs should follow the NEXUS design system tokens defined in Section 11.*
