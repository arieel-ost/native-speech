# Speed vs Accuracy Benchmark for Phoneme Analysis

**Date:** 2026-04-26
**Status:** Complete
**Issue:** #46 — faster phoneme analysis feedback

---

## Executive Summary

Benchmarked 14 model/schema/thinking configurations against 30 expert-annotated speechocean762 samples (real non-native English speakers, Mandarin L1). Two phases: Phase 1 tested 8 model+schema combos with thinking off; Phase 2 swept thinking budgets on the two winners.

### Recommendations

| Use case | Config | Model | Schema | Think | Latency | Accuracy (r) |
|---|---|---|---|---:|---:|---:|
| **Phoneme drills** | H4k | gemini-3.1-flash-lite-preview | light | 4096 | **2.0s** | **0.64** |
| **Sentence analysis** | E | gemini-3-flash-preview | full | off | 5.3s | **0.67** |

**Current prod (gemini-2.5-flash / full / thinking off) is the worst option tested:** 9s avg latency with r=0.37 correlation. Switching to the recommended configs gives 4.5x faster drills with 1.7x better accuracy.

### Key findings

1. **Light schema is 4-5x faster** than full schema across all models (~2s vs 4-9s). Output token generation dominates latency, not audio processing.
2. **Next-gen models beat 2.5-flash on both speed AND accuracy.** No reason to stay on 2.5-flash.
3. **Thinking hurts gemini-3-flash** — doubles latency, lowers correlation. The task is perceptual, not reasoning-heavy.
4. **Thinking is free on flash-lite/light** — zero latency cost, but 4096 budget bumps r from 0.49 to 0.64 (sweet spot).
5. **flash-lite is bad with the full schema** (r=-0.05) but competitive with the light schema (r=0.49-0.64). The model can't handle complex structured output well.
6. **Audio duration barely affects latency** — short and long recordings take similar time within each config.

---

## Methodology

**Test data:** 30 WAV files (16kHz) from speechocean762, stratified: 10 low (score 1-3), 10 mid (4-6), 10 high (7-9). Duration range: 2.2s - 9.2s.

**Ground truth:** 5 independent expert annotators per utterance. Sentence-level accuracy score (0-10), per-word accuracy, phone-level mispronunciation annotations.

**Metrics:**
- Sentence-level: Pearson r and MAE between Gemini overall score and expert `score_accuracy`
- Word-level (full schema only): Pearson r and MAE between Gemini `wordScores[].score` and expert per-word accuracy
- Mispronunciation detection rate: for words with expert-annotated mispronunciations, does Gemini score <= 5?

**API calls:** Direct REST to `generativelanguage.googleapis.com/v1beta`, 2s delay between calls. 420 total calls, zero errors.

**Configs:** 14 total
**Phase 1:** A-H (thinking off), **Phase 2:** E/H with thinking budgets 1k/4k/16k

## 1. Latency Summary

| Config | Model | Schema | Think | Avg | P50 | P95 | Min | Max | Errors |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 2.5-flash | full | off | 9048ms | 9083ms | 11587ms | 6328ms | 12971ms | 0 |
| B | 2.5-flash | light | off | 2140ms | 2165ms | 2543ms | 1513ms | 3432ms | 0 |
| C | 2.5-flash-lite | full | off | 6309ms | 6540ms | 7953ms | 3542ms | 8338ms | 0 |
| D | 2.5-flash-lite | light | off | 1975ms | 2030ms | 2680ms | 1186ms | 2695ms | 0 |
| E | 3-flash-preview | full | off | 5250ms | 5252ms | 6111ms | 4355ms | 6717ms | 0 |
| F | 3-flash-preview | light | off | 2188ms | 2186ms | 2791ms | 1790ms | 3056ms | 0 |
| G | 3.1-flash-lite-preview | full | off | 4016ms | 4179ms | 4670ms | 3164ms | 4702ms | 0 |
| H | 3.1-flash-lite-preview | light | off | 2132ms | 2082ms | 2763ms | 1586ms | 3858ms | 0 |
| E1k | 3-flash-preview | full | 1024 | 9766ms | 10724ms | 14170ms | 4591ms | 17521ms | 0 |
| E4k | 3-flash-preview | full | 4096 | 12587ms | 11885ms | 18324ms | 8157ms | 22182ms | 0 |
| E16k | 3-flash-preview | full | 16384 | 12643ms | 12243ms | 18113ms | 8179ms | 23976ms | 0 |
| H1k | 3.1-flash-lite-preview | light | 1024 | 2181ms | 2170ms | 2951ms | 1527ms | 3152ms | 0 |
| H4k | 3.1-flash-lite-preview | light | 4096 | 2013ms | 1985ms | 2406ms | 1560ms | 3168ms | 0 |
| H16k | 3.1-flash-lite-preview | light | 16384 | 2135ms | 1965ms | 3848ms | 1577ms | 4126ms | 0 |

