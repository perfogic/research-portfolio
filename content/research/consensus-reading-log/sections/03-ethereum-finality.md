---
title: "Ethereum Finality"
---

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

### 2. Checkpoints: Source and Target

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

### 3. Justification && Finalization

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

### 4. Slashing Conditions

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

<details>
<summary>Gasper</summary>

`Gasper` is the paper version where Ethereum consensus is written down as one complete protocol.

In the two sections above, we already wrapped up the two main pieces:

- `LMD GHOST` as the fork-choice rule;
- `Casper FFG` as the finality gadget.

So this section does not need to explain Ethereum consensus from scratch again.
The point here is narrower:

- what changes when `LMD GHOST` is turned into `Hybrid LMD GHOST`;
- and what changes when `Casper FFG` is adapted into the slot-based beacon-chain setting.

### 1. Abstract

The role of `Gasper` is not to introduce a third new idea after `LMD GHOST` and `Casper FFG`.
Its role is to say:

- here is how the fork-choice rule and the finality gadget actually run together;
- here is how time is organized into slots and epochs;
- and here is what needs to change in both pieces so the combination is safe.

Revising our previous touched part, Ethereum runs in epochs of `32` slots.
Each slot has one proposer and one attesting committee, so validator work is spread out over the epoch instead of forcing the whole validator set to broadcast signatures at once.

At the protocol level, the checkpoint is the epoch boundary block, that is, the block at the first slot of the epoch.

### 2. Updates on Casper

The first important change is on the `Casper` side.

Abstract `Casper FFG` talks in terms of checkpoints and checkpoint heights. That is a clean model, but it is still too abstract for Ethereum's slot-based beacon chain.

> In paper, they assume every height % 100 is a new checkpoint. (I don't mention in our previous part, because i don't want to make it complicate, now you have to now hehe)

Once time is divided into:

- `slots`
- and `epochs`

the checkpoint object becomes more awkward than in the paper version of `Casper FFG`.

Because in Ethereum, if we put every slot % 32 = 0 will be checkpoint, it will not enough to cover the case "the slot is empty".

So `Gasper` refines the object. Instead of using only about a checkpoint block height, it reasons about an `epoch boundary pair`.

```javascript
(checkpoint block, epoch)
```

I don't want to make you feel complicate, so just see this image:

![alt text](/assets/images/consensus/01/09.png)

Read it like this:

- `Epoch 0`: block `0` is the checkpoint, because it is the genesis block. `Checkpoint: (0, 0)`
- `Epoch 1`: block `32` is the checkpoint, because slot `32` is the first slot of that epoch and it has a block. `Checkpoint: (32, 1)`
- `Epoch 2`: slot `64` is empty, so the protocol cannot point to a new boundary block there. It has to reuse block `32` as the best boundary block available on that chain. `Checkpoint: (32, 2)`
- `Epoch 3`: same idea again. If the boundary slot is empty, the protocol walks backward on that chain and picks the latest block it can still use as the epoch boundary block. In this picture, that becomes block `60`. `Checkpoint: (60, 3)`

So the key point is:
the same block can play the checkpoint role for more than one epoch context.
That is why `Gasper` has to reason about `(checkpoint block, epoch)` instead of only a bare checkpoint block.

### 3. `LMD GHOST` becomes `Hybrid LMD GHOST`

The change is this:
`Gasper` no longer runs `LMD GHOST` on the whole visible tree.
It first adds a filter from the `Casper FFG` side, and only then runs the heaviest-subtree walk.

Concretely, it does three things:

- first find the highest justified pair;
- then ignore branches whose justified state has not caught up to it;
- only then run the heaviest-subtree walk on what remains.

It adds this because fork choice is no longer allowed to look only at subtree weight.
Once `Casper FFG` exists, the protocol also has to care about which branches are still consistent with the current justified state.

That is why the paper does not keep plain `LMD GHOST`.
After a fork, two nearby branches can carry different last-justified states.
If fork choice followed only the heaviest branch, it could pull an honest validator onto a branch whose finality state is behind.
That is the bad case `Hybrid LMD GHOST` is trying to avoid.

You can visualize that bad case like this:

```text
1 ---- 2 ---- 3
 \
  X ---- Y
```

Suppose the current finality state is already on the upper branch:

- `1` was justified earlier;
- `2` is finalized;
- `3` is now the highest justified checkpoint.

Now imagine the lower branch `1 -> X -> Y` starts to look heavier locally.

