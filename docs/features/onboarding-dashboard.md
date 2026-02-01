# Feature: Dashboard Redesign (The "Home" Experience)

## Overview
The new Home Page (Dashboard) is designed to be a high-intimacy, mobile-first surface that greets the couple every time they open the app. It moves away from a utility-focused list to an emotional, dynamic space.

## Core Design Principles
1.  **Mobile-First**: Optimized for tall aspect ratios (18:9, 19.5:9).
2.  **Alive**: The screen should never look exactly the same twice (cycling photos, dynamic spotlight).
3.  **Intimate**: Focus on "Us" content (memories, notes, plans) rather than generic "apps".

---

## UI Components

### 1. Immersive Hero & Widget Stack (The Header)
**Visuals**:
- The top ~40-50% of the screen is a full-bleed background area.
- **Background**: Displays user-selected "Cover Photos".
    - **Behavior**: These cycle automatically (slideshow) or on app open to keep it fresh. Ideally supports multiple images.
- **Foreground (The Stack)**:
    - Overlaying the cover photo (at the bottom of the hero section) is a swipeable **Widget Stack** (Carousel).
    - **Card 1 (Default)**: "Days Together" counter + Current Date.
    - **Card 2**: Weather at partner's location (if location available).
    - **Card 3**: "Next Countdown" (if set).
- **Navigation**: The standard app header (logo/profile) overlays this hero section transparently.

### 2. The "Fridge Door" (Pinned Content)
**Concept**: A digital sticky note area.
- **Location**: Directly below the Hero section.
- **Functionality**:
    - Displays a *single* pinned item at a time.
    - Users can specific items from the Timeline (Photo, Text Note, Voice Memo) to "Pin to Fridge".
    - **Intention**: "Look at this photo I found," "Don't forget X," or just a sweet note.
- **Empty State**: Simple "Pin something for [Partner] to see" prompt.

### 3. Memory Spotlight
**Concept**: Algorithmic surfacing of nostalgia.
- **Location**: Prominent card in the main feed.
- **Behavior**:
    - Rotates content periodically (e.g., every 4-6 hours).
    - **Priority**:
        1. "On This Day" (Historical memories from previous years).
        2. "Last Weekend" (Recap of recent uploads).
        3. "Random Favorite" (High-engagement photo from the past).
- **Action**: Tapping opens the memory in full-screen detail view.

### 4. Shared Queue (Bucket List Preview)
**Concept**: Keeping future plans visible.
- **Location**: Below Memory Spotlight.
- **Content**: Two most recent *active* items from the Shared Bucket List.
- **Interaction**: Quick tap to mark as complete or add a new item.

---

## Technical Requirements (Database)
- **Lockets Table**: Needs support for *multiple* cover photos (currently single `cover_photo_url`).
    - *Migration Needed*: Move to a `locket_covers` table or change column to `cover_photo_urls` array (JSON/Array).
- **Pinned Items**: New table or column to track the currently pinned `timeline_item_id` and `pinner_id`.

---

## Implementation Prompt (For AI Agents)
**Copy and paste the following prompt to an AI coding agent to implement this feature:**

```markdown
# Role
You are an expert React/Next.js engineer with a keen eye for "Love-Tech" aesthetics (warm, inviting, fluid animations).

# Task
Refactor the `app/(main)/page.tsx` and `Dashboard.tsx` to implement the new "Immersive Home" design specification defined in `docs/features/onboarding-dashboard.md`.

# Specific Requirements

## 1. Database Updates
- **Cover Photos**: Update the schema to support *multiple* cover photos for a single Locket.
    - Create a migration to add a `locket_covers` table (locket_id, photo_url, order, added_at).
    - *Fallback*: If complex, use a JSONB column `cover_photos` on the `lockets` table.
- **Fridge Pin**: Add a mechanism to "Pin" a specific memory/note.
    - Add `pinned_memory_id` to the `lockets` table.

## 2. Frontend Components (Mobile First)
- **Hero Section**:
    - Create a full-width container for the top ~45vh.
    - Implement a background image slideshow (fade transition between user's cover photos).
    - Implement a `WidgetCarousel` component that sits at the bottom of the hero.
        - Slide 1: Days Together (Heart Icon + Counter).
        - Slide 2: Next Big Event (Countdown).
        - Slide 3: Weather (optional placeholder if API not ready).
- **The Fridge**:
    - Create a `PinnedNote` component.
    - Visuals: Should look slightly distinct, like a card pinned to a board (paper texture or shadow depth).
    - If a photo is pinned: Show the photo.
    - If a note is pinned: Show the text in a handwritten-style font (optional) or elegant serif.
- **Memory Spotlight**:
    - Implement a `SpotlightCard` that fetches a memory based on "On This Day" logic or random fallback.
    - Use `framer-motion` for smooth entry animations.
- **Bucket List**:
    - Refactor existing list widget to show top 2 active items with checkboxes.

## 3. Aesthetics
- Use the existing Tailwind theme (`rose-500`, `truffle` etc.).
- Ensure the layout counts for the "tall phone" use case (elements shouldn't be too cramped at the top).
- Add parallax scrolling effects for the Hero image if possible (image moves slower than scroll).

## 4. Execution Order
1.  Run DB Migrations.
2.  Update API endpoints (`/api/locket`, `/api/memories/spotlight`).
3.  Build the UI components.
4.  Integrate into `Dashboard.tsx`.
```
