# PeerReview: Practical Accountability for Distributed Systems (Haeberlen, Kuznetsov, Druschel — SOSP'07)

**Local path:** `reaper-workspace/papers/peerreview-haeberlen-sosp07.pdf`

## Why it matters here
This is the **foundational reference** that the scalable-accountability paper cites as `[8]` for the original judge-based accountability definition. Every later definitional refinement (Küsters–Truderung–Vogt, Civit–ABC, Graf–Küsters–Rausch / AUC) traces back to this work.

## Core concept
- **Accountability** = "Byzantine faults whose effects are observed by a correct node are eventually detected and *irrefutably* linked to a faulty node," while a correct node can always defend itself against false accusations.
- Mechanism: every node maintains a **tamper-evident secure log** of all messages it sends and receives; any node `i` can request the log of node `j` and independently determine whether `j` deviated by **replaying** the log against a reference implementation.
- **Requires deterministic reference behaviour**, signed messages, and periodic auditing by correct nodes.
- Two ideal properties:
  - **Ideal Completeness**: whenever a node becomes faulty, it is eventually exposed by all correct nodes.
  - **Ideal Accuracy**: no correct node is ever exposed by a correct node.

## What gets detected
- **Observable Byzantine deviations** only — protocol violations that *manifest in messages* sent or received by correct nodes.
- Cannot detect: undetectable behaviours (a node that "ignores some messages but never sends a message that a correct node would not send" — the asynchronous-omission ambiguity that PeerReview explicitly says it cannot resolve).
- **Asynchrony limitation (crucial):** in an asynchronous setting some malicious behaviours can be permanently *suspected* but never *irrevocably proved* — this is exactly the gap that motivates Polygraph / `τ_scr` / ABC and ultimately ABC++.

## Blame structure & evidence
- Witnesses request logs and replay them; if the replay diverges from logged outputs, the witness publishes the log excerpts as evidence (the original *judge* is implicitly the witness + anyone who can re-run the reference impl).
- Evidence per fault = log fragments; communication overhead is `O(n²)` in the worst case and `O(n log n)` in a probabilistic detection variant.

## Connection to the scalable-accountability paper
- Cited in the related-work table (Table 2): `PeerReview [37]` with `Com = ×o(n²)`, `Ext.Ver = N` (no externally-verifiable proofs), `Adapt = None`.
- Ref [8] is the **definitional anchor** the paper uses for *judge* / *verdict* / *public verifiable evidence* — `ABC++`'s Definition 3 (fair public judges producing verdicts of the form `dis(D)`) refines PeerReview's "exposes a faulty node" into a precise cryptographic spec.
- The paper explicitly points out that PeerReview's evidence is **per-detector log fragments**, not a self-contained certificate — so each correct process needs to independently verify by re-running. ABC++'s ratifier replaces this with a compact multi-signature certificate verifiable in `O(λκ)` time without replay.

## Limitations relevant to the present research
1. **Permanent suspicion ≠ proof** under asynchrony — the gap PeerReview leaves open is exactly what `τ_scr` (Civit et al. ICDCS'22) and `ABC` (IPDPS'22) close for decision tasks.
2. **`O(n²)` overhead** baseline — ABC++ aims for `+o(n²)`.
3. **Reference-implementation requirement** — PeerReview's framework assumes a deterministic reference protocol. Civit-style ABC frameworks lift this requirement by working from the protocol's own messages.
