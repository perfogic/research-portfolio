# Evaluating the Red Belly Blockchain (Crain, Natoli, Gramoli — IEEE S&P'21 / arXiv 1812.11747)

**Local path:** `reaper-workspace/papers/red-belly-evaluating-1812.11747.pdf`

## Why it matters here
This is the **canonical Red Belly Blockchain paper** (RBBC). It is the published reference Red Belly Network is built on. For our research goal, this is the primary source that establishes:
1. What protocol RBBC runs (DBFT).
2. What security model it assumes (`t < n/3`, partially synchronous, no synchrony assumption).
3. Where accountability fits (Section on "robustness" — currently *implicit* in the protocol; the explicit accountability layer is Polygraph, separately published).

## Headline claims
- Permissioned, leaderless BFT blockchain.
- Throughput: 660,000 TPS in single-datacenter sweet spot; >10× HoneyBadgerBFT latency on geo-distributed deployments.
- 100 nodes across 14 datacenters in 4 continents.
- Sharded transaction verification: each transaction verified by `t+1` to `2t+1` verifiers, not all `n`.

## Consensus core
- **DBFT** (Crain, Gramoli, Larrea, Raynal — see DBFT notes) — the Democratic BFT algorithm. Resilience-optimal `t < n/3`, partially synchronous, signature-free at the consensus core.
- Multi-proposer pattern: ALL processes propose a set of transactions, and DBFT outputs a super-block that is the *union of non-conflicting transactions* from valid proposals (Crain et al.'s "set agreement" view).

## Accountability — implicit & explicit
- The RBBC paper itself does NOT centrally develop accountability. The word "accountability" does not appear in the abstract.
- However the **robustness evaluation** (Section 6) measures behaviour under adversarial Byzantine codes (bit-flipping, slow-down, misinformation). This is operational fault-tolerance, not cryptographic accountability.
- The **explicit accountability layer for RBBC is Polygraph** (Civit–Gilbert–Gramoli ICDCS'21). Polygraph's evaluation section explicitly states it is "deployed in Red Belly Blockchain" at >10k TPS.
- The scalable-accountability paper (ABC^++) is the **next-generation accountability layer** that would replace Polygraph in RBBC, with `o(n²)` instead of `O(n³)` overhead — making it scale to the thousands-of-nodes regime RBBC targets.

## Connection chain
```
RBBC (S&P'21)           ── consensus  ──>  DBFT (NCA'18)
RBBC (S&P'21)           ── accountability overlay ──>  Polygraph (ICDCS'21)
RBBC + Polygraph        ── generic upgrade ──>  ABC (IPDPS'22)
ABC + subquadratic VRF  ── modern ──>  ABC^++ (S&P'26)
```

## Why ABC^++ matters specifically for Red Belly
RBBC's design *targets* large-scale geo-distributed permissioned deployments (hundreds to thousands of nodes). Polygraph's `O(κn³)` accountability traffic becomes the dominant cost at those scales — ABC^++'s `o(n²)` overhead is the natural next-generation upgrade.

## Falsifier
If newer Red Belly publications switch away from DBFT (e.g., to a HotStuff variant) or have an in-paper accountability mechanism distinct from the Polygraph/ABC/ABC^++ line, the "ABC^++ → Red Belly" pipeline thesis needs revision. Worth checking the Red Belly Network's most recent technical publications (2023-2025) for any architectural pivot.
