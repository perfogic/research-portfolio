---
title: "Leader-Based Two-Round Voting Consensus"
order: 2
---

## Why I Read These Papers

I wanted to understand the baseline structure of leader-based BFT before looking at compressed or optimistic paths.

## Papers I Read

<details>
<summary>PBFT</summary>

### Human version

PBFT is the baseline for leader-based BFT under the `3f + 1` model.

### Core mechanism

`PRE-PREPARE`, `PREPARE`, `COMMIT`, plus an explicit view-change protocol that carries safety evidence across leaders.

### Why I read it

Without PBFT, later claims about cleaner or faster BFT handoff are too easy to oversimplify.

### What I focused on

I focused on where the protocol becomes expensive: not only the quadratic normal path, but the structure of view change.

### Key insight

The expensive part is not simply "three phases." It is how the new leader proves which value remains safe.

### What confused me initially

At first I treated PBFT as just an old protocol with worse complexity. The more important point is that it exposes the safety handoff problem cleanly.

### Open questions

- Which parts of PBFT's cost are structural?
- Which later improvements only move the cost into a different certificate form?

### Artifacts

- Notes: [PBFT complexity report](reaper-workspace/report-pbft-complexity.md)
- Diagram:

![PBFT pre-prepare, prepare, commit](content/diagrams/pbft-flow.svg)

</details>

<details>
<summary>Tendermint</summary>

### Human version

Tendermint keeps a PBFT-like vote shape, but it turns leader change into ordinary round progression rather than a separate recovery mode.

### Core mechanism

`PROPOSAL`, `PREVOTE`, `PRECOMMIT`, local locks, `validValue`, `validRound`, and timeout-driven rounds over gossip.

### Why I read it

I wanted to see how BFT changes when the target setting becomes a blockchain validator network rather than a datacenter replica set.

### What I focused on

I focused on the lock mechanism and the way round advancement avoids PBFT-style new-view payloads.

### Key insight

The important move is not only the vote pattern. It is the shift from explicit new-view proof to locally accumulated gossip evidence.

### What confused me initially

I initially thought Tendermint was mostly PBFT with different names. The deeper difference is how safety information is carried across rounds.

### Open questions

- How far can local-gossip safety evidence scale?
- Which Ethereum-facing designs inherit this logic and which reject it?

### Artifacts

- Notes: [Tendermint vs PBFT, SBFT, HotStuff](reaper-workspace/notes/tendermint-vs-pbft-sbft-hotstuff.md)

![Tendermint propose, prevote, precommit](content/diagrams/tendermint-flow.svg)

</details>

<details>
<summary>HotStuff</summary>

### Human version

HotStuff keeps the same resilience target as PBFT but simplifies leader replacement by organizing safety around the highest quorum certificate.

### Core mechanism

A three-phase QC-backed core with `prepare`, `pre-commit`, and `commit`, then pipelined in the chained version.

### Why I read it

I wanted to understand whether PBFT's main pain point was the number of phases or the safety handoff between leaders.

### What I focused on

I focused on the highest-QC rule and the reason the extra phase changes the handoff.

### Key insight

The extra phase is not cosmetic. It is what makes the next leader's choice simple enough to stay linear.

### What confused me initially

At first HotStuff looked like "PBFT plus one more phase." The real story is that the phase is buying a different proof structure.

### Open questions

- Which parts of HotStuff's gain remain meaningful under Ethereum-like deployment assumptions?
- When does QC compression hide assumptions that should be compared explicitly?

### Artifacts

- Notes: [HotStuff vs PBFT](reaper-workspace/report-hotstuff-vs-pbft.md)

![HotStuff three-chain commit](content/diagrams/hotstuff-3chain.svg)

</details>

## What This Reading Path Showed Me

The real comparison axis is not simply round count. It is how the protocol preserves one safe branch when leaders change.

## Open Question

How far can the safety handoff be compressed before the hidden proof structure becomes the dominant cost?
