import { describe, expect, it } from "vitest";
import {
  grade,
  gradeOrdered,
  gradePairs,
  normalize,
  scoreValue,
  sessionAccuracy,
} from "../src/answer.js";
import {
  LESSON_PASS_THRESHOLD,
  bandForScore,
  createSkillEstimate,
  overallClaimed,
  overallProvisional,
  recordCheckpointResult,
  recordLessonResult,
  recordPracticeResult,
} from "../src/scoring.js";
import {
  applyReviewResult,
  dueReviews,
  enqueueMiss,
} from "../src/review.js";
import {
  provisionalFromPlacement,
  gradePlacementChoice,
  PLACEMENT_ITEMS,
} from "../src/placement.js";
import { lockState, nextPathItem, mergePacks } from "../src/path.js";
import type { LessonPack } from "../src/content.js";

describe("normalize / grade", () => {
  it("normalizes case, whitespace, and edge punctuation", () => {
    expect(normalize("  Hei!  ")).toBe("hei");
    expect(normalize("God   morgen")).toBe("god morgen");
  });

  it("accepts exact and variant answers", () => {
    expect(grade("hei", ["hei", "hallo"])).toBe("correct");
    expect(grade("Hallo", ["hei", "hallo"])).toBe("correct");
    expect(grade("hei takk", ["hei"])).toBe("partial");
    expect(grade("ha det", ["hei"])).toBe("incorrect");
    expect(grade("", ["hei"])).toBe("incorrect");
  });

  it("grades ordered tokens and match pairs", () => {
    expect(gradeOrdered(["ha", "det"], ["ha det"])).toBe("correct");
    expect(
      gradePairs(
        { hei: "hi", takk: "thanks" },
        [
          { id: "1", left: "hei", right: "hi" },
          { id: "2", left: "takk", right: "thanks" },
        ],
      ),
    ).toBe("correct");
    expect(
      gradePairs(
        { hei: "hi", takk: "sorry" },
        [
          { id: "1", left: "hei", right: "hi" },
          { id: "2", left: "takk", right: "thanks" },
        ],
      ),
    ).toBe("partial");
  });

  it("scores results and session accuracy", () => {
    expect(scoreValue("correct")).toBe(1);
    expect(scoreValue("partial")).toBe(0.5);
    expect(scoreValue("incorrect")).toBe(0);
    expect(sessionAccuracy(["correct", "incorrect", "partial"])).toBeCloseTo(
      0.5,
    );
  });
});

describe("scoring EMA / provisional / claimed", () => {
  it("maps scores to CEFR bands", () => {
    expect(bandForScore(0.5)).toBe("A1");
    expect(bandForScore(0.85)).toBe("A2");
    expect(bandForScore(0.95)).toBe("B1");
  });

  it("updates EMA on lesson results", () => {
    let skills = [
      createSkillEstimate("lese"),
      createSkillEstimate("lytte"),
      createSkillEstimate("skrive"),
      createSkillEstimate("snakke"),
    ];
    skills = recordLessonResult(
      skills,
      { norskprovenSkills: ["lese", "lytte"] },
      1,
    );
    const lese = skills.find((s) => s.skill === "lese")!;
    expect(lese.emaScore).toBe(1);
    expect(lese.sampleCount).toBe(1);
    expect(lese.provisionalBand).toBe("B1");

    skills = recordLessonResult(
      skills,
      { norskprovenSkills: ["lese"] },
      0,
    );
    const lese2 = skills.find((s) => s.skill === "lese")!;
    expect(lese2.emaScore).toBeCloseTo(0.3 * 0 + 0.7 * 1);
  });

  it("practice updates EMA without claiming", () => {
    let skills = [createSkillEstimate("lese")];
    skills = recordPracticeResult(skills, "lese", 0.9);
    expect(skills[0]!.claimedBand).toBeUndefined();
    expect(skills[0]!.emaScore).toBeCloseTo(0.9);
  });

  it("claims receptive bands on checkpoint pass with evidence", () => {
    let skills = [
      createSkillEstimate("lese"),
      createSkillEstimate("lytte"),
      createSkillEstimate("skrive"),
      createSkillEstimate("snakke"),
    ];
    // Build evidence
    for (let i = 0; i < 4; i++) {
      skills = recordLessonResult(
        skills,
        { norskprovenSkills: ["lese", "lytte"] },
        0.9,
      );
    }
    const unit = {
      id: "a1-u1",
      title: "Greetings",
      theme: "Meeting",
      cefr: "A1" as const,
      grammarFocus: "være",
      claimTarget: "A1" as const,
      lessons: [],
    };
    const checkpoint = {
      id: "cp1",
      title: "Checkpoint",
      norskprovenSkills: ["lese", "lytte"] as const,
      exercises: [
        {
          id: "e1",
          kind: "translate" as const,
          prompt: "x",
          skills: ["lese" as const],
          accept: ["hei"],
        },
        {
          id: "e2",
          kind: "listenChoose" as const,
          prompt: "y",
          skills: ["lytte" as const],
          accept: ["takk"],
        },
      ],
    };
    const result = recordCheckpointResult(
      skills,
      unit,
      checkpoint,
      0.9,
      "general",
    );
    expect(result.passed).toBe(true);
    expect(result.accuracy).toBeGreaterThanOrEqual(LESSON_PASS_THRESHOLD);
    expect(result.claimedSkills).toContain("lese");
    expect(result.claimedSkills).toContain("lytte");
    // Productive stay estimated-only
    expect(result.estimatedOnlySkills.length).toBe(0);
    const skrive = result.skills.find((s) => s.skill === "skrive")!;
    expect(skrive.estimatedOnly).toBe(true);
    expect(skrive.claimedBand).toBeUndefined();
  });

  it("overall provisional uses min of skills; travel uses receptive only", () => {
    const skills = [
      { ...createSkillEstimate("lese"), provisionalBand: "A2" as const },
      { ...createSkillEstimate("lytte"), provisionalBand: "B1" as const },
      { ...createSkillEstimate("skrive"), provisionalBand: "A1" as const },
      { ...createSkillEstimate("snakke"), provisionalBand: "A1" as const },
    ];
    expect(overallProvisional(skills, "general")).toBe("A1");
    expect(overallProvisional(skills, "travel")).toBe("A2");
  });

  it("overall claimed ignores estimated-only productive skills", () => {
    const skills = [
      {
        ...createSkillEstimate("lese"),
        claimedBand: "A2" as const,
        estimatedOnly: false,
      },
      {
        ...createSkillEstimate("lytte"),
        claimedBand: "A2" as const,
        estimatedOnly: false,
      },
      {
        ...createSkillEstimate("skrive"),
        claimedBand: undefined,
        estimatedOnly: true,
      },
      {
        ...createSkillEstimate("snakke"),
        claimedBand: undefined,
        estimatedOnly: true,
      },
    ];
    expect(overallClaimed(skills, "general")).toBe("A2");
  });
});

