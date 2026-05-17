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

<details>
<summary>Casper FFG</summary>

`Casper FFG` stands for `Casper the Friendly Finality Gadget`.

The key word here is `gadget`. It sits on top of fork choice rule and adds finality for it.

So if `LMD GHOST` answers:

> which head should I build on right now?

then `Casper FFG` answers:

> which part of the chain is now safe to never revert?

`Casper FFG` is a BFT-style finality gadget.
It uses validator voting, a `2/3` threshold, and a two-step commit structure to add finality.

Overall, it is not a standalone BFT blockchain protocol and it finalizes checkpoints on top of an underlying chain.

Its effectiveness comes down to two ideas:

- `two-phase commit`
- `accountable safety`

The two-phase commit is what gives it classical BFT-style finality.
Accountable safety is what makes conflicting finality economically expensive.

### 1. Why LMD GHOST is not enough

`LMD GHOST` is only a fork-choice rule.
It helps nodes choose the best head from their current local view, but it does not make that head permanent.

So even if most honest nodes currently agree on the head, that head can still change later if new blocks or attestations arrive.
This is enough for chain growth, but it is not enough for finality.

Ethereum needs one more layer that can say:

> from this point backward, the chain should never be reverted.

That is the role of `Casper FFG`.

### 2. Checkpoints, source, and target

`Casper FFG` does not vote on every block directly.
It works on checkpoints.

In Ethereum today, a checkpoint is attached to an epoch, which is `32` slots (`32 * 12 / 60 = 6.4` minutes).\
The reason for why we have to divide to many slots in an epoch is due to a very large validator set on Ethereum, aggregation signature is the slowest path in broadcasting data in Ethereum, if we wait to enough signatures, it will be too slow and overhead.\
That's why they divide into 32 commitees, each commitee will propose block on each slot

Overall, instead of finalizing every block, `Casper FFG` finalizes checkpoint blocks at the epoch level.

Inside an attestation, we already saw the `LMD GHOST` vote before:

```javascript
class AttestationData(Container):
    slot: Slot
    index: CommitteeIndex
    # LMD GHOST vote
    beacon_block_root: Root
    # FFG vote
    source: Checkpoint
    target: Checkpoint
```

In the previous section, the important field was:

```javascript
beacon_block_root;
```

For `Casper FFG`, the important fields are now the last two:

```javascript
source;
target;
```

A `Casper FFG` vote has two important parts:

- The `source` is the justified checkpoint that the validator currently trusts.
- The `target` is the newer checkpoint that the validator wants to justify next.

So a vote is not just "I like this block".
It is a link:

```javascript
source -> target
```

If at least `2/3` of the total stake votes for the same link, that link becomes a `supermajority link`.

### 3. Justification and finalization

Casper finality is a two-step process.

You can think of `Casper FFG` as a two-round commit process.

In round 1, I tell the network which checkpoint I think should move forward.
Then I hear what other validators support.
If I see `2/3` of the total stake supporting the same checkpoint, I can justify it.

In round 2, I tell the network that this checkpoint is now my justified checkpoint.
Then I hear whether the rest of the network also treats it as justified.
If I again see `2/3` support, I can finalize the earlier checkpoint.

So the difference is:

- `justified`: I know enough validators support this checkpoint;
- `finalized`: I know enough validators know that this checkpoint is supported and committed.

That second step is what makes finality strong.

First, a checkpoint becomes `justified`.
Second, an earlier justified checkpoint becomes `finalized`.

A checkpoint is `justified` if:

- it is the root checkpoint;
- or there is a supermajority link from an already justified checkpoint to it.

Then a checkpoint becomes `finalized` when:

- it is already justified;
- and there is a supermajority link from it to its direct child checkpoint.

So the shape is:

```javascript
justified source -> justified target
```

and then the earlier checkpoint is finalized once the chain has moved one more checkpoint forward.

In Ethereum, that means finality takes two epochs end to end, roughly `12.8` minutes, though the pipeline lets the chain finalize one checkpoint per epoch once it is running normally.

This is why the mechanism feels close to `PBFT` or `Tendermint`.
It has the same high-level BFT intuition:

- first enough validators support a checkpoint;
- then enough validators support moving forward from it;
- and only then do we treat the earlier point as final.

### 4. The two slashing conditions

Casper's safety comes from two slashing conditions.

A validator must not:

- make two different votes for the same target epoch;
- make one vote that surrounds another.

The first is usually called `double vote`.
The second is usually called `surround vote`.

#### Double vote

A `double vote` means the validator votes twice for the same target epoch, but with two different targets.

<img src="/assets/images/consensus/01/07.png" alt="03" width="720" />

#### Surround vote

A `surround vote` means one vote wraps around another.

For example, suppose a validator first votes:

```javascript
(source = A), (target = D);
```

and later votes:

```javascript
(source = B), (target = C);
```

with:

```javascript
h(A) < h(B) < h(C) < h(D);
```

<img src="/assets/images/consensus/01/08.png" alt="03" width="720" />

### 5. What Casper FFG guarantees

The two guarantees of `Casper FFG` are:

- `accountable safety`
- `plausible liveness`

`Accountable safety` is the safety side.
If less than `1/3` of the total stake violates a slashing condition, then two conflicting checkpoints cannot both be finalized.

This is already close to the usual BFT safety story.
But Casper adds one more guarantee on top.
If conflicting checkpoints are ever finalized, then at least `1/3` of the total stake must have violated a slashing condition and can be slashed for it.

That is why this is often called `economic finality`.
The protocol is not only saying that a finalized checkpoint should be safe.
It is also saying that breaking that finality has a large, explicit cost.

`Plausible liveness` is the liveness side.
Casper FFG is not responsible for producing blocks, so its liveness claim is narrower than "the chain always grows".
What it guarantees is that finality should not get stuck forever.

More precisely, if at least `2/3` of the validators follow the protocol, then it must always remain possible to add new supermajority links, justify new checkpoints, and finalize new checkpoints without honest validators getting slashed.

This is also why Casper's fork-choice rule matters.
The underlying chain has to keep building on the branch containing the highest justified checkpoint.
That is the branch where the protocol knows it can keep moving finality forward safely.

To sum up, the right way to think about Ethereum consensus up till now is:

- `LMD GHOST` keeps choosing the head;
- `Casper FFG` keeps marking which checkpoints are safe;
- and the combination gives Ethereum both head selection and finality.

</details>

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
