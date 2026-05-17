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

<details>
<summary>LMD GHOST</summary>

Before talking about finality, we need the fork-choice rule first.
In Ethereum today, that rule is `LMD GHOST`.

This part does not finalize blocks.
It answers a simpler question:

> given the blocks and attestations I have received so far, which block should I treat as the head of the chain? - This is called 'canonical chain'.

That is what a proposer builds on, and what attesters vote for in the next slot.

There are two ideas inside the name:

- `LMD`: Latest Message Driven
- `GHOST`: Greedy Heaviest-Observed Sub-Tree

### 1. Latest Message Driven

In proof of work, miners vote for a branch by mining the next block on top of it.
In Ethereum proof of stake, validators vote by publishing attestations.

The head vote inside an attestation is:

```javascript
class AttestationData(Container):
    slot: Slot
    index: CommitteeIndex
    beacon_block_root: Root // LMD GHOST vote
    source: Checkpoint
    target: Checkpoint
```

So for fork choice, the important field is:

```javascript
beacon_block_root;
```

This is the block that the validator currently believes is the best head.

The `LMD` rule is simple:

- keep only the latest attestation from each validator;
- discard that validator's older head votes;
- use the latest one as that validator's current vote weight.

So if validator `V` first voted for block `B`, and later voted for block `C`, then only the vote for `C` remains in fork choice.

That is the `latest` part.
It is also the `message driven` part:

- the fork choice is not driven only by new blocks;
- it is driven by validator messages, which are attestations.

### 2. What goes into fork choice

At any node, the fork choice works only from its local view.
There is no global view of the chain.

This means:

> A node only knows what it currently sees as the canonical chain.
> That view can differ from other nodes.
> More importantly, no node can know which chain the whole network already agrees on.

Specifically, the input is roughly:

- the block tree that this node knows about;
- the latest message from each validator that this node has accepted;
- the effective balance of each validator, which is its vote weight.

That is why two honest nodes can temporarily choose different heads.
They may have received different blocks or different attestations at any moment.

### 3.Let's touch the GHOST part

Once we have one latest vote per validator, the next step is to find the head block.

The rule is not "pick the longest chain" - Longest-chained rule, like in Bitcoin Network.
Instead, it asks:

> at each fork, which child subtree has the most validator weight behind it?

That is the `GHOST` part.

The weight of a validator's vote is its effective balance. In Ethereum, this is the validator's staking weight used by the protocol.\
If a validator votes for a block, that vote also counts in favor of every block on the path from the root to that block.

For example, suppose we have a chain:

`A -> B -> C -> D`

If a validator votes for `D`, that vote is also implicitly supporting `C`, `B`, and `A`.

Overall, the fork choice has two pieces.

First, it needs a scoring rule.
For any block, `get_weight(block)` returns the total validator weight supporting the subtree rooted at that block.

```javascript
function get_weight(block):
    total := direct_vote_weight(block) // direct_vote_weight calculates total_weight voted from all validators at that block

    for each child c of block:
        total := total + get_weight(c)

    return total
```

Second, it uses that score to walk down the tree.
Starting from the root, `get_head()` compares the weights of the child subtrees and always moves to the heaviest one.

```javascript
function get_head(root):
    head := root
    while head has children:
        head := child c of head
                with maximum get_weight(c)
    return head
```

<img src="/assets/images/consensus/01/06.png" alt="03" width="720" />

So `get_weight()` tells us how much support a subtree has, and `get_head()` uses that support to choose the head block.

If two child branches have equal weight, the spec uses a deterministic tie-break.\
That just means every node applies the same fixed rule to break the tie, so they do not diverge for arbitrary reasons.\
In practice, the spec compares the child block roots and picks one consistently.

### 4. Why Ethereum does not use longest-chain

The issue with longest-chain in proof of stake is that it looks only at block extension.
A branch can win simply because it got extended first, even if most validators are already voting for the other branch.

That is a weak signal in proof of stake.
In proof of work, extending a branch costs real physical work.
In proof of stake, it does not.

Ethereum already has a stronger signal: validator attestations.
So `LMD GHOST` does not ask which branch is longer.
It asks:

> which branch currently has the most validator support behind it?

=> This makes `LMD GHOST` more suitable in this situation.

### 5. What LMD GHOST gives, and what it does not

`LMD GHOST` gives Ethereum a fork-choice rule.
It tells each node which head to treat as canonical in its current local view.

But by itself it does not give finality.
Under difficult network conditions, the head can still change.

So the right way to think about it is:

- `LMD GHOST` picks the head;
- `Casper FFG` finalizes checkpoints;
- and Ethereum today combines the two.

That combined design is what we will call `Gasper` in the next section.

</details>

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
