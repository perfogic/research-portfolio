# Polygraph: Accountable Byzantine Agreement (Civit, Gilbert, Gramoli — ICDCS'21 / ePrint 2019/587)

**Local path:** `reaper-workspace/papers/polygraph-civit-2019-587.pdf`

## Why it matters here
**The first accountable Byzantine agreement protocol.** Polygraph is the conceptual predecessor of ABC (and hence ABC^++). It introduced the central design pattern: *piggyback signed evidence on a consensus protocol so that disagreement always produces irrefutable proof of `≥ n/3` Byzantine culprits.*

## Setting
- `n` participants, `t < n/3` is the standard BA threshold.
- Asynchronous / partially synchronous network.
- Goal: solve BA when `t < n/3` *and* detect `≥ n/3` Byzantine culprits when an agreement violation occurs (which can only happen when `f ≥ n/3`).

## Definition (paper's own words, paraphrased)
A protocol is an **accountable Byzantine agreement protocol** if it satisfies:
- **BA solvability** for `f ≤ n/3` (agreement, validity, termination).
- **Accountability**: if two correct processes decide different values, every correct process eventually irrefutably detects `≥ n/3` Byzantine processes responsible for the disagreement, and obtains a *proof of culpability* of each detected process — independently verifiable by any third party.

## What is detected & blamed
- The Byzantine processes that **equivocated** — sent conflicting signed messages (a CONFIRM for `v` and a CONFIRM for `v' ≠ v`) — get blamed.
- Polygraph's intuition: in a PBFT/HotStuff/Tendermint-style protocol, a disagreement requires at least `n/3` Byzantine processes to have signed *conflicting* certificates. The signatures are the proof.

## Communication complexity (Table 1, Polygraph paper)
- Naive piggybacking on PBFT/Tendermint/HotStuff (without thr. sig.) → `O(κ · n²)` to `O(κ · n³)`.
- Binary Polygraph (§5) → message complexity `O(n³)`, communication `O(κ · n⁴)`.
- HotStuff with threshold signatures + Polygraph patch → `O(κ · n³)` communication, same as PBFT.

## Lower bound (key technical result)
**Theorem 4.3 (paper):** any naive piggybacking-of-signed-messages accountability transformation that turns a `t < n/3` BA protocol into an accountable one requires `Ω(κ · n²)` additional bits *per process* — i.e., `Ω(κ · n³)` total. This is the bound ABC and ABC++ try to circumvent (ABC: `Ω(n²)` additive but a *cleaner* construction; ABC++: `o(n²)` overhead via committee sampling).

## Limits & connection forward
- **Strong adversary** assumed (no 1-delay).
- **No subquadratic version** — every replica signs and propagates. This is what `ABC^++`'s ratifier+propagator fixes by sampling a `λ`-sized VRF-quorum instead of all `n`.
- Polygraph is **deployed in Red Belly Blockchain (RBBC)** as the accountability layer over DBFT — explicit in the paper's evaluation section, which deploys "the Red Belly Blockchain" on 80 geo-distributed nodes at >10,000 TPS. **This is the cleanest direct citation tying accountability to Red Belly.**

## Significance for our research goal
- Establishes that accountability is *possible* generically (not just for one specific protocol).
- Sets the `Ω(κ · n²)` baseline that ABC and ABC^++ try to beat.
- Provides the explicit "Polygraph runs in Red Belly Blockchain" claim we need to substantiate the Red Belly connection.
