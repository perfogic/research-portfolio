---
title: "DHT-based retrieval"
subtitle: "Specific-piece retrieval and the cost of decentralized storage lookup"
order: 2
type: "topic"
diagram: "content/diagrams/dht-piece-retrieval.svg"
---

## Human version

If data is dispersed, someone still has to find the right pieces at the right time.

## Why I studied it

I wanted to understand whether data availability claims remained plausible once retrieval moved onto a decentralized network.

## Core mechanism

A DHT-style setting provides location and lookup structure, but it also surfaces asymmetry: some pieces become more valuable, retrieval becomes targeted, and latency depends on more than protocol correctness.

## What confused me initially

I underestimated how different "piece exists somewhere" is from "piece can be retrieved when needed."

## Key insight

Availability and retrievability are close but not identical.

## Why it mattered for CDA

This is where I started asking whether coding should be tied directly to retrieval structure, not only to storage.
