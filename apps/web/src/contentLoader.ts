import {
  BUNDLED_PACK_NAMES,
  mergePacks,
  type LessonPack,
} from "@spraket/core";

import a1Greetings from "@content/a1-greetings.json";
import a1Numbers from "@content/a1-numbers.json";
import a1Food from "@content/a1-food.json";
import a2Daily from "@content/a2-daily.json";
import a2Shopping from "@content/a2-shopping.json";
import a2Travel from "@content/a2-travel.json";
import b1Opinions from "@content/b1-opinions.json";
import b1Work from "@content/b1-work.json";

const PACK_MAP: Record<string, LessonPack> = {
  "a1-greetings": a1Greetings as LessonPack,
  "a1-numbers": a1Numbers as LessonPack,
  "a1-food": a1Food as LessonPack,
  "a2-daily": a2Daily as LessonPack,
  "a2-shopping": a2Shopping as LessonPack,
  "a2-travel": a2Travel as LessonPack,
  "b1-opinions": b1Opinions as LessonPack,
  "b1-work": b1Work as LessonPack,
};

export function loadBundledPack(): LessonPack {
  const packs = BUNDLED_PACK_NAMES.map((name) => PACK_MAP[name]).filter(
    Boolean,
  ) as LessonPack[];
  return mergePacks(packs);
}
