---
title: "1D PeerDAS"
subtitle: "Sampling along one coded dimension"
order: 3
type: "topic"
diagram: "content/diagrams/peerdas-1d.svg"
---

## Human version

1D PeerDAS turns data availability into a sampling question: can you check enough coded pieces to gain confidence that the full data exists?

## Why I studied it

It was the first place where the availability problem became operational for me rather than only conceptual.

## Core mechanism

Encode data, distribute it, and let validators sample rather than download everything.

## Key insight

Sampling changes the cost model, but it does not remove the need to reason about reconstruction and retrieval.

## Open questions

- What is hidden by assuming the network can serve the requested samples cleanly?
- Which retrieval asymmetries matter most in practice?
