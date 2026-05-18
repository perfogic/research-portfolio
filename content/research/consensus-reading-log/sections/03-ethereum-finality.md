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

### 3. Justification & Finalization

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

At this case, we can re-imagine our previous talks about `PBFT` and other consensus algorithms, which is two-phase voting.

- `justified`: is the `prepare` voting phase:

```
At least `2/3` of the stake has voted for a link into this checkpoint.
Under the usual `n = 3f + 1` intuition, this means at least `f + 1` honest validators supported that checkpoint.
```

- `finalized` is the `commit` voting phase:

```
the checkpoint is already justified, and then another `2/3` of the stake votes for a link from this checkpoint to its direct child.
So the network did not only support this checkpoint once.
It also built the next justified step on top of it.
```

The quorum-overlap intuition is the same as classical BFT.\
Any two `2/3` quorums must overlap, and if less than `1/3` of validators are Byzantine, that overlap contains at least one honest validator.
Together with Casper's slashing rules, this is why two conflicting checkpoints cannot both be finalized unless at least `1/3` of the stake violates the protocol.

Specifically, a checkpoint is `justified` if:

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

```
Example:
Assume we have two checkpoints:
C1, C2 and C1 -> C2 is a link.

If C1 is justified, that link receives at least `2/3` of the total stake vote.
Then C1 = finalized, C2 = justified.
```

In Ethereum, that means finality takes two epochs end to end, roughly `12.8` minutes, though the pipeline lets the chain finalize one checkpoint per epoch once it is running normally.

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

- first find the highest justified pair; // remember this
- then ignore branches whose justified state has not caught up to it;
- only then run the heaviest-subtree walk on what remains.

We will go a bit to the example:

```text
Assume we have a list of checkpoints with links:
C1 -> C2
with C1 is justified and C2 is justified

Assume now we move to epoch 3, where will build checkpoint C3.
Since we only build on the highest justified pair, then C2 will be parent of C3,
and validators vote for `C3 -> C2` link.

This will enforce honest validators to vote on branch whose finality state behind.
Assume `C3 -> C2` has 2/3 voting power and become `supermajor link`.
Then C2 is finalized and C3 is justified.

If we don't enforce the rule, there may be a link from `C1 -> C3'`, which may outvote our current branch.
This is a way to reduce fork choice.
```

That is why `LMD GHOST` is refined compared to original fork choice rule.\
If we read or watch video from Ethereum Research, we may see they call `LMD GHOST HFC`, this is `Hybrid LMD GHOST`.

There is only one case, we don't cover, why we can have a case both C1 and C2 are justified ?

```
Assume we have a list of checkpoints:
C1 -> ... -> Cn -> Cn+1

with Cn is finalized and Cn+1 is justified.

Now we move to epoch `n+2`, which have checkpoint Cn+2.
Validators will votes on the link: `Cn+1 -> Cn+2`.

Imagining the delay case, where we have more than 2/3 voting power for this link,
but it does not make it on time, so when we go to checkpoint Cn+3 at epoch `n+3`.

We still don't have enough vote for `Cn+1 -> Cn+2` to become supermajor link.
And Cn+3 will be vote from Cn+1.

That's the case xD. This will lead from 1-finality to 2-finality. Where we will have links:
C2k -> C2k + 2
and C2k+1 -> C2k+3 with no finalized checkpoint.

Finalized checkpoint only come back when the voting make it on time. Assume at some round. C2k+3 make it on time, and validators vote on `C2k+3 -> C2k+4`
This will break out of the non-finalized checkpoint loop.
```

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
- then under the good assumptions it has a very high chance of continuing all the way to finality;
- so for transactions that are not too large, it is reasonable to treat that block as "final enough" without waiting the full `FFG` path.

`Single Slot Finality` is still a longer-term destination.
`FCR` is the nearer-term bridge before that design is fully researched, evaluated, and implemented.

### 1. What the rule is trying to prove

The paper defines confirmation as a local guarantee:

- if an honest validator confirms block `b` at time `t`,
- then from the next slot onward, honest validators should keep `b` in their canonical chain;
- and once confirmed, `b` stays confirmed.

So the real question is:

> given the votes I already see right now, is this block stable enough that honest fork choice should not move away from it anymore?

### 2. The core weight argument

The easiest way to understand `FCR` is to ignore `Casper FFG` for a moment and look only at `LMD GHOST`.

Suppose `B10` is currently canonical, and the chain can branch into:

```text
B10 -> B11
    -> B12
