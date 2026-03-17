"use client";

import { useState, useEffect, useRef } from "react";

/** Module-level cache — survives step navigation without re-decoding */
const bufferCache = new Map<string, AudioBuffer>();

/**
 * Fetch an audio URL, decode it to an AudioBuffer, and cache the result.
 * Returns `{ buffer, loading }`.
 */
export function useAudioBufferFromUrl(url: string | null | undefined) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(
    url ? bufferCache.get(url) ?? null : null,
  );
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!url) {
      setBuffer(null);
      setLoading(false);
      return;
    }

    // Already cached
    const cached = bufferCache.get(url);
    if (cached) {
      setBuffer(cached);
      setLoading(false);
      return;
    }

    cancelRef.current = false;
    setLoading(true);

    let ctx: AudioContext | null = null;

    (async () => {
      try {
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        if (cancelRef.current) return;

        ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        if (cancelRef.current) return;

        bufferCache.set(url, decoded);
        setBuffer(decoded);
      } catch (err) {
        console.warn("[useAudioBufferFromUrl] decode failed:", err);
      } finally {
        setLoading(false);
        if (ctx && ctx.state !== "closed") {
          ctx.close().catch(() => {});
        }
      }
    })();

    return () => {
      cancelRef.current = true;
    };
  }, [url]);

  return { buffer, loading };
}
