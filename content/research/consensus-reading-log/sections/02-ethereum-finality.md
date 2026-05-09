---
title: "Ethereum Finality"
---

This branch of the reading path mattered because it changed the abstraction. Instead of treating consensus as a closed-committee ordering problem, Ethereum separates proposal, fork choice, and finality more clearly.

## Why I Read This Cluster

I wanted to understand which classical BFT intuitions still survive once finality is separated from proposal and tied to a public validator set. This also became the place where my earlier interest in fast-path BFT started to connect to a real deployment roadmap rather than remaining a purely protocol-level comparison.

## Papers and Topics I Read

<details>
<summary>Casper FFG</summary>

Casper FFG became the first paper in this branch because it makes the Ethereum shift explicit. In human terms, I understand it as a finality overlay on top of block production rather than a PBFT-like command-ordering protocol.

What mattered most to me was the change in unit of reasoning. Instead of leader change and per-command commitment, the protocol works with checkpoint links, justified and finalized states, and accountable safety under a public validator set. That made it hard to force directly into PBFT or HotStuff categories, which turned out to be exactly the point.

Reading Casper helped me see that Ethereum is not just “another committee BFT at larger scale.” It changes what finality is attached to, and therefore changes how safety and liveness should be compared.

**Open questions**
- Which parts of classical leader-based BFT still transfer once finality is public and deposit-weighted?
- Where do data availability assumptions enter this picture more strongly than the protocol text suggests?

**Artifacts**
- Notes: [Casper compared with PBFT-style BFT](reaper-workspace/notes/casper-vs-pbft.md)

![LMD-GHOST and Casper FFG intuition](content/diagrams/ethereum-finality.svg)

</details>

### Other Topics In This Branch

- `GHOST / LMD-GHOST`: to understand how fork choice differs from classical BFT commitment
- `Gasper`: to understand how Ethereum combines fork choice with a finality gadget
- `Fast confirmation rule`: as a near-term fast-finality direction
- `Single-slot finality plan`: as the point where Ethereum begins to reconnect more directly with one-round / fast-path BFT ideas

## What This Cluster Showed Me

Ethereum finality is not just a different committee. It changes the relationship among proposal, fork choice, validator visibility, and accountability. That made it a useful bridge between classical BFT reading and a more application-driven question: which fast-finality ideas remain meaningful once the protocol must live inside Ethereum’s public-validator model?

## Open Question

Which BFT ideas are truly portable into Ethereum, and which depend too strongly on a closed committee execution model?
