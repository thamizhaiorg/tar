# 📁 File Manager & File Entity Integration – Implementation Instructions

## 1. Add `files` Entity to InstantDB Schema
- **Entity name:** `files`
- **Fields:**
  - `id`: string (UUID, primary key)
  - `title`: string (required, user-friendly name)
  - `url`: string (required, public URL to file)
  - `handle`: string (required, unique identifier for file, used for referencing)
  - `alt`: string (optional, alt text for accessibility)
  - `type`: string (required, MIME type, e.g. `image/png`)
  - `size`: number (required, file size in bytes)
  - `reference`: string (optional, references to product/collection/option/etc.)
  - `dateAdded`: date (auto, when file was uploaded)

## 2. Add "Files" to Commerce Menu List
- Update the commerce navigation (ComList) to include a new entry:
  ```ts
  { id: 'files', title: 'Files' }
  ```
- Place it logically after "Collections", "Options", etc.

## 3. Files Screen (File Manager)
- Create a new screen/component: `files.tsx`
- **UI/UX Requirements:**
  - Modern, clean, minimal, mobile-first (better than Shopify reference)
  - Grid/list toggle for file display
  - File preview thumbnails
  - Search and filter by type, title, reference
  - Tap to view file details (title, alt, type, size, reference, date)
  - **No delete feature** (see below)
  - **Replace feature:** User can upload a new file to replace an existing one (preserving references)
  - Upload button: opens upload dialog (see below)
  - Smooth transitions, instant feedback, real-time updates

## 4. Image Upload UI Everywhere (Products, Collections, Options, etc.)
- Replace all image upload UIs with a new, unified component matching "image 2" reference:
  - Large upload area with drag-and-drop and tap-to-select
  - Shows preview, progress, and error states
  - Allows replacing image (not deleting)
  - On upload, file is added to `files` entity and linked to the relevant product/collection/option via `reference`

## 5. Cloudflare R2 Integration
- All files are stored in Cloudflare R2.
- **Path structure:** `/userid/productname/randomnumber/filename.ext`
  - `userid`: sanitized (no symbols)
  - `productname`/`collectionname`/`optionname`: sanitized, lowercase, no spaces/symbols
  - `randomnumber`: unique, to prevent conflicts
  - Example: `/12345abc/shirt/987654321/image.png`
- On upload, generate path as above and upload to R2.
- Store resulting URL and handle in the `files` entity.

## 6. File Deletion Policy
- **No delete in file manager:** Files can only be replaced, not deleted, to avoid breaking references.
- **Deletion only via reference removal:** If a product/collection/option is deleted, remove the file from file manager and R2 only if it is not referenced elsewhere.

## 7. General Requirements
- All file operations (upload, replace) must update the `files` entity in InstantDB and sync in real time.
- All file references (in products, collections, options, etc.) must point to the `files` entity, not raw URLs.
- UI/UX must be smooth, fast, and mobile-optimized.

---

**Summary:**  
Implement a modern, reference-safe file manager with a robust `files` entity, seamless Cloudflare R2 integration, and a unified upload/replace UI across the app. No file deletion from the manager—only replacement, to ensure reference integrity.

---

**Hand this to your dev team for a perfect implementation.**
