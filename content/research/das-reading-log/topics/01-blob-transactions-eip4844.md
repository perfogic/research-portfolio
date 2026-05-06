---
title: "Blob transactions / EIP-4844"
subtitle: "Why Ethereum introduced blobs for cheaper data availability"
order: 1
type: "topic"
diagram: "content/diagrams/eip4844-blob-flow.svg"
notes: "content/research/das-reading-log/topics/01-blob-transactions-eip4844.md"
---

## Human version

Blobs made it easier to see that execution and data availability should not be treated as the same problem.

## Why I studied it

I wanted to understand the protocol pressure that created a separate blob lane in Ethereum.

## Core mechanism

Blob-carrying transactions move large data off the expensive execution path while still making commitments available for verification.

## What confused me initially

At first I treated blobs as mainly a fee or throughput feature. The deeper point is that they expose the data path as a first-class systems object.

## Key insight

Once blobs exist, data retrieval assumptions become unavoidable.

## Why it mattered for CDA

It was the first step that made me ask whether coded retrieval should be designed explicitly rather than inherited from replication.