```

Now define a few quantities:

- `H(B11)`: honest voting weight supporting `B11`
- `J`: total honest voting weight
- `A`: Byzantine voting weight
- `W`: total voting weight, so `W = J + A`
- `S(B11)`: observed `LMD GHOST` vote weight supporting the subtree of `B11`
- `β`: the maximum adversarial fraction of stake

The first thing to notice is that the real safety condition is:

> honest support for `B11` must already be larger than the maximum support any conflicting fork can still get.
> In other words, `B12` should never be able to out-weight `B11` later.

The strongest conflicting fork rooted at `B12` can still collect:

- all honest validators not supporting `B11`
- plus all Byzantine validators

so its weight is:

```text
(J - H(B11)) + A
```

For `B11` to be safe, we therefore want:

```text
H(B11) > (J - H(B11)) + A
```

Rearranging gives:

```text
2H(B11) > J + A
2H(B11) > W
H(B11) > W / 2
```

So the real safety target is:

```text
H(B11) > W / 2
```

meaning:

> honest support for `B11` alone is already more than half of the total weight.

If that holds, then even if all remaining honest validators and all Byzantine validators support a conflicting branch, they still cannot beat `B11`.

The problem is that `H(B11)` is hidden.
In a real blockchain network, a node cannot directly observe this value.
A node does not know who is honest.
What it can actually observe is `S(B11)`.

In the worst case, Byzantine support inside `S(B11)` can be as large as:

```text
βW
```

So honest support is at least:

```text
H(B11) >= S(B11) - βW
```

Now plug that into the true safety target `H(B11) > W/2`.
It is enough to require:

```text
S(B11) - βW > W / 2
```

which rearranges into:

```text
S(B11) > W(1/2 + β)
```

or equivalently:

```javascript
Q(B11) := S(B11) / W;
```

```text
if Q(B11) > 1/2 + β
```

This is the observable confirmation rule.

So the logic is:

```text
Q(B11) > 1/2 + β
=> S(B11) > W(1/2 + β)
=> H(B11) >= S(B11) - βW > W/2
=> B11 is safe now
```

This is the core `LMD GHOST` idea inside `FCR`.
The branch of `B11` is not just barely ahead.
It is ahead by a large enough margin that even after reserving room for Byzantine behavior, the branch should still win.

The next useful observation is that this support ratio does not get worse over time.

It helps to rewrite the same argument in an honest-support view:

```text
P(B11) := H(B11) / J
```

This means:

> among the honest validators, how much honest weight already supports `B11`?

Now suppose in a future slot, `X` honest voting weight supports a descendant of `B11`.
Because descendants of `B11` also support `B11`, we get:

```text
H'(B11) = H(B11) + X
J' = J + X
```

So the future honest-support ratio becomes:

```text
P'(B11) = (H(B11) + X) / (J + X)
```

and:

```text
(H(B11) + X) / (J + X) >= H(B11) / J
```

because `H(B11) <= J`.

So `P(B11)` never decreases.

This is the monotonicity intuition:

- once enough honest weight is already behind `B11`,
- future honest votes for descendants of `B11` only reinforce that support,
- so the branch does not become weaker over time.

In the real paper, the rule has to cover more than this simplified picture.
It also accounts for:

- proposer boost;
- slashed-validator weight;
- and missing-slot handling.

So the full formula is more complicated than `Q > 1/2 + β`.
If needed, it is better to read the short explainer version directly, because the fully refined expression is not very friendly on a first pass.

### 3. The full rule in Ethereum

The weight argument above is only the core proof ingredient.
The full rule in Ethereum still has to run inside `Gasper`.

Under plain `LMD GHOST`, the main question was only:

> does this branch already have enough support to stay canonical?

But inside `Gasper`, fork choice is the `Hybrid LMD GHOST` version we already discussed in the previous section.
That means fork choice does not follow the heaviest branch blindly.
It only considers branches that still extend the latest justified checkpoint.

So a block can look strong under subtree weight right now, but still become unusable later if its branch stops extending the justified checkpoint that the protocol has moved to.

That is why the full `FCR` is not just one inequality checked once.
It has to run again over time, after the node has applied newly arrived attestations, to make sure both things are still true:

- the branch is still strong enough under `LMD GHOST` weight;
- and the branch is still compatible with the justified-checkpoint state used by `Hybrid LMD GHOST`.

Each run starts from the block that was confirmed in the previous run, which is exactly the value stored in:

```javascript
store.confirmed_root;
```

There are two algorithms in the paper, and they work together.

#### Algorithm 1: `get_latest_confirmed`

This is the outer controller. Its job is to decide what the confirmation process should do in this slot.

It has two phases.

**1. Reset / restart phase**

Before trying to confirm anything new, it first asks:

- is the current confirmed block too old?
- is it no longer canonical?
- are we at an epoch boundary where the old confirmed chain can no longer be safely reconfirmed?

If the answer is bad enough, it resets back to `the greatest finalized block`.

Near the end of an epoch, a validator may already see enough `FFG` votes for a newer checkpoint.
But the protocol does not treat that checkpoint as justified yet.
It only becomes justified for fork-choice purposes at the beginning of the next epoch.

Only at the beginning of the next epoch does that checkpoint become realized as justified.
At that point, `FCR` can safely restart from it as a new anchor.

**2. Progress phase**

Once the state has been cleaned up, the algorithm does:

```javascript
b_c < -find_latest_confirmed_descendant(b_c);
```

This is the step where the latest confirmed block is actually updated.

#### Algorithm 2: `find_latest_confirmed_descendant`

This is the engine that tries to extend confirmation forward on the current canonical chain.
It does not jump straight to the head.
It moves one block at a time, and every step is controlled by one local test:

```javascript
isOneConfirmed(b, C, t);
```

This is the per-block confirmation check.
It asks whether block `b`, relative to checkpoint anchor `C`, already has enough `LMD GHOST` support margin that a sibling branch cannot later overtake it.

It always uses one fixed checkpoint anchor for the current run:

```text
C := the validator's observed unrealized-justified checkpoint from the previous epoch
```

This anchor matters because all local `isOneConfirmed(...)` checks are interpreted relative to that checkpoint state.

The intuition is:

> relative to checkpoint `C`, block `b` has enough `LMD GHOST` support to defeat any sibling takeover, even after accounting for proposer boost, empty-slot discounting, adversarial budget `β`, and slashability corrections.

So `Algorithm 2` is really doing this:

- start from the current `b_c`
- look at the next block on the current canonical chain
- check whether that block still passes the local proof
- if yes, move one step forward
- if not, stop there

For each block it wants to accept, it asks two things:

- does the block still pass the local `isOneConfirmed(...)` test?
- and is the block still robust against `Hybrid LMD GHOST` / `Casper FFG` filtering?

The paper then effectively breaks this into four operational cases.

**Case 1: Current-epoch Fast path**

First compute a candidate:

- the deepest descendant of `b_c` on the current fork-choice head chain
- such that every block from `b_c` up to that candidate is `one-confirmed`

This candidate is returned only when it is safe to confirm into the current epoch.

That means:

- the anchor is still fresh enough;
- and if the scan crosses into the current epoch, the checkpoint on this branch is guaranteed to become justified.

This is the "good case" fast path.

**Case 2: Mid-epoch No-progress Freeze**

Sometimes the rule is in the middle of an epoch and still cannot rule out a future conflicting justification for the current epoch.

In that case it does not try to be clever.
It simply returns `b_c` and makes no new confirmations.

This is a freeze, not a failure.

The reason is simple:

- mid-epoch, if a future conflicting justification is still possible,
- then confirming further now could produce blocks that will be filtered out at the next epoch boundary.

So the safe move is to wait.

**Case 3: Previous-epoch Fast path**

If the current-epoch fast path does not apply, the algorithm still has a weaker way to move forward.

It recomputes the deepest `one-confirmed` descendant of `b_c` on the head chain, but now restricts itself to blocks before the current epoch.

It returns that candidate only if its voting source is still fresh enough, meaning it is not too many epochs behind.

The idea is:

- even if we cannot safely confirm into the current epoch yet,
- we may still be able to confirm some more blocks from the previous epoch,
- as long as their support is anchored in a sufficiently recent voting source.

**Case 4: Strong Fallback**

If even the previous-epoch candidate is too stale, the rule becomes stricter again.

It now asks for a descendant that certifies freshness:

- a canonical descendant with a sufficiently recent voting source;
- and a sufficiently recent unrealized-justified anchor.

If no such certifying extension exists, the algorithm does not move forward.

This is the final safety valve before falling back to the old confirmed block.

So the two algorithms together do exactly this:

- `Algorithm 1` keeps the confirmation state sane across slots and epoch boundaries;
- `Algorithm 2` pushes that state forward only as far as the local proof and the `Hybrid LMD GHOST` filtering logic still allow.

This also tells us the main caveat.
`FCR` is a fast path, so it depends much more on good-case assumptions than full finality does.
If synchrony breaks, if committee distribution gets unlucky, or if the justified-checkpoint picture becomes unsafe, the rule stops extending and falls back to safer anchors instead of pretending the fast proof still works.

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
