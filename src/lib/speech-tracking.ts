export interface TrackableWord {
  index: number;
  original: string;
  normalized: string;
}

export interface FindActiveWordIndexOptions {
  referenceText?: string;
  referenceWords?: TrackableWord[];
  transcript: string;
  previousActiveWordIndex?: number;
}

const MAX_REFERENCE_LOOKAHEAD = 4;

export function tokenizeTrackableWords(text: string): TrackableWord[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((original, index) => ({
      index,
      original,
      normalized: normalizeTrackableWord(original),
    }))
    .filter((word) => word.normalized.length > 0);
}

export function findActiveWordIndex(
  options: FindActiveWordIndexOptions,
): number | undefined {
  const { transcript, previousActiveWordIndex } = options;
  const referenceWords = options.referenceWords ?? tokenizeTrackableWords(options.referenceText ?? "");
  const spokenWords = tokenizeTrackableWords(transcript);

  if (referenceWords.length === 0) {
    return previousActiveWordIndex;
  }

  if (spokenWords.length === 0) {
    return previousActiveWordIndex;
  }

  let searchStart = 0;
  let matchedIndex = -1;

  spokenWords.forEach((spokenWord, spokenIndex) => {
    const allowPrefixMatch = spokenIndex === spokenWords.length - 1;
    const windowEnd = Math.min(
      referenceWords.length - 1,
      searchStart + MAX_REFERENCE_LOOKAHEAD,
    );

    for (let referenceIndex = searchStart; referenceIndex <= windowEnd; referenceIndex += 1) {
      if (
        wordsMatch(
          spokenWord.normalized,
          referenceWords[referenceIndex]?.normalized ?? "",
          allowPrefixMatch,
        )
      ) {
        matchedIndex = referenceIndex;
        searchStart = referenceIndex + 1;
        return;
      }
    }
  });

  if (matchedIndex < 0) {
    return previousActiveWordIndex;
  }

  if (previousActiveWordIndex === undefined) {
    return matchedIndex;
  }

  return Math.max(previousActiveWordIndex, matchedIndex);
}

function normalizeTrackableWord(word: string): string {
  return word
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}']/gu, "");
}

function wordsMatch(
  spokenWord: string,
  referenceWord: string,
  allowPrefixMatch: boolean,
): boolean {
  if (!spokenWord || !referenceWord) {
    return false;
  }

  if (spokenWord === referenceWord) {
    return true;
  }

  const compactSpokenWord = spokenWord.replaceAll("'", "");
  const compactReferenceWord = referenceWord.replaceAll("'", "");

  if (compactSpokenWord === compactReferenceWord) {
    return true;
  }

  if (
    allowPrefixMatch &&
    compactSpokenWord.length >= 3 &&
    compactReferenceWord.startsWith(compactSpokenWord)
  ) {
    return true;
  }

  const minLength = Math.min(
    compactSpokenWord.length,
    compactReferenceWord.length,
  );

  if (minLength < 4) {
    return false;
  }

  return (
    levenshteinDistance(compactSpokenWord, compactReferenceWord)
    <= maxAllowedDistance(compactReferenceWord.length)
  );
}

function maxAllowedDistance(wordLength: number): number {
  if (wordLength >= 8) {
    return 2;
  }

  return 1;
}

function levenshteinDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previousDiagonal = row[0];
    row[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previousRowValue = row[rightIndex];
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previousDiagonal + substitutionCost,
      );

      previousDiagonal = previousRowValue;
    }
  }

  return row[right.length];
}