A plain heaviest-branch rule could be tempted to switch to that lower branch.
But `Hybrid LMD GHOST` will not do that.
It first checks which branches still extend the current justified checkpoint, which is now `3`.
So the lower branch is filtered out before subtree weight is even compared.

### 4. Conclusion

For me, `Gasper` changes two things.

First, `LMD GHOST` becomes `Hybrid LMD GHOST`.
Fork choice no longer follows the heaviest subtree blindly.
It must also respect the highest justified state from `Casper FFG`.

Second, `Casper FFG` is adapted from an abstract checkpoint-height model into a slot-based beacon-chain model.
That is why the paper has to move toward objects that are closer to `(checkpoint, epoch)` than to a bare checkpoint block.

That is enough to wrap up the section:

- the `LMD GHOST` side changes to stay aligned with finality;
- the `Casper` side changes to fit the slot-and-epoch structure of Ethereum.

</details>

<details>
<summary>Fast Confirmation Rule</summary>

`Fast Confirmation Rule`, or `FCR`, is not a new consensus protocol.
It is a fast confirmation layer on top of today's `Gasper`.

The target is practical:

- if a block has already been processed and passes `FCR`,
- then under the paper's assumptions it has a very high chance of continuing all the way to finality;
- so for transactions that are not too large, it is reasonable to treat that block as "final enough" without waiting the full `FFG` path.

This is still not the same thing as finality.
`FCR` does not replace `Casper FFG`.
It tries to give a one-slot-style confirmation signal before finality arrives.

> This one is a draft, I don't refine the paper wording yet. Some parts are written by AI, based on my direction.

### 1. What the algorithm is trying to prove

The paper defines confirmation as a local guarantee:

- if an honest validator confirms block `b` at time `t`,
- then from the next slot onward, honest validators should keep `b` in their canonical chain;
- and once confirmed, `b` stays confirmed.

So the question is:

> given the votes I already see right now, is this block stable enough that honest fork choice should not move away from it anymore?

### 2. First step: a local check for plain `LMD GHOST`

The paper starts with a simpler world where fork choice is only plain `LMD GHOST`.

It defines a local predicate:

```javascript
isOneConfirmed(block, checkpoint, time);
```

This checks whether the subtree containing block `b` already has enough support by a margin large enough to survive:

- the basic `1/2` majority threshold;
- proposer boost;
- possible Byzantine votes;
- and slashed-validator adjustments.

Then it strengthens that into:

```javascript
isLMDGHOSTSafe(block, checkpoint, time);
```

The reason for the second predicate is that `LMD GHOST` does not choose the head in one shot.
It walks fork by fork.
So it is not enough for block `b` itself to look strong.
Every ancestor decision on the path to `b` also has to be stable.

The paper also fixes the empty-slot case.
If some slots between a parent and child are empty, honest votes already cast for the parent branch in those empty slots should still count as locked support for that branch.
Otherwise the rule would be too pessimistic.

So after this first step, the paper has a local test for:

> if fork choice were only `LMD GHOST`, this block is already safe.

### 3. Why Ethereum needs more than that

Ethereum does not run plain `LMD GHOST`.
It runs `LMD-GHOST-HFC`, where the `HFC` part can filter out branches that do not fit the current justified-checkpoint state from `Casper FFG`.

That means a block can pass the subtree-weight test and still fail later for another reason:
its branch may get filtered out by the `FFG` side.

So the full `FCR` cannot stop at:

> this block is safe under subtree weight.

It also has to make sure:

> this block will still survive the justified-checkpoint filtering.

### 4. The full `FCR` algorithm

This is the part that matters most.

The full rule works like this:

1. At the beginning of an epoch, look at the greatest unrealized justified checkpoint from the previous epoch.
2. If that checkpoint is now realized as justified, use it as a safe anchor.
3. From that anchor, walk forward on the current canonical chain one block at a time.
4. For each next block, run the local confirmation check again.
5. Stop at the deepest block that still passes.
6. If the confirmation state becomes stale or inconsistent, reset back to the greatest finalized block.

So the rule is basically:

```javascript
function FCR(view, last_confirmed):
    if candidate_is_too_old_or_no_longer_canonical:
        return greatest_finalized_block(view)

    if new_epoch_started_and_new_justified_checkpoint_is_now_realized:
        candidate := justified_checkpoint_block
    else:
        candidate := last_confirmed

    while next_child_on_canonical_chain(candidate) passes the local check:
        candidate := next_child_on_canonical_chain(candidate)

    return candidate
```

That is the high-level shape.
The real paper adds more guards when the scan crosses epoch boundaries, because that is exactly where conflicting checkpoint justification can appear.

