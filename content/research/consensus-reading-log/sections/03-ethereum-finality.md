---
title: "Ethereum Finality"
---

This part is still a draft.

In this roadmap, I want to start from how Ethereum's current consensus actually works today, and then move step by step toward where Ethereum seems to be heading next.

The path I want to take is:

- `LMD GHOST`: to explain Ethereum's current fork-choice rule.
- `Casper FFG`: to explain how finality is added on top of block production.
- `Gasper`: to explain how Ethereum combines fork choice and finality in the current protocol.
- `Fast Confirmation Rule (FCR)`: as a near-term direction for fast confirmation.
- `Single Slot Finality (SSF)`: as the longer-term direction where Ethereum tries to move finality into a single slot.

So this section is not only about explaining finality in the current protocol.
It is also about following the path from Ethereum today toward the `SSF` roadmap.

## LMD GHOST

Draft.

## Casper FFG

Draft.

## Gasper

Draft.

## Fast Confirmation Rule

`FCR` is a near-term direction for getting much faster confirmation on Ethereum without changing the base protocol through a hard fork.

The basic idea is simple:

- under normal network conditions,
- and assuming less than `25%` adversarial stake,
- a block can be fast-confirmed in roughly one slot, around `13` seconds,
- instead of waiting around two epochs for finality.

This is not the same thing as finality.
`FCR` does not give economic finality like `Casper FFG`.
Instead, it gives a deterministic confirmation rule under synchrony assumptions, and when those assumptions stop holding it falls back to finality.

So for me, `FCR` is an important transition point in the roadmap.
It is not yet `SSF`, but it is already pushing Ethereum toward much faster confirmation than the current finality path.

## Single Slot Finality

This is the longer-term direction I want to end with.

`SSF` is the roadmap where Ethereum tries to make finality happen in the same slot as block proposal, instead of waiting roughly two epochs, around `15` minutes.

### What problem is Ethereum trying to solve?

Today, Ethereum's current design is still a compromise between three goals:

- maximize the number of validators that can participate,
- minimize time to finality,
- and minimize the overhead of running a node.

These three goals conflict with each other.
If Ethereum wants strong economic finality, then a very large portion of the validator set has to participate in finalization.
But once many validators need to vote, the network has to download, aggregate, verify, and rebroadcast many signatures.
That pushes up hardware overhead and makes fast finality harder.

So the current system ended up with two visible consequences:

- finality takes around `15` minutes;
- and the minimum stake is still `32 ETH`.

The `SSF` roadmap is trying to improve both of these:

- bring finality down to one slot;
- and eventually make staking much more accessible, potentially far below `32 ETH`.

### Why is this difficult?

The difficult part is not inventing a one-slot finality algorithm in the abstract.
Protocols like Tendermint already show that one-slot-style finality is possible.

The hard part is making that work inside Ethereum's validator model.
Ethereum wants more than just fast commitment.
It wants:

- economic finality,
- a very large public validator set,
- and ideally some recovery behavior such as inactivity leaks.

That is where the overhead problem appears.
If finality has to happen in one slot, then nodes must process enough validator votes quickly enough to know that the `2/3` threshold has been reached inside that same slot.
So the shorter the finality time, the more pressure there is on attestation processing and signature aggregation.

In other words, the real bottleneck is not block proposal itself.
It is vote aggregation at Ethereum's scale.

### Proposed directions

From the current research direction, there are a few leading ways people try to get around this bottleneck.

#### 1. Better aggregation

The most direct idea is brute force:

- improve signature aggregation,
- improve attestation processing,
- and make it feasible to count a huge number of validator votes inside one slot.

This direction tries to preserve Ethereum's economic-finality model as much as possible, while making the underlying machinery much more efficient.

#### 2. Orbit committees

Another direction is to let a randomly selected medium-sized committee finalize the chain, but in a way that still preserves much more of Ethereum's cost-of-attack properties than a naive committee design would.

This is attractive because it opens a middle ground:

- more efficient than requiring the full validator set every slot,
- but still much stronger than a pure committee-based design with weak economic penalties.

#### 3. Two-tiered staking

A third direction is to explicitly separate validators into tiers.
The higher-deposit tier would carry more of the burden for economic finality, while the lower-deposit tier could still participate in other ways.

This direction matters because it connects `SSF` not only with fast finality, but also with staking democratization.

### Why this roadmap matters

So `SSF` is not just "make finality faster".
It is a deeper redesign of how Ethereum counts votes, aggregates signatures, and balances:

- economic security,
- validator-set size,
- node overhead,
- and time to finality.

For now, this is still a research roadmap rather than an implementation roadmap.
It is generally expected to come much later, after other major upgrades such as Verkle and Danksharding.
