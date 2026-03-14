import { describe, expect, test } from "bun:test";
import {
  findActiveWordIndex,
  tokenizeTrackableWords,
} from "./speech-tracking";

describe("tokenizeTrackableWords", () => {
  test("normalizes punctuation and diacritics without losing display words", () => {
    expect(tokenizeTrackableWords("C'était déjà l'été.")).toEqual([
      { index: 0, original: "C'était", normalized: "c'etait" },
      { index: 1, original: "déjà", normalized: "deja" },
      { index: 2, original: "l'été.", normalized: "l'ete" },
    ]);
  });
});

describe("findActiveWordIndex", () => {
  test("tracks exact transcript progress across known text", () => {
    expect(
      findActiveWordIndex({
        referenceText: "The weather is rather nice today",
        transcript: "The weather is rather",
      }),
    ).toBe(3);
  });

  test("tolerates a missed STT word and keeps matching later words", () => {
    expect(
      findActiveWordIndex({
        referenceText: "The weather is rather nice today",
        transcript: "The is rather nice",
      }),
    ).toBe(4);
  });

  test("matches minor STT misspellings and partial interim words", () => {
    expect(
      findActiveWordIndex({
        referenceText: "The weather is rather nice today",
        transcript: "The wether is tod",
      }),
    ).toBe(5);
  });

  test("does not regress behind previous progress when interim text restarts", () => {
    expect(
      findActiveWordIndex({
        referenceText: "Привет как дела сегодня",
        transcript: "Привет как",
        previousActiveWordIndex: 3,
      }),
    ).toBe(3);
  });
});
