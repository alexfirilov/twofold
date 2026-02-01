# Feature: Locket Setup Wizard (Onboarding)

## Overview
The Locket Setup Wizard guides new users through creating their couple's space with a 4-step onboarding flow. It collects meaningful relationship details that personalize the Dashboard experience.

## Implementation Status: Complete

---

## Wizard Steps

### Step 1: Profile Setup
- **User Avatar**: Upload profile photo (optional)
- **Nickname**: How the user wants to be called in the app
- **UI**: Circular avatar upload with edit button, text input for nickname

### Step 2: Locket Details
- **Locket Name**: Custom name for their space (default: "Our Locket")
  - Examples: "Alex & Sarah's Fortress", "The Nook", "Our Story"
- **Anniversary Date**: When the relationship started
  - **UI**: Three dropdown selectors (Month, Day, Year)
  - **Feature**: "I don't remember the exact day" checkbox - allows month-only selection
  - **Purpose**: Powers the "Days Together" counter on Dashboard
- **Location Origin**: Where they met (optional)
  - **UI**: Text input with Google Places Autocomplete
  - **Purpose**: Displayed as a badge on Dashboard

### Step 3: Set the Vibe (Cover Photo)
- **Cover Photo**: Visual identity for the couple's Timeline
  - **UI**: 16:9 aspect ratio upload area
  - **Features**:
    - Drag to reposition (pan) the image within the frame
    - Zoom slider (100% - 200%) with +/- buttons
    - Portrait images: vertical panning
    - Landscape images: horizontal panning
    - When zoomed in: pan in all directions
  - **Purpose**: Displayed as circular hero image on Timeline page header

### Step 4: Invite Partner
- **Partner Email**: Send invite via email
- **Alternative**: Generate shareable invite link
- **Skip Option**: Can skip and invite later

---

## Database Schema

### `lockets` table columns (added via migration 006):
```sql
anniversary_date DATE           -- When the relationship started
cover_photo_url TEXT            -- URL to uploaded cover photo (GCS)
location_origin TEXT            -- Where the couple met (place name)
next_countdown_event_name VARCHAR(255)  -- Custom countdown event name
next_countdown_date DATE        -- Custom countdown target date
```

---

## App Integration

### Timeline Page Header
When `cover_photo_url` is set:
- Displays as a large circular image (32x32 to 40x40) at the top of the Timeline
- Replaces the default partner avatars display
- Shows "X days together" badge below the cover photo (when anniversary set)

When `cover_photo_url` is NOT set:
- Shows overlapping partner avatars (default behavior)
- Shows "Together Forever" badge if no anniversary date
- Shows "X days together" badge if anniversary date is set

### Dashboard
**Days Together Counter:**
When `anniversary_date` is set and in the past:
- Calculates days since anniversary
- Displays as a badge with heart icon: "X days together"
- Shown as inline badge below page header

**Location Origin Badge:**
When `location_origin` is set:
- Displays with map pin icon
- Shown alongside days together counter

**Countdown Widget:**
When `anniversary_date` is set:
- Calculates next anniversary occurrence
- Shows countdown to upcoming anniversary
- Title: "Anniversary" (or custom event name if set)

---

## Technical Implementation

### Files Modified
| File | Changes |
|------|---------|
| `database/migrations/006_add_cover_photo_and_location.sql` | New columns for lockets table |
| `database/multi-tenant-schema.sql` | Schema updated for fresh installs |
| `app/lib/types.ts` | `Locket`, `CreateLocket`, `UpdateLocket` interfaces |
| `app/lib/db.ts` | `createLocket()`, `updateLocket()` functions |
| `app/api/lockets/route.ts` | POST endpoint accepts new fields |
| `app/api/lockets/[id]/route.ts` | PUT endpoint accepts new fields |
| `app/components/LocketCreator.tsx` | Complete wizard implementation |
| `app/(main)/components/Dashboard.tsx` | Days counter, location badges |
| `app/(main)/timeline/components/TimelineFeed.tsx` | Cover photo display in header |

### API Endpoints

**POST /api/lockets** - Create locket
```json
{
  "name": "Our Story",
  "anniversary_date": "2020-06-15",
  "cover_photo_url": "https://storage.../cover.jpg",
  "location_origin": "Paris, France"
}
```

**PUT /api/lockets/:id** - Update locket
```json
{
  "anniversary_date": "2020-06-15",
  "cover_photo_url": "https://storage.../cover.jpg",
  "location_origin": "Paris, France"
}
```

---

## UI/UX Details

### Wizard Navigation
- Step indicator at top showing progress (1-4)
- Completed steps show checkmark
- Back button on steps 2-4
- "Skip for now" option on steps 2-3
- Smooth slide animations between steps

### Cover Photo Editor
- 16:9 aspect ratio preview
- Smart aspect ratio detection:
  - Portrait photos: fill width, pan vertically
  - Landscape photos: fill height, pan horizontally
- Zoom control: slider + buttons (100%-200%)
- Drag to reposition with mouse or touch
- "Drag to reposition" hint on hover
- "Choose a different photo" button after upload

### Date Selector
- Separate dropdowns for Month, Day, Year
- Dynamic day count based on selected month/year
- Checkbox: "I don't remember the exact day"
  - Hides day selector
  - Saves as 1st of the month

### Places Autocomplete
- Powered by Google Places API (`/api/places/autocomplete`)
- Debounced search (300ms)
- Keyboard navigation (arrows, enter, escape)
- Shows place name + description

---

## Future Enhancements (Not Yet Implemented)

- **Color Theme**: Custom UI color palettes
- **Partner's Birthday**: Birthday reminders
- **Relationship Status**: Dating, Engaged, Married
- **"Our Song"**: Spotify integration
- **First Memory Prompt**: Guided first upload