So the algorithm is doing two jobs at once:

- use local subtree-weight evidence to move forward quickly;
- but never move into a region that the `FFG` side may later reject.

### 5. When can this be attacked or fail?

This is the important caveat.
`FCR` is a fast path, so it depends much more on the good-case assumptions than full finality does.

The bad cases are roughly these.

#### 1. The network stops behaving synchronously

If validators do not see roughly the same blocks and attestations soon enough, a block may look locally safe when it really is not globally stable yet.

That is exactly why `FCR` is not sold as full finality.
It is much more sensitive to delayed views than `Casper FFG`.

#### 2. Too much adversarial weight, or too much bad luck in consecutive committees

The paper assumes an adversarial fraction `β < 1/3`, and also assumes that consecutive committees do not end up too adversarial.

If those assumptions break, the local vote-weight test can become misleading.
Then a branch may look safer than it really is.

#### 3. The `FFG` votes do not get included as expected

The rule relies on the justified-checkpoint state catching up at epoch boundaries.
If Byzantine behavior or severe network problems stop enough honest `FFG` votes from getting included for long enough, the fast path cannot safely keep moving.

That is why the algorithm anchors on realized justified checkpoints, not on wishful thinking.

#### 4. Conflicting justification starts to appear across epochs

This is the subtle attack surface that appears only because Ethereum is not plain `LMD GHOST`.

A block may look locally strong by subtree weight, but if the checkpoint state around it is about to conflict with another justified path, then confirming too aggressively would be wrong.

That is why the full algorithm adds extra guards at epoch crossings.

#### 5. The confirmed candidate becomes stale or non-canonical

This is not even a fancy attack.
It can happen after temporary forks or messy network conditions.

If the previously confirmed candidate is now too old, or it is no longer on the canonical chain, the rule immediately gives up on that fast state and falls back to the greatest finalized block.

That reset is a core part of the design, not an edge case.

### 6. The right way to use `FCR`

So the right way to think about `FCR` is:

- for small or medium-value transactions, it tries to give a block that is fast enough to treat as practically finalized;
- for large-value settlement, you still want actual `Casper FFG` finality.

That is why `FCR` is interesting.
It does not change Ethereum's base consensus.
It tries to shrink the huge gap between:

- "this is the current head";
- and "this checkpoint is economically finalized".
</details>

<details>
<summary>Single Slot Finality</summary>

If `FCR` is the fast path before finality, then `Single Slot Finality`, or `SSF`, is the stronger endgame:

- not just "this block is probably safe now";
- but "this block reaches actual finality in the same slot".