describe("review SRS", () => {
  it("enqueues misses as due now and schedules on correct", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    let items = enqueueMiss([], "l1", "e1", "prompt", now);
    expect(items).toHaveLength(1);
    expect(dueReviews(items, now)).toHaveLength(1);

    const updated = applyReviewResult(items[0]!, true, now);
    expect(updated.intervalDays).toBe(1);
    expect(dueReviews([updated], now)).toHaveLength(0);
    expect(
      dueReviews([updated], new Date("2026-01-03T12:00:00Z")),
    ).toHaveLength(1);
  });
});

describe("placement", () => {
  it("grades placement items and maps provisional CEFR", () => {
    expect(gradePlacementChoice(PLACEMENT_ITEMS[0]!, "hi")).toBe(true);
    expect(gradePlacementChoice(PLACEMENT_ITEMS[0]!, "bye")).toBe(false);
    expect(provisionalFromPlacement(4, 4, "someLessons")).toBe("A2");
    expect(provisionalFromPlacement(1, 4, "none")).toBe("A1");
  });
});

describe("path / locks", () => {
  const pack: LessonPack = {
    version: 1,
    track: "Bokmål",
    units: [
      {
        id: "u1",
        title: "U1",
        theme: "t",
        cefr: "A1",
        grammarFocus: "g",
        claimTarget: "A1",
        lessons: [
          {
            id: "l1",
            title: "L1",
            microSkill: "m",
            cefrTarget: "A1",
            norskprovenSkills: ["lese"],
            canDoIds: [],
            exercises: [],
          },
          {
            id: "l2",
            title: "L2",
            microSkill: "m",
            cefrTarget: "A1",
            norskprovenSkills: ["lese"],
            canDoIds: [],
            exercises: [],
          },
        ],
        checkpoint: {
          id: "cp1",
          title: "CP",
          norskprovenSkills: ["lese"],
          exercises: [],
        },
      },
    ],
  };

  it("unlocks sequentially and surfaces checkpoint after lessons", () => {
    expect(lockState(pack, pack.units[0]!.lessons[0]!, pack.units[0]!, [])).toBe(
      "unlocked",
    );
    expect(lockState(pack, pack.units[0]!.lessons[1]!, pack.units[0]!, [])).toBe(
      "locked",
    );
    const progress = [
      {
        lessonId: "l1",
        unitId: "u1",
        accuracy: 1,
        completed: true,
        attemptCount: 1,
        bestAccuracy: 1,
      },
    ];
    expect(
      lockState(pack, pack.units[0]!.lessons[1]!, pack.units[0]!, progress),
    ).toBe("unlocked");

    const allDone = [
      ...progress,
      {
        lessonId: "l2",
        unitId: "u1",
        accuracy: 1,
        completed: true,
        attemptCount: 1,
        bestAccuracy: 1,
      },
    ];
    expect(nextPathItem(pack, allDone, [])).toEqual({
      kind: "checkpoint",
      unitId: "u1",
      checkpointId: "cp1",
    });
  });

  it("merges multi-file packs", () => {
    const merged = mergePacks([
      pack,
      {
        version: 2,
        track: "Bokmål",
        units: [
          {
            id: "u2",
            title: "U2",
            theme: "t",
            cefr: "A2",
            grammarFocus: "g",
            lessons: [],
          },
        ],
      },
    ]);
    expect(merged.units).toHaveLength(2);
    expect(merged.version).toBe(2);
  });
});
