# Casper the Friendly Finality Gadget (Buterin, Griffith — arXiv 1710.09437)

**Local path:** `reaper-workspace/papers/casper-finality-gadget-1710.09437.pdf`

## Why it matters here
Casper is the canonical reference for the notion of an **(accountable) finality gadget** — a BFT-style overlay that "finalises" blocks produced by a proposal mechanism (originally PoW, later PoS). It is the foundational PoS-side counterpart to the BFT-side accountability work (ABC, Polygraph, `τ_scr`). The scalable-accountability paper cites it as `[75]` for the finality-gadget concept and uses it (with `[78]`) to anchor the "accountability vs. finality" comparison.

## Definitions Casper introduces explicitly
- **Finality**: under partial synchrony, a finalised checkpoint is one that cannot be reverted unless a quorum of validators provably violated the protocol.
- **Accountability**: "If a validator violates a rule, we can detect which validator violated the rule. Accountability allows us to penalize malfeasant validators, solving the 'nothing at stake' problem." (Section 1.1, p. 1)
- **Penalty for violation**: the validator's *entire deposit* — the maximal economic penalty, set so that the deposit greatly exceeds mining/staking reward, providing strictly stronger security incentives than proof-of-work.

## Voting & checkpoint structure
- Validators broadcast `VOTE` messages of the form `⟨ν, s, t, h(s), h(t), S⟩` — `s` = source justified checkpoint, `t` = target descendant checkpoint, `h(·)` heights, `S` = validator's signature.
- A **supermajority link** `a → b` is a pair where `≥ 2/3` of validators (by deposit) have voted with source `a` and target `b`.
- **Justified**: root, or destination of a supermajority link from a justified checkpoint.
- **Finalised**: justified checkpoint with a direct-child supermajority link.

## Two slashing conditions
Casper has exactly two slashing conditions — Byzantine behaviours that are detectable and lead to deposit slashing:
1. **No double votes**: a validator must not publish two distinct votes for the same target height.
2. **No surround votes**: a validator must not publish two votes such that one is "surrounded" by the other (`h(s₁) < h(s₂) < h(t₂) < h(t₁)`).

A validator that violates either condition has its **entire deposit slashed** — this *is* the accountability mechanism. The signed VOTE messages are the **evidence**; anyone can verify the rule violation.

## Where Casper's accountability sits vs. ABC^++
| Property | Casper | ABC^++ |
|---|---|---|
| Setting | PoS blockchain finality gadget | Generic BFT / RB transformation |
| Network model | Implicit overlay synchrony | Asynchronous + 1-delayed adaptive |
| Resilience for safety | `f < n/3` | `f < n(1/3 − ε)` |
| Resilience for accountability | up to ~`2n/3` | `n − Θ(n)` |
| Evidence | Two conflicting signed votes | VRF-quorum certificate `(h, Q, σ)` + conflicting pair |
| Verdict size | Two signatures + headers | `O(λ log n + κ)` with Jackpot, `52 KB` with full VRF proofs |
| Setup | PKI + deposit registry | Bulletin-board PKI + VRF + (optionally) Jackpot AGM setup |
| Communication overhead | Built into native voting | `+o(n²)` over arbitrary black-box BA |

## Importance for our research
- Casper is the **prototype "accountable safety"** definition that ABC^++ is the generic, BFT-side analogue of.
- The **slashing rules ≈ verdict predicates** correspondence is the conceptual link between Casper-style PoS accountability and Civit-style BFT accountability — both reduce accountability to detection of *signed equivocation*.
- The connection "accountability implies finality" (ref `[78]` of the scalable-accountability paper) is **proven** precisely in the partial-synchrony model Casper assumes — see `accountable-safety-implies-finality-2308.16902` notes.

## Caveats
- Casper's accountability only triggers on **two specific** slashing conditions. It does not detect all forms of Byzantine behaviour — e.g., a validator who simply *stops* voting is not slashed (the protocol uses a separate *inactivity leak* to recover from such failures). ABC^++ similarly only detects *commission* faults (equivocation), not pure omission — they are equivalent in this respect.
- Casper's accountability does not work in the strictly asynchronous model — it relies on the proposal mechanism's overlay synchrony for the chain to make progress.