At first, I was going to summarize `SSF` from several different posts and scattered discussions.
But recently Ethereum published [Upgrading Finality - Edition 1](https://consensus.ethereum.foundation/blog/upgrading-finality-edition-1), and it gives a much cleaner anchor for this whole direction.

That article is useful here because it reframes the whole problem.
It says Ethereum should stop thinking about fast finality as one giant all-or-nothing jump, and instead break it into a sequence of upgrades.

So for me, the right way to read `SSF` from this article is:

- `SSF` is still the direction;
- but the path to it is now more incremental than older "one-slot finality" thinking.

### 1. Why Ethereum wants this so badly

Ethereum already has strong finality under proof of stake.
If less than `1/3` of stake is hostile, finalized history is unique.
If more than `1/3` manages to finalize conflicting histories, at least `1/3` of total stake gets slashed.

The problem is not the quality of finality.
The problem is the speed.

Today, Ethereum finality is slow enough that a long tail of recent blocks stays unfinaized for quite a while.
Under normal conditions, somewhere around `63` to `95` recent blocks are still sitting in that vulnerable zone.

That matters because the chain is available before it is final.
So applications have to live in this awkward gap:

- the chain keeps moving;
- but the latest part can still be reorged.

That is why exchanges wait for extra confirmations, bridges build special risk controls, and L2s use their own heuristics instead of simply waiting for finality every time.

So the motivation for `SSF` is not abstract elegance.
It is to drastically shrink the reorgable tail of the chain.

### 2. Why current finality is slow

The bottleneck is not that Ethereum lacks a finality gadget.
The bottleneck is that the current one is conservative and heavy.

`Casper FFG` needs two rounds of voting:

- one to justify;
- one to finalize.

Those rounds are pipelined, but finality still takes two full epochs.
With `32` slots per epoch and `12` seconds per slot, the minimum time to finality is:

```javascript
2 * 32 * 12 = 768 seconds
```

and the average transaction waits longer than that.

So the challenge is brutal:

> can Ethereum move from ~1000 seconds to something closer to ~10 seconds?

That is the scale of improvement this roadmap is aiming for.

### 3. The big unlock: decouple finality from fork choice

The article's main message is that the first real unlock is not `SSF` itself.
It is decoupling finality from the current slot-by-slot fork choice.

Right now, Ethereum bundles both into one attestation:

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

So the short-timescale vote and the long-timescale finality vote are tied together.
That creates pressure everywhere:

- slot timing;
- aggregation timing;
- networking;
- and the way `LMD GHOST` and `Casper FFG` interfere with each other.

The proposed change is simple in spirit:

- fork-choice votes and finality votes should become separate messages;
- they should propagate independently;
- and they should be processed on different timescales.

That is the big unlock because finality then stops being trapped inside the slot structure designed for fork choice.

### 4. Why this matters for `SSF`

This is the most important takeaway from the article.

Older attempts like one-slot finality or three-slot finality were treated too much like all-or-nothing upgrades.
They required Ethereum to solve networking, validator scale, aggregation, committee structure, and consensus design all at once.

The new framing is different:

- first decouple finality;
- then speed it up step by step;
- then keep pushing until actual fast finality becomes feasible.

So `SSF` is no longer being framed as:

> replace the whole system with one perfect one-slot design in a single jump.

It is being framed more like:

> make finality its own pipeline first, then keep shortening that pipeline.

That is a much more practical roadmap.

### 5. What needs to improve after decoupling

Once finality is decoupled, the article says Ethereum can attack the problem from several directions independently.

#### 1. Fewer effective validators in the finality path

The easiest win is to reduce how many distinct validator identities need to participate in finality voting.

The article points out that consolidation already helps a lot.
Large operators often run many `32 ETH` validators for historical reasons.
If those are consolidated aggressively, finality voting overhead drops a lot without reducing validator diversity at the entity level.

#### 2. Better aggregation and batching

Another direction is to batch votes earlier and aggregate them better.
Today, a lot of bandwidth is wasted because aggregation is not as efficient as it could be.

So there are gains available from:

- batching attestations at origin;
- better aggregate combination;
- and potentially SNARK-based aggregation later.

#### 3. Better networking

If finality votes become separate from fork-choice votes, they can use bandwidth much more flexibly.
That alone should speed them up, because today attestation propagation is bursty and constrained by the next proposer deadline.

Once decoupled, finality voting can occupy more of the available bandwidth instead of being squeezed into the same narrow slot window.

#### 4. Validator rotation or committee-based finality

Another option is to avoid making the full validator set participate in every finality round.
The article mentions approaches like `Orbit`, where only a subset participates at a given time.

That lowers overhead, though of course it changes the security model and has to be designed carefully.

#### 5. Single-round finality

This is one of the most important ideas.

Today, `Casper FFG` uses two voting rounds.
But if Ethereum were willing to accept a lower fault threshold than the classic `1/3`, then a single-round finality design becomes possible.

That would almost halve time to finality immediately.

So one path toward `SSF` is not only better engineering.
It is also a different consensus point in the design space:

- faster finality;
- but with a smaller hostile-stake tolerance, perhaps around `20%` or `17%`.

### 6. There is also a protocol-cleanup motive

The article makes another important point:
`LMD GHOST` and `Casper FFG` never played perfectly nicely together.

`Gasper` worked, and worked surprisingly well, but the interaction between:

- a dynamic available chain;
- and a trailing finality gadget

has always been a bit rough.

That is one reason Ethereum accumulated fixes, edge-case handling, and extra complexity over time.
The article even hints that moving away from `LMD GHOST` toward a more memory-less fork choice, such as `Goldfish`, may help reduce some of those attack surfaces.

So this roadmap is not only about speed.
It is also about cleaning up a design that has been known for years to be somewhat awkward internally.

### 7. So where does `SSF` fit?

For me, the article says something very clear:

- `FCR` is the near-term fast confirmation layer;
- decoupled finality is the big unlock;
- and `SSF` is the long-term destination, not the very first upgrade.

That means the chain of ideas now looks more like this:

- get faster practical confirmation with `FCR`;
- separate finality from fork choice;
- improve finality bandwidth, aggregation, and validator handling step by step;
- possibly change the finality algorithm itself;
- and only then push all the way toward actual single-slot finality.

So `SSF` is still the dream, but the roadmap is no longer:

- design one perfect `SSF` protocol;
- ship it all at once.

It is now:

- decouple;
- optimize;
- shorten the finality pipeline repeatedly;
- and let `SSF` emerge as the end of that process.

</details>
