---
title: "Leader-Based One-Round / Fast-Path Consensus"
order: 3
---

## Why I Read These Papers

After understanding the two-round baseline, I wanted to see which assumptions are typically spent to move finality closer to one main voting round.

## Papers I Read

<details>
<summary>SBFT</summary>

### Human version

SBFT reads like PBFT redesigned for scale and common-case speed.

### Core mechanism

Collectors, threshold signatures, an optimistic fast path, a fallback PBFT-like path, and more elaborate view change.

### Why I read it

I wanted to see whether fast-path BFT remains conceptually clean once the full protocol is included.

### What I focused on

I focused on the role of collectors, the fast-path proof, and the way the view-change logic reconciles fast and slow commitment modes.

### Key insight

The gain is real, but it is paid for with more machinery, more roles, and more cryptographic structure.

### What confused me initially

I first interpreted SBFT as simply "faster PBFT." The protocol is actually much more subtle than that shorthand suggests.

### Open questions

- Which parts of the improvement are architecturally necessary?
- When does complexity outweigh the throughput gain for real deployments?

### Artifacts

- Notes: [SBFT vs PBFT](reaper-workspace/report-sbft-vs-pbft.md)

</details>

<details>
<summary>Minimmit</summary>

### Human version

Minimmit separates view progression from finality by using a smaller quorum for safe continuation and a larger quorum for commitment.

### Core mechanism

`M`-notarisation for safe progression and `L`-notarisation for finality, under a stronger replica assumption than classic PBFT.

### Why I read it

I wanted a cleaner example of how a protocol pushes toward one main voting round.

### What I focused on

I focused on what exactly the mini quorum proves and why that is enough to move the next view forward safely.

### Key insight

The main move is not just a faster path. It is a different separation of "safe to continue" from "safe to finalize."

### What confused me initially

I initially reduced it to a quorum tweak. The more interesting part is the conceptual split between progression and commitment.

### Open questions

- Is the stronger quorum regime a realistic price?
- How often do one-round finality ideas stay clean once failure handling is included?

### Artifacts

- Notes: [Minimmit explained](reaper-workspace/notes/minimmit-explained.md)

</details>

## What This Reading Path Showed Me

Faster finality is usually bought by stronger quorum assumptions, extra cryptographic aggregation, or more subtle fallback logic.

## Open Question

Which fast-path ideas remain genuinely attractive once simplicity, auditability, and Ethereum-facing deployment constraints are treated as first-class?
