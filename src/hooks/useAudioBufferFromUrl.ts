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
  const requestIdRef = useRef(0);

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

    // Each effect run gets a unique ID — only the latest request writes state
    const thisRequest = ++requestIdRef.current;
    setLoading(true);

    let ctx: AudioContext | null = null;

    (async () => {
      try {
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        if (requestIdRef.current !== thisRequest) return;

        ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        if (requestIdRef.current !== thisRequest) return;

        bufferCache.set(url, decoded);
        setBuffer(decoded);
      } catch (err) {
        if (requestIdRef.current === thisRequest) {
          console.warn("[useAudioBufferFromUrl] decode failed:", err);
        }
      } finally {
        if (requestIdRef.current === thisRequest) {
          setLoading(false);
        }
        if (ctx && ctx.state !== "closed") {
          ctx.close().catch(() => {});
        }
      }
    })();
  }, [url]);

  return { buffer, loading };
}
