import type { IntentKind } from "./types";

export const INTENT_KIND_LABEL: Record<IntentKind, string> = {
  coffee: "☕ Coffee",
  cowork: "💻 Cowork",
  dinner: "🍜 Dinner",
  hike: "🥾 Hike",
};

export const INTENT_KIND_ORDER: IntentKind[] = [
  "coffee",
  "cowork",
  "dinner",
  "hike",
];
