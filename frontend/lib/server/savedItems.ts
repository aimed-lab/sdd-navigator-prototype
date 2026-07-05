// lib/server/savedItems.ts — saved_items read/write (session-scoped, RLS).
//
// STEP 4a SCAFFOLD: signatures only. Logic moves here from discovery/page.tsx
// during Phase C. uid is derived from the session, never passed in.

import type { DiscoverItem } from "@/app/api/discover/route";

const NOT_IMPLEMENTED = "lib/server/savedItems: not implemented yet (Step 4a migration pending)";

export type SavedItem = { item_id: string; item_data: DiscoverItem };

export async function listSavedItems(): Promise<SavedItem[]> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function addSavedItem(_item: DiscoverItem): Promise<void> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function removeSavedItem(_itemId: string): Promise<void> {
  throw new Error(NOT_IMPLEMENTED);
}