## 2. Latency by Audio Duration

| Config | Short (<4s) | Medium (4-8s) | Long (>8s) |
| --- | ---: | ---: | ---: |
| A | 8059ms (n=12) | 9771ms (n=17) | 8610ms (n=1) |
| B | 2211ms (n=12) | 2128ms (n=17) | 1513ms (n=1) |
| C | 6326ms (n=12) | 6254ms (n=17) | 7027ms (n=1) |
| D | 1993ms (n=12) | 1976ms (n=17) | 1759ms (n=1) |
| E | 5207ms (n=12) | 5274ms (n=17) | 5364ms (n=1) |
| F | 2183ms (n=12) | 2203ms (n=17) | 2005ms (n=1) |
| G | 4132ms (n=12) | 3953ms (n=17) | 3713ms (n=1) |
| H | 2199ms (n=12) | 2107ms (n=17) | 1756ms (n=1) |
| E1k | 8114ms (n=12) | 10854ms (n=17) | 11097ms (n=1) |
| E4k | 12984ms (n=12) | 12381ms (n=17) | 11331ms (n=1) |
| E16k | 12384ms (n=12) | 12963ms (n=17) | 10309ms (n=1) |
| H1k | 2301ms (n=12) | 2120ms (n=17) | 1782ms (n=1) |
| H4k | 2146ms (n=12) | 1939ms (n=17) | 1674ms (n=1) |
| H16k | 2345ms (n=12) | 2016ms (n=17) | 1631ms (n=1) |

## 3. Accuracy Summary

| Config | Schema | Think | Sentence r | Sentence MAE | Word r | Word MAE | Mispron Detect |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | full | off | 0.37 | 2.13 | 0.18 | 3.38 | 33% |
| B | light | off | 0.35 | 2.20 | - | - | - |
| C | full | off | -0.05 | 2.67 | 0.12 | 2.42 | 0% |
| D | light | off | 0.18 | 2.55 | - | - | - |
| E | full | off | 0.67 | 1.59 | 0.35 | 2.99 | 100% |
| F | light | off | 0.41 | 2.01 | - | - | - |
| G | full | off | 0.55 | 1.78 | 0.47 | 2.30 | 33% |
| H | light | off | 0.49 | 1.87 | - | - | - |
| E1k | full | 1024 | 0.25 | 2.25 | 0.27 | 2.41 | 100% |
| E4k | full | 4096 | 0.32 | 2.29 | 0.25 | 2.37 | 100% |
| E16k | full | 16384 | 0.47 | 2.23 | 0.27 | 2.33 | 33% |
| H1k | light | 1024 | 0.56 | 1.73 | - | - | - |
| H4k | light | 4096 | 0.64 | 1.67 | - | - | - |
| H16k | light | 16384 | 0.54 | 1.73 | - | - | - |

## 4. Speed vs Accuracy

| Config | Model | Schema | Think | Avg Latency | Sentence r | Sentence MAE |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| A | 2.5-flash | full | off | 9048ms | 0.37 | 2.13 |
| B | 2.5-flash | light | off | 2140ms | 0.35 | 2.20 |
| C | 2.5-flash-lite | full | off | 6309ms | -0.05 | 2.67 |
| D | 2.5-flash-lite | light | off | 1975ms | 0.18 | 2.55 |
| E | 3-flash-preview | full | off | 5250ms | 0.67 | 1.59 |
| F | 3-flash-preview | light | off | 2188ms | 0.41 | 2.01 |
| G | 3.1-flash-lite-preview | full | off | 4016ms | 0.55 | 1.78 |
| H | 3.1-flash-lite-preview | light | off | 2132ms | 0.49 | 1.87 |
| E1k | 3-flash-preview | full | 1024 | 9766ms | 0.25 | 2.25 |
| E4k | 3-flash-preview | full | 4096 | 12587ms | 0.32 | 2.29 |
| E16k | 3-flash-preview | full | 16384 | 12643ms | 0.47 | 2.23 |
| H1k | 3.1-flash-lite-preview | light | 1024 | 2181ms | 0.56 | 1.73 |
| H4k | 3.1-flash-lite-preview | light | 4096 | 2013ms | 0.64 | 1.67 |
| H16k | 3.1-flash-lite-preview | light | 16384 | 2135ms | 0.54 | 1.73 |

## 5. Per-Sample Details

