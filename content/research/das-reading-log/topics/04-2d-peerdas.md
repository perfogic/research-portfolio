---
title: "2D PeerDAS"
subtitle: "Matrix structure and stronger sampling intuition"
order: 4
type: "topic"
diagram: "content/diagrams/peerdas-2d.svg"
---

## Human version

2D PeerDAS makes the coding structure easier to reason about because rows and columns give a more explicit geometry for availability and reconstruction.

## Why I studied it

I wanted to understand what the second coded dimension buys beyond a headline improvement.

## Core mechanism

Arrange coded data in a matrix so that availability can be probed from multiple directions.

## Key insight

The extra structure does more than improve robustness. It changes how one thinks about selective loss, reconstruction paths, and sampling confidence.

## Why it mattered for CDA

It pushed me toward thinking in arrays rather than only in encoded chunks.
