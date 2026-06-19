# Crime and Punishment in Distributed Byzantine Decision Tasks — τ_scr (Civit, Gilbert, Gramoli, Guerraoui, Komatovic, Milosevic, Seredinschi — ICDCS'22 / ePrint 2022/121)

**Local path:** `reaper-workspace/papers/civit-crime-and-punishment-2022-121.pdf`

## Why it matters here
This is the `τ_scr` transformation (ref `[12]` in the scalable-accountability paper). It is the **generalisation of ABC to all distributed decision tasks**, not just Byzantine agreement. `ABC^++`'s Appendix A introduces `τ_scr^{++}` which plugs ABC^++'s subquadratic accountable Reliable Broadcast into `τ_scr` to give *every deterministic distributed protocol* a subquadratic accountable counterpart.

## Setting & definitions
- **Decision task**: a distributed input–output problem where each process starts with an input value and produces an output. Includes consensus, set agreement, k-agreement, lattice agreement, reliable broadcast, and many more.
- **Commission fault**: a fault that occurs when a faulty process invalidly sends a message — required for accountability to be possible in a non-synchronous setting.
- Two flavours of commission fault:
  - **Equivocation fault**: faulty process sends conflicting statements (sends two messages that no correct execution would simultaneously produce).
  - **Evasion fault**: faulty process sends a message that should not have been sent given the messages it previously received.

## Key insights
1. **Every irrevocable detection must be based on a detected commission fault** — otherwise a correct process can be falsely accused under network asynchrony (PeerReview's permanent-suspicion problem).
2. **Whenever safety is violated, "enough" processes have committed commission faults** — making them detectable.
3. **Equivocation faults are easier to detect than evasion faults** in non-synchronous settings.
4. **Crash failure simulation** on top of Byzantine ones (a long-studied technique) is the building block that lets `τ_scr` lift any deterministic decision-task protocol to accountability.

## Construction
`τ_scr` uses a **Secure Causal Reliable Broadcast (SCR)** primitive — every originally sent message is secure-broadcast, and no secure-delivered message can affect the receiver until a correct causal past of the message has been established. This forces all safety violations to be consequences of *equivocation faults* (which are detectable from signed conflicting messages).

## Cost
- **`O(n²)` multiplicative** communication overhead vs. the original protocol. Each protocol message is replaced by an `O(n)` SCR transmission.
- This quadratic multiplicative cost is the headline drawback `τ_scr^{++}` (ABC^++ Appendix A) fixes by replacing SCR's bottleneck Reliable-Broadcast component with ABC^++'s subquadratic accountable Reliable Broadcast.

## Relation to PeerReview & ABC
- vs. **PeerReview**: the paper notes PeerReview "does not provide 'pure' accountability (at least not always)" under asynchrony because its detections are revocable suspicions. `τ_scr` produces *irrevocable* proofs.
- vs. **ABC** (the predecessor): ABC works only for *Byzantine consensus*. `τ_scr` generalises to arbitrary decision tasks (k-agreement, lattice agreement, RB, etc.). ABC is more efficient *for consensus*; `τ_scr` is more general.

## What's blamed
Processes that commit detectable **equivocation faults** — sending two messages with the same header but different payloads (Kihlstrom–Moser–Melliar-Smith's "mutant messages"). Verdicts are `dis(D)` where `D` is the set of equivocators detected from quorum-intersection arguments analogous to ABC.

## Significance forward
- `τ_scr^{++}` (ABC^++ Appendix A) = `τ_scr` with ABC^++'s subquadratic accountable RB as the SCR underlay → multiplicative overhead drops from `Θ(n²)` to `o(n²)`. This makes accountability practical even for protocols where the underlying decision-task cost is itself small.

## Red Belly thread
This paper's author list (Civit, Gilbert, Gramoli, Guerraoui, Komatovic, Milosevic, Seredinschi) overlaps heavily with the Red Belly group (Gramoli). It is part of the same research program that builds accountability into the Red Belly stack.