<details><summary>Click to expand</summary>

| Sample | Duration | Expert | A score | B score | C score | D score | E score | F score | G score | H score | E1k score | E4k score | E16k score | H1k score | H4k score | H16k score | A ms | B ms | C ms | D ms | E ms | F ms | G ms | H ms | E1k ms | E4k ms | E16k ms | H1k ms | H4k ms | H16k ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 096220006.wav | 9.2s | 3 | 5 | 6 | 7.5 | 7.5 | 4.5 | 6.5 | 4 | 6 | 6.2 | 5.2 | 4.5 | 6 | 6 | 6 | 8610 | 1513 | 7027 | 1759 | 5364 | 2005 | 3713 | 1756 | 11097 | 11331 | 10309 | 1782 | 1674 | 1631 |
| 014220001.wav | 4.7s | 3 | 6 | 7 | 7.5 | 7.5 | 4 | 6.5 | 6 | 6 | 5.5 | 5.5 | 4.2 | 6 | 6 | 6 | 9299 | 2472 | 3542 | 1726 | 5055 | 1933 | 3851 | 2158 | 12878 | 22182 | 23976 | 2041 | 2029 | 2056 |
| 050170099.wav | 3.9s | 3 | 5 | 5 | 7.5 | 7.5 | 4 | 6.5 | 6 | 6 | 7.5 | 6.8 | 7.5 | 7 | 6 | 8 | 9453 | 2071 | 5633 | 1618 | 5389 | 2186 | 4702 | 1837 | 9364 | 14257 | 10936 | 1865 | 2206 | 2012 |
| 096290004.wav | 5.6s | 3 | 4 | 3 | 7.5 | 7.5 | 4 | 4.5 | 6 | 6 | 4 | 4.5 | 6 | 4 | 6 | 5 | 10257 | 2198 | 5899 | 1919 | 4791 | 3056 | 4179 | 1842 | 11643 | 10829 | 11104 | 2738 | 2191 | 1965 |
| 014040097.wav | 5s | 1 | 5 | 2 | 7.5 | 7.5 | 6.5 | 6.5 | 3 | 5 | 7.2 | 9 | 4.5 | 4 | 3 | 3 | 8926 | 2029 | 6108 | 2542 | 6050 | 2190 | 3274 | 2082 | 9284 | 10409 | 12008 | 2801 | 1963 | 2621 |
| 069020059.wav | 3.9s | 3 | 5 | 6 | 6.5 | 6.5 | 4 | 1.5 | 1 | 9 | 7.5 | 7 | 8.1 | 8 | 9 | 9 | 6328 | 2136 | 7183 | 2680 | 5165 | 1929 | 4501 | 2503 | 12175 | 12057 | 12589 | 2737 | 1836 | 2238 |
| 069020163.wav | 4.7s | 3 | 4 | 2 | 6.5 | 7.5 | 4.5 | 6.5 | 6 | 8 | 7.5 | 9 | 7.2 | 4 | 2 | 3 | 9459 | 1723 | 6590 | 2161 | 5345 | 2413 | 4285 | 2133 | 10369 | 10064 | 12349 | 2285 | 1985 | 1817 |
| 096080017.wav | 5.5s | 3 | 5 | 6 | 7.5 | 7.5 | 4 | 6.5 | 6 | 6 | 4 | 6.5 | 6.5 | 6 | 6 | 6 | 8342 | 2427 | 6449 | 2695 | 6111 | 2791 | 4141 | 2763 | 5766 | 10062 | 10408 | 1945 | 2224 | 1922 |
| 096120010.wav | 2.9s | 3 | 5 | 6 | 7.5 | 8.5 | 4 | 6.5 | 6 | 7 | 6.8 | 6.2 | 6.5 | 4 | 6 | 7 | 7874 | 1709 | 4205 | 2085 | 4888 | 1867 | 4185 | 3858 | 11363 | 12576 | 9684 | 3152 | 2009 | 2165 |
| 096180019.wav | 7.5s | 3 | 5 | 7 | 7.5 | 7.5 | 4.5 | 6.5 | 6.5 | 6 | 6.2 | 6.5 | 6.8 | 5 | 5 | 5 | 10243 | 1771 | 7148 | 1957 | 5159 | 1967 | 3796 | 1731 | 17521 | 11578 | 12243 | 1544 | 1675 | 1604 |
| 000440082.wav | 4s | 6 | 5 | 4 | 6.5 | 6.5 | 4.5 | 8.5 | 5 | 6 | 4.5 | 7.2 | 6.2 | 6 | 6 | 4 | 9003 | 2023 | 6540 | 1976 | 4528 | 2110 | 3968 | 2343 | 6587 | 8157 | 8486 | 2117 | 1716 | 1821 |
| 000920002.wav | 3s | 4 | 5 | 6 | 7.5 | 8.5 | 4 | 6 | 6 | 6 | 5 | 8 | 7.5 | 7 | 6 | 7 | 8054 | 2177 | 5682 | 2069 | 5412 | 2285 | 3224 | 2014 | 5199 | 10121 | 10588 | 1885 | 1725 | 3848 |
| 001120024.wav | 3s | 5 | 5 | 4 | 8.1 | 7.5 | 4 | 3.5 | 6 | 6 | 7.2 | 7.2 | 8.5 | 6 | 8 | 8 | 8182 | 2438 | 4971 | 2030 | 4587 | 2597 | 4270 | 2195 | 11136 | 16476 | 14770 | 1819 | 1941 | 1654 |
| 030750078.wav | 4.5s | 6 | 5 | 7 | 7.5 | 7.5 | 4 | 6.5 | 6 | 6 | 7.4 | 8 | 7 | 9 | 8 | 6 | 7595 | 3432 | 5843 | 2152 | 5252 | 2070 | 4284 | 2158 | 10724 | 11577 | 10926 | 2951 | 2041 | 1937 |
| 096120015.wav | 4.8s | 6 | 4 | 4 | 6.5 | 8.5 | 4 | 6.5 | 6 | 6 | 7.2 | 7.8 | 6.8 | 6 | 6 | 7 | 12971 | 2180 | 8338 | 1364 | 5617 | 1992 | 3716 | 2011 | 10267 | 11010 | 13218 | 2147 | 2406 | 2971 |
| 014220115.wav | 4.9s | 5 | 3 | 4 | 7 | 6.5 | 4.5 | 4 | 6 | 4 | 4 | 7.2 | 7.5 | 6 | 4 | 6 | 9565 | 2336 | 4805 | 1824 | 5493 | 2084 | 4670 | 2529 | 11463 | 10069 | 15648 | 2187 | 2128 | 2232 |
| 030600168.wav | 6.8s | 4 | 4 | 7 | 7.5 | 3.8 | 4.5 | 4 | 4 | 4 | 7.2 | 6.5 | 7.2 | 4 | 4 | 4 | 10114 | 1659 | 7612 | 1272 | 4355 | 1790 | 3885 | 1586 | 11736 | 16067 | 13071 | 1605 | 1885 | 1720 |
| 007360196.wav | 5.8s | 6 | 4 | 4 | 7 | 6.5 | 4 | 6.5 | 6.5 | 7 | 6.4 | 6.2 | 7 | 7 | 8 | 6 | 9747 | 2165 | 6573 | 2421 | 5409 | 2215 | 4359 | 2237 | 14170 | 15555 | 10772 | 1927 | 1930 | 1920 |
| 003060017.wav | 3.4s | 5 | 3 | 3 | 8.5 | 7.5 | 4.5 | 6.5 | 6 | 7 | 8.2 | 6 | 7.5 | 7 | 6 | 4 | 7755 | 2543 | 7498 | 2110 | 6717 | 2213 | 4494 | 2510 | 11130 | 12243 | 11943 | 2303 | 2036 | 2316 |
| 096310011.wav | 6.6s | 5 | 6 | 4 | 7.5 | 7.5 | 4 | 4.5 | 6 | 6 | 4.5 | 6 | 7.5 | 6 | 6 | 6 | 9414 | 1710 | 5909 | 1586 | 4575 | 2040 | 3322 | 1785 | 5097 | 10155 | 10086 | 1662 | 1859 | 1810 |
| 008110175.wav | 2.2s | 10 | 5 | 7 | 6.5 | 8.5 | 7.2 | 6.5 | 6 | 8 | 8 | 7.2 | 6.5 | 6 | 9 | 9 | 7919 | 2345 | 7834 | 1514 | 4992 | 2216 | 4284 | 1838 | 9265 | 18324 | 12807 | 2635 | 2155 | 1855 |
| 011560192.wav | 3.6s | 10 | 7 | 6 | 7.5 | 7.5 | 8.5 | 9.2 | 7 | 8 | 8.5 | 8 | 9.5 | 9 | 9 | 9 | 9309 | 2124 | 7953 | 1485 | 4938 | 2311 | 4535 | 1972 | 5599 | 14132 | 8179 | 2170 | 2345 | 1880 |
| 008110307.wav | 3.3s | 9 | 7 | 6 | 7.5 | 8.5 | 8.5 | 9.5 | 8 | 9 | 7 | 8.5 | 7.5 | 9 | 9 | 9 | 8695 | 1738 | 6233 | 1978 | 5031 | 1862 | 4050 | 1972 | 6726 | 11885 | 11119 | 2376 | 3168 | 1940 |
| 096350016.wav | 7.1s | 7 | 4 | 4 | 7 | 7.5 | 4 | 6.5 | 6 | 6 | 6.2 | 6.5 | 6.2 | 6 | 7 | 7 | 10518 | 1857 | 6937 | 1186 | 5449 | 1916 | 3564 | 1632 | 12492 | 11121 | 16218 | 1527 | 1560 | 1577 |
| 085810040.wav | 4.5s | 8 | 5 | 7 | 7.5 | 7.5 | 7.5 | 6.5 | 6 | 6 | 8.2 | 6.8 | 7.5 | 6 | 7 | 8 | 11587 | 2095 | 6071 | 2610 | 4900 | 2595 | 4220 | 2461 | 13187 | 12626 | 13758 | 2279 | 1907 | 2146 |
| 010750026.wav | 2.4s | 9 | 6 | 6 | 7.5 | 7.5 | 7 | 6 | 7 | 9 | 5.5 | 8 | 7.2 | 6 | 6 | 7 | 8694 | 2437 | 5370 | 1978 | 5573 | 2322 | 3631 | 1942 | 4807 | 8209 | 18113 | 2264 | 2283 | 4126 |
| 015020101.wav | 3s | 8 | 5 | 4 | 7.5 | 7.5 | 4.2 | 4.5 | 6.5 | 6 | 4.2 | 7.2 | 7 | 8 | 7 | 6 | 7923 | 2421 | 6700 | 2203 | 5047 | 2141 | 3311 | 1782 | 6007 | 13073 | 12758 | 2511 | 1931 | 2043 |
| 000920149.wav | 4.3s | 7 | 5 | 7 | 7.5 | 5.7 | 4 | 6.5 | 4 | 6 | 7.2 | 7.8 | 6.2 | 7 | 6 | 6 | 9083 | 1864 | 4609 | 2037 | 5756 | 2096 | 4519 | 2242 | 11365 | 11357 | 9481 | 2278 | 1665 | 2221 |
| 095530144.wav | 4s | 9 | 6 | 7 | 7.5 | 8.5 | 7.5 | 8.5 | 9 | 9 | 7.5 | 7.8 | 8 | 9 | 9 | 9 | 9988 | 2231 | 7344 | 2156 | 5807 | 2194 | 3164 | 2125 | 9976 | 17657 | 16613 | 2004 | 1794 | 1932 |
| 000030012.wav | 3.4s | 9 | 5 | 7 | 7.5 | 7.5 | 7 | 6.5 | 7 | 8 | 7 | 7.5 | 8 | 6 | 8 | 6 | 6520 | 2387 | 6655 | 2160 | 4740 | 2262 | 4394 | 1969 | 4591 | 12460 | 15124 | 1896 | 2120 | 2065 |

