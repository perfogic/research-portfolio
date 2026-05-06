---
title: "Ethereum Consensus & Finality"
order: 4
---

## Why I Read These Papers

I wanted to understand which classical BFT intuitions survive once finality is separated from proposal and tied to a public validator set.

## Papers I Read

<details>
<summary>Casper FFG</summary>

### Human version

Casper FFG is a finality overlay on top of a block proposal mechanism rather than a PBFT-like command-ordering protocol.

### Core mechanism

Validators vote on source-target checkpoint links; justified and finalized checkpoints are derived from supermajority voting and slashable safety conditions.

### Why I read it

I wanted a protocol that made the Ethereum shift explicit instead of treating public-validator finality as just another committee BFT instance.

### What I focused on

I focused on the split between proposal and finality, and on accountable safety as a different way to express the safety guarantee.

### Key insight

Casper changes the abstraction. It asks a different question from PBFT-family designs because the unit of consensus is a checkpoint relation inside a block tree.

### What confused me initially

I first tried to map Casper directly onto PBFT or HotStuff categories. That loses the point of the protocol.

### Open questions

- Which parts of classical leader-based BFT still transfer once finality is public and deposit-weighted?
- Where do data availability assumptions enter this picture more strongly than the protocol text suggests?

### Artifacts

- Notes: [Casper compared with PBFT-style BFT](reaper-workspace/notes/casper-vs-pbft.md)

![LMD-GHOST and Casper FFG intuition](content/diagrams/ethereum-finality.svg)

</details>

## What This Reading Path Showed Me

Ethereum finality is not just a different committee. It changes the relationship among finality, proposal, validator visibility, and accountability.

## Open Question

Which BFT ideas are truly portable into Ethereum, and which ones depend too strongly on a closed committee execution model?
