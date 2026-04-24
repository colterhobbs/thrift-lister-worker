# ThriftLister TODO

## Phase 1 – Foundation
- [x] Database schema: items, listings, templates, price_alerts
- [x] Server DB helpers for all tables
- [x] tRPC routers for all features

## Phase 2 – Design System
- [x] Memphis-inspired global CSS (peach bg, geometric shapes, bold typography)
- [x] App layout with mobile-first navigation
- [x] Reusable Memphis UI components (cards, buttons, badges)

## Phase 3 – Photo Upload & AI Identification
- [x] Drag-and-drop photo upload interface
- [x] Manual item description input as alternative
- [x] AI item recognition from uploaded image (identify product, brand, category)
- [x] Upload image to S3 and store URL

## Phase 4 – Pricing Research & Listing Generation
- [x] eBay sold listings pricing research via AI simulation
- [x] AI-generated listing title, description, suggested price
- [x] Category suggestions from photo/description
- [x] Display comparable sold items with price range

## Phase 5 – Listing Creation & Cross-Posting
- [x] Listing creation form with auto-filled AI content
- [x] Cross-posting UI for Etsy, eBay, Facebook Marketplace
- [x] Save and reuse custom listing templates per category
- [x] Template management (create, edit, delete, apply)

## Phase 6 – History Dashboard & Notifications
- [x] Item history dashboard showing all researched items
- [x] Listing status tracking (draft, posted, sold)
- [x] Price-change notification system for similar items
- [x] Alert management (create, toggle, check, delete)

## Phase 7 – Polish & Tests
- [x] Mobile-responsive design validation
- [x] Vitest unit tests for routers (11 tests passing)
- [x] Final checkpoint

## Round 2 – New Features
- [x] Quick Sell shortcut on home screen (one-tap to photo upload + instant listing queue)
- [x] Profit margin tracking: record thrift cost paid, show profit vs. sale price in History
- [x] Sold price recording when marking item as sold
- [x] Shipment tracking page: enter tracking number + carrier, auto-pull status via API
- [x] Shareable buyer tracking link (public page, no login required)
- [x] Tracking info stored per listing, shown in Listings view
- [x] Cloudflare DNS: app.salvaginghistory.com CNAME
- [x] Vitest tests updated: 17 tests passing

## Round 3 – Etsy + Multi-Photo + Description
- [x] Etsy API credentials wired (Keystring + Shared Secret)
- [x] Etsy OAuth connect flow (server/etsy.ts)
- [x] Etsy listing creation via API
- [x] Multi-photo upload on Research page (up to 5 photos)
- [x] Description/notes field on photo upload for extra context
- [x] Multiple images stored per item in DB (items.imageUrls as JSON array)
- [x] AI identification uses all uploaded photos for better accuracy
- [x] Vitest tests for Etsy credentials

## Bug Fixes
- [x] Fix eBay OAuth callback 404 — moved to /api/ebay/callback for gateway routing

## Round 4 – Privacy Policy
- [x] Add /privacy page with boilerplate privacy policy for eBay compliance
- [x] Add route in App.tsx
- [x] Add footer link to privacy policy (desktop nav)

## Round 5 – eBay Sync
- [x] eBay sync button on Listings page header
- [x] Pull active listings from eBay via GetMyeBaySelling Trading API call
- [x] Pull sold/ended listings from eBay via GetSellerList Trading API call (90-day window)
- [x] EbaySyncPanel UI: tabbed Active/Sold view with thumbnail, price, condition
- [x] Per-listing Import button: creates item + listing record in ThriftLister DB
- [x] Import All button for bulk import of visible tab
- [x] Duplicate detection: skip already-imported listings (by ebayListingId)
- [x] All 21 tests still passing
