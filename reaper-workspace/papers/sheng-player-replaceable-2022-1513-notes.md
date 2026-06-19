# Player-Replaceability and Forensic Support are Two Sides of the Same (Crypto) Coin (Sheng, Wang, Nayak, Kannan, Viswanath — FC'23 / ePrint 2022/1513)

**Local path:** `reaper-workspace/papers/sheng-player-replaceable-2022-1513.pdf`

## Why it matters here
This is the `[5]` reference in the scalable-accountability paper — the *direct competitor* against which ABC^++ positions itself. Sheng et al. give a `o(n²)`-communication **forensic-support** transformation tailored to HotStuff-like player-replaceable protocols, against a **weak adaptive** adversary. ABC^++ surpasses it on three axes:
- generality (any BA/RB, not just HotStuff-like),
- accountability (full accountability, not just forensic support),
- adversary model (1-delayed adaptive instead of weak adaptive).

## Setting
- BFT SMR with `n = 3t + 1` replicas.
- **Player-replaceable** protocol: each protocol step is executed by an *unpredictably random small set* of players selected via VRF. This is the Algorand-style design that gives adaptive-adversary security with sublinear per-step communication.
- Goal: achieve **simultaneously** player-replaceability AND strong forensic support. Existing protocols achieve one or the other but not both:
  - Algorand: player-replaceable, **no forensic support** (`d = 0`).
  - HotStuff: strong forensic support, **not player-replaceable**.

## Key technical invention: transition certificates
- Player-replaceability + standard quorum-intersection forensic arguments do not combine: with VRF sampling, "the same player rarely votes twice across different rounds, so traditional cross-round equivocation arguments fail."
- **Transition certificate** = a per-round artifact that records the round's vote in a way that future rounds can hold a non-voter accountable for inconsistent votes.
- Each party maintains and shares its own transition certificate after each round; the forensic algorithm uses these to detect culpable parties when safety is violated.

## Main result
- A new player-replaceable BFT protocol with strong forensic support: max forensic support `d ≈ λ/3` Byzantine parties (where `λ` = expected committee size) detected when `(1 − ε) · 2/3` fraction of parties are Byzantine.
- Holds against a **weak adaptive** adversary (adversary cannot remove already-sent messages of freshly-corrupted processes).

## Comparison to ABC^++
| Property | Sheng et al. FC'23 | ABC^++ |
|---|---|---|
| Generality | HotStuff-like only | Any closed-box BA / RB / Consistent Broadcast |
| Property | Forensic support | **Accountability** |
| Communication | `o(n²)` | `+o(n²)` overhead |
| Adversary | Weak adaptive (S/W) | 1-delayed adaptive (D) |
| `t_acc` | `2n/3` | `n − Θ(n)` |
| `d` | `λ/3` | `λ/3` (`B_{δ,δ̂}^{ε,λ}` for `n − Θ(n)` Byzantine) |
| Rounds added | `+0` | `+1` for decision, `+O(log n)` or `+2` for detection |
| Player-replaceability | Built in | Inherited via `Π_BA` |

## Where ABC^++ explicitly cites this work
- Table 1: `[5]` row, `None/N` (no accountability, only forensic support).
- Section 2 (Related work): "the solution of `[5]` provides forensic support by relying on transition certificates to identify nodes that 'voted behind their lock' (see Appendix B) in a player-replaceable version of HotStuff … besides not ensuring accountability, this makes dissemination (not considered in `[5]`) and verification inherently costly, and no prior method extended it to an accountable protocol without the linear overhead of `[15]`, hence superquadratic."

## Significance
- Sheng et al. FC'23 was the **first subquadratic forensic-support transformation**. ABC^++ is the **first subquadratic *accountable* transformation** — and it generalises beyond HotStuff to *any* closed-box BA/RB.
- The transition-certificate concept lives on in ABC^++ in spirit: the *light certificate + full certificate* split in ABC^++ Algorithm 3 plays an analogous role (compact in-flight evidence + dissemination of fuller eligibility proofs).