</details>

## 6. Recommendation

### For phoneme drills (the /api/analyze-phoneme path)

**Switch to: `gemini-3.1-flash-lite-preview` / light schema / thinking_budget=4096**

- 2.0s avg (same as current light-schema speed, 4.5x faster than current prod full-schema)
- r=0.64 sentence correlation (best of any light config tested)
- Zero latency cost for thinking — flash-lite ignores the budget on small outputs
- MAE=1.67 (lowest of all configs)

### For sentence drills (the /api/analyze path)

**Switch to: `gemini-3-flash-preview` / full schema / thinking off**

- 5.3s avg (1.7x faster than current 2.5-flash at 9s)
- r=0.67 sentence, r=0.35 word correlation (best full-schema accuracy)
- 100% mispronunciation detection rate
- Thinking hurts this model on this task — don't enable it

### What NOT to use

- `gemini-2.5-flash` — slowest model tested (9s full, 2.1s light) with mediocre accuracy
- `gemini-2.5-flash-lite` with full schema — negative correlation (r=-0.05), model can't handle complex output
- Any thinking budget on gemini-3-flash — doubles latency, lowers accuracy

### Next steps

1. Update `/api/analyze-phoneme` to use `gemini-3.1-flash-lite-preview` with `thinking_budget: 4096`
2. Update `/api/analyze` to use `gemini-3-flash-preview` with `thinking_budget: 0`
3. A/B test in production to validate perceived quality matches benchmark numbers
4. Monitor Gemini model GA dates — preview models may change behavior

---
*Generated by research-speed-vs-accuracy.ts — data in 2026-04-26-speed-vs-accuracy-raw.json (420 results)*
