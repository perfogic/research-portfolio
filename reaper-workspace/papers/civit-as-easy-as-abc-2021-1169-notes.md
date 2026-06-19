# As easy as ABC: Optimal Accountable Byzantine Consensus is easy! (Civit, Gilbert, Gramoli, Guerraoui, Komatovic — IPDPS'22 / JPDC'23 / ePrint 2021/1169)

**Local path:** `reaper-workspace/papers/civit-as-easy-as-abc-2021-1169.pdf`

## Why it matters here
This is **the direct predecessor** of ABC^++ (refs `[2]` and `[11]` in the scalable-accountability paper). It introduced the **`ABC` transformation** — the first *generic* accountable confirmer that turns any non-synchronous `t₀`-resilient BA protocol into its accountable counterpart. ABC^++ inherits ABC's accountable-confirmer template and decomposes it into ratifier + propagator.

## Definition (paper's own words)
**Definition 2 (Accountable Byzantine consensus protocol):**
A protocol is `t₀`-resilient deterministic (resp., probabilistic) accountable BA iff:
- **Byzantine consensus solvability**: all executions with `f ≤ t₀` faults solve BA (agreement, validity, deterministic/probabilistic termination).
- **Accountability**: if two correct processes decide different values (which forces `f ≥ n − 2t₀` by Theorem 1, the unavoidable-disagreement theorem), every correct process eventually irrefutably detects ≥ `n − 2t₀` faulty processes and obtains a proof of culpability of each. A proof of culpability can be independently verified by any third party; and it is impossible to produce such a proof for a correct process.

The number `n − 2t₀` is **optimal**: ABC's Theorem 4.1 (paper, separate technical report) proves no protocol can detect *more* than `n − 2t₀` faulty processes in case of disagreement.

## Transformation (Algorithm 1, paper)
Trivially simple in pseudo-code:
```
function propose(v):
   v' ← bc.propose(v)              # bc = ANY t₀-resilient BA
   broadcast [CONFIRM, v']
   wait for [CONFIRM, v'] from n - t₀ processes
   return v'
```
The accountable confirmer adds **two all-to-all rounds and `O(n²)` extra bits** in the common case, plus `O(n³)` "accountability-specific" messages in the disagreement case.

## What's blamed
- Byzantine processes that **CONFIRM conflicting values** — they must have done so for any disagreement to occur. The protocol stores the conflicting CONFIRM signatures from `n − t₀` processes each, and the intersection of any two such quorums has size `≥ n − 2t₀` (by inclusion-exclusion: `(n − t₀) + (n − t₀) − n = n − 2t₀`).

## Cost
- **Common case** (no fault detected): `+2` all-to-all rounds, `+O(n²)` bits.
- **Disagreement case** (accountability triggers): `O(n³)` messages of accountability traffic.

## Cryptographic primitives required
- A PKI (refs `[41, 19]` in the ABC paper).
- A threshold signature scheme (ref `[47]` — Boneh–Lynn–Shacham / Boldyreva-style).

## Key shortcomings ABC^++ explicitly fixes
1. **`Ω(n²)` overhead.** Every correct process broadcasts and verifies CONFIRMs from `n − t₀` peers. ABC^++ replaces this with a `λ`-sized committee + multi-signature aggregation.
2. **`t_acc = n/3`** (strong adversary) or `2n/3` (weak adversary — ref `[4]`). ABC^++ pushes `t_acc` to `n − Θ(n)` against a 1-delayed adaptive adversary.
3. **Strong adversary model.** ABC needs strong-adaptive resilience for its all-to-all dissemination — ABC^++ relaxes to 1-delayed adaptive in exchange for subquadratic communication via ERFlood.

## Significance forward
The ABC paper invented the **"accountable confirmer"** abstraction — the very thing ABC^++ decomposes into ratifier + propagator. The composition pattern (BA → accountable confirmer → forensic support / accountability triggers) is preserved verbatim in ABC^++ Algorithm 5.

## Red Belly thread
ABC's authors include Gramoli (Sydney + Redbelly) and Komatovic (EPFL), and the paper situates itself against the Polygraph/Red Belly line. ABC is the *first generic* version of what Polygraph did protocol-specifically for DBFT-based Red Belly Blockchain.
