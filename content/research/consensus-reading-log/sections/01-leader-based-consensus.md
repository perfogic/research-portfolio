---
title: "Leader-Based Consensus"
---

## Two-Round Voting Consensus

<details>
<summary>PBFT</summary>

PBFT was my starting point for understanding leader-based BFT. At first, it was not introduced as a blockchain protocol, but as a practical Byzantine fault-tolerant replication protocol for distributed services.

[The original paper](https://css.csail.mit.edu/6.824/2014/papers/castro-practicalbft.pdf) later demonstrates it through a Byzantine-fault-tolerant NFS implementation. Personally, PBFT matters because it exposes the core structure that many later blockchain BFT protocols either inherit or try to simplify.

To begin with, PBFT assumes a known replica set and tolerates up to `f` Byzantine replicas out of `n = 3f + 1`.
The main quorum idea is that PBFT keeps relying on sets of size `2f + 1`. Since at most `f` replicas can be Byzantine, any such quorum must still contain at least `f + 1` honest replicas. That overlap is what gives the protocol its safety, because two conflicting values cannot both gather strong support without running into honest witnesses.

In blockchain language, we can think of one replica as the proposer (or primary) for a given slot, while the others act as validators checking and voting on the proposal.

**PBFT can be read as one proposing phase followed by two voting phases:**\
If we follow the original paper, the flow begins when a client sends a request to the primary replica. This primary is the replica whose turn it is to act as proposer in the current view. In blockchain language, we can imagine this more simply as the moment when a block proposer proposes a block for the next slot.

The primary then enters the **proposing phase** by broadcasting a `PRE-PREPARE` message, which says that a particular request (or, in blockchain language, a block) should occupy a specific sequence slot in the current view.

Next comes the first voting phase, called **prepare**. After accepting the proposal, replicas broadcast `PREPARE` messages to each other. Once a replica sees enough matching prepare messages, it knows that this value has gained sufficient support in the current view. Specifically, it must have the original `PRE-PREPARE`, `2f` matching `PREPARE` messages from other replicas, and its own `PREPARE`. At that point, the replica marks the value as **prepared** and moves to the next voting phase.

Then comes the second voting phase, called **commit**. Replicas broadcast `COMMIT` messages, and once enough `2f + 1` matching `COMMIT` messages are collected, the value becomes durable enough to survive a later leader change. After that, the replica can safely execute the request and reply to the client.

![alt text](/assets/images/consensus/01/00.png)

**The normal path above only works when the primary behaves well. So the next question is: what happens when the leader fails?**

This is where **view change** enters. View change is PBFT’s way of replacing the leader without losing the safety information accumulated in the previous view.

At a high level, it has three phases:

- **Trigger**: replicas stop waiting for progress from the current primary and decide to move to a higher view.
- **View-change**: replicas send the next primary their local safe state, including checkpoint and prepared information as `VIEW-CHANGE` messages.
- **New-view**: the new primary collects enough `VIEW-CHANGE` messages, reconstructs a safe history from them, and broadcasts a `NEW-VIEW` message. This message includes the evidence used to justify the new view, together with the new `PRE-PREPARE` messages for the requests being carried forward. After replicas accept it, they enter the new view and resume the normal path.

This is the heaviest part of PBFT. The protocol is not only trying to agree in the current view, but also trying to preserve that agreement when the leader changes.

A useful intuition is that PBFT only carries forward requests that already had enough prepared evidence. Anything weaker may be dropped or replaced when the new view is rebuilt.

### Complexity

The figure above already shows that PBFT’s normal path is quadratic in the number of replicas. In both the **prepare** phase and the **commit** phase, replicas broadcast messages to other replicas, so the communication cost grows as `O(n^2)`.

The more costly part appears during **view change**. When the leader fails, the new primary must collect safety evidence from many replicas and redistribute enough of it to justify the next view. This is why later BFT papers usually summarize PBFT’s leader-failure cost as `O(n^3)`.

If the system suffers `f` consecutive faulty leaders, this cost can accumulate to `O(fn^3)` before a correct leader finally completes a successful view.

| Scenario                         | Communication cost |
| -------------------------------- | ------------------ |
| Correct leader / normal path     | `O(n^2)`           |
| One leader failure (view change) | `O(n^3)`           |
| `f` consecutive leader failures  | `O(fn^3)`          |

### Why safety works

**PBFT uses quorums of size `2f + 1` under `n = 3f + 1` in both voting phases.**

If two such quorums `P` and `P'` exist, then

`|P ∩ P'| >= |P| + |P'| - n`
`= (2f + 1) + (2f + 1) - (3f + 1)`
`= f + 1`

Since at most `f` replicas can be Byzantine, this overlap must contain at least one honest replica.

That is the basic quorum-overlap reason PBFT can prevent two conflicting values from both gaining strong support.

**Now suppose PBFT tried to finalize after only one voting phase with a quorum of size `2f + 1`. Let's see what will happen**

A quorum of size `2f + 1` guarantees only `f + 1` honest witnesses for that value, because up to `f` members of the quorum may still be Byzantine:

`(2f + 1) - f = f + 1`

That is enough to support the value in the current view, but not enough to make it durable across view change.

The problem is that the remaining honest replicas that may not have witnessed this value are still:

`(2f + 1) - (f + 1) = f`

So a conflicting value may still gather plausible recovery support from:

- `f` Byzantine replicas; and
- `f` honest replicas that never saw the first value strongly enough.

That gives up to `2f` plausible reports for a conflicting value.

This is why one voting phase is not enough for PBFT.\
The **prepare** phase gives strong support in the current view, but the **commit** phase is what makes that support durable enough to survive leader change.

### Further detail:

For a more detailed PBFT walkthrough, including additional paper-level details, I keep a longer version here: [Link](https://coded-distributed-arrays.notion.site/PBFT-32f0f6a329b4803b97faeab7e3eea45b)

</details>

<!-- OTHER PART -->
<details>
<summary>Tendermint</summary>

Tendermint is a modified PBFT-style protocol for practical blockchain deployment. If you have touched Cosmos before, the name is probably already familiar: [Tendermint](https://tendermint.com/).

Compared with PBFT, there are two big changes:

1. Tendermint does not have a separate **view-change** subprotocol. Instead, each round already has its own new proposer, and moving to the next round is part of normal execution.
2. Tendermint does not assume every validator directly talks to every other validator. It works over a **gossip-based peer-to-peer network**, where a validator only knows a subset of peers.
   If you want a more concrete networking picture, I used to write a medium blog on how message probagation works in Ethereum [Link](content/writing/09-22-2025-ethereum-p2p.md).

At the vote-shape level, Tendermint still looks very close to PBFT:

- PBFT: `PRE-PREPARE -> PREPARE -> COMMIT`
- Tendermint: `PROPOSAL -> PREVOTE -> PRECOMMIT`

So the real difference is not the number of vote phases. The deeper difference is how proposer change is handled, and why it has to be handled differently in this network model.

### Trade-Offs From PBFT View Change

PBFT assumes that a new leader can explicitly collect status information from the others, then redistribute enough proof so that everyone can verify the next proposal is safe. That works, but it also makes proposer change heavy.

In a blockchain-style setting, requiring one validator to directly know and communicate with every other validator already creates heavier communication and heavier workload. A PBFT-style design is still possible, but it scales poorly as the validator set grows.

Instead of using a separate proof-heavy view-change protocol as pBFT, Tendermint changes the design at exactly that point:

- it removes the dedicated `VIEW-CHANGE / NEW-VIEW` subprotocol;
- it keeps one repeated round structure;
- it lets safety move across rounds through four local variables:
  `lockedValue`, `lockedRound`, `validValue`, and `validRound`;
- when a new proposer proposes a block, the important pair is `validValue` and `validRound`, which act as the proposer’s memory of the latest safe candidate.

For example, if a proposer wants to propose block `B+1`, it has to piggyback a value that was already supported earlier, together with the round where that support happened.
Other validators then check whether that proposal is still safe to vote for, based on their local lock state.

### Timeout and Round Movement

Tendermint adds three timeouts:

- `timeoutPropose`
- `timeoutPrevote`
- `timeoutPrecommit`

They are the reason the protocol keeps moving instead of waiting forever.

- If no acceptable proposal arrives in time, a validator sends `PREVOTE(nil)`.
  This means: in this round, I am not voting for any block.
- If no value gets enough prevotes in time, it sends `PRECOMMIT(nil)`.
  This means: in this round, I am not precommitting any block.
- If no decision happens after precommit, it starts the next round.

If a round does not lead to a decision, Tendermint moves to a higher round with a larger timeout. The idea is that when the network is slow, validators should wait longer before giving up.

This increasing-timeout mechanism is necessary for progress under partial synchrony. If the current round fails, the next round waits longer. That gives proposals and votes more time to propagate through the network, until the proposer can finally learn a `validValue` and `validRound` that honest validators can safely accept.

A short way to picture it is:

- **Prevote does not finish**: the proposal arrives, but not enough `PREVOTE` messages are collected in time. Validators move to the next round, which waits longer. If the new proposer has already learned a `validValue`, it must re-propose that value with its `validRound`; otherwise it may propose a fresh value.
- **Precommit does not finish**: enough prevotes may have existed for some validators, but not enough `PRECOMMIT` messages are seen in time. In the next round, a correct proposer that already learned `validValue` and `validRound` can re-propose that same value, so validators can safely prevote for it again.
- **No decision after precommit**: even after precommit, if the round still does not produce a decision, validators start the next round with a larger timeout. Eventually, a correct proposer has enough information to re-propose a safe candidate through `validValue` and `validRound`, and the protocol tries again in the normal `PROPOSAL -> PREVOTE -> PRECOMMIT` flow.

Overall, this one contrasts with PBFT. PBFT uses timeouts too, but a timeout there triggers a separate view-change protocol. In Tendermint, a timeout is part of the normal round structure and simply moves the protocol into the next round.

### State Variables That Preserve Safety

The two variable pairs that matter most are:

- `lockedValue`, `lockedRound`
- `validValue`, `validRound`

The **lock** is the safety side. Once a validator locks a value `v` in round `r`, it should not later vote for a conflicting value unless the new proposal carries enough evidence from a round at least as new as that lock.

The `validValue` / `validRound` pair is the proposer’s memory. If a proposer has already seen a value that looked decidable before, it re-proposes that value together with the round where it was justified.

**So the short mental model is:**

- `lockedValue` protects **Agreement**
- `validValue` helps **Termination**

The deeper dilemma is not only whether the new proposer knows what is safe. The harder question is whether the other validators can also be convinced to vote for that proposal safely.

In PBFT, this is handled explicitly. The new leader gathers status information and carries enough proof so that honest replicas can verify that the proposal is safe to support.

Tendermint reduces that proof-carrying burden, but it does not get this for free. The trade-off is time. After GST, waiting long enough allows the proposer to learn the highest relevant lock and propose a value that honest validators can safely accept.

**So one useful way to compare them is:**

- PBFT pays more in explicit recovery communication
- Tendermint pays more in timeout-based waiting

This is the reason Tendermint is simpler than PBFT at proposer change, but the proposer may have to wait longer before the next safe round can move.

### Complexity

Compared with PBFT, Tendermint can be summarized in the same three columns:

| Scenario                          | Complexity |
| --------------------------------- | ---------- |
| Correct leader                    | `O(n^2)`   |
| Leader failure (one failed round) | `O(n^2)`   |
| `f` leader failures               | `O(fn^2)`  |

Tendermint does not have a separate complexity spike for view change. If one proposer fails, the protocol just times out and repeats the same round structure again, so the communication pattern stays the same as in the correct-leader case.

One trade-off is that Tendermint is not **responsive**. Here, responsiveness means that once the network becomes good again, the protocol can immediately progress at the actual network speed, without waiting for a preconfigured timeout to expire. Tendermint still depends on those timeout waits when moving across rounds.

This leads naturally to HotStuff, which also tries to avoid PBFT’s heavy view-change cost, but does so by redesigning the proof structure rather than relying on timeout-based waiting.

### Further details

For a more detailed Tendermint walkthrough, including additional paper-level details, I keep a longer version here: [Link](https://coded-distributed-arrays.notion.site/Tendermint-34e0f6a329b4801db987d603ca242b0f?source=copy_link)

</details>

<details>
<summary>HotStuff</summary>

HotStuff is a protocol that can reach **linear complexity**, while PBFT and Tendermint remain **quadratic**.
The other important point is responsiveness. Tendermint avoids PBFT's heavy view-change protocol, but it still depends on waiting long enough for timeout-based round progression.
HotStuff tries to get both things at the same time: simpler leader replacement and **optimistic responsiveness**.

The price it pays is one extra voting phase.

That extra phase solves one problem:

> when a new leader takes over, how can it quickly learn the highest safe parent block to build from, without using a heavy PBFT-style recovery proof and without waiting like Tendermint?

HotStuff answers that question with a QC chain.
These phases do different jobs.

The `PREPARE` phase produces the certificate that tells the next leader which block is the safest parent to build on.
The `PRE-COMMIT` phase strengthens that proposal enough for replicas to lock on it, so they will not later vote for a conflicting block.
The `COMMIT` phase turns that locked proposal into a final decision. Once enough `COMMIT` votes are collected, the leader forms `commitQC` and broadcasts `DECIDE`, so replicas can safely treat that block as committed and execute it.

Before going into the algorithm, there are five names worth keeping in mind.

- `prepareQC`: the certificate formed after enough `PREPARE` votes. It shows that a proposal already has enough support to be considered the best safe candidate so far.
- `highQC`: the highest `prepareQC` the new leader learns from `NEW-VIEW` messages. This is what the leader uses to decide which parent block to extend next.
- `precommitQC`: the certificate formed after enough `PRE-COMMIT` votes. This is the point where the proposal becomes strong enough for replicas to lock on it.
- `lockedQC`: the local lock a replica stores after receiving a valid `precommitQC`. It prevents the replica from later voting for a conflicting branch unless a higher justified QC appears.
- `commitQC`: the certificate formed after enough `COMMIT` votes. Once the leader broadcasts `DECIDE` with this certificate, the block can be executed.

In short, we have:

- `prepareQC / highQC` are about choosing the highest safe parent block to build from;
- `precommitQC / lockedQC` are about turning support into a lock;
- `commitQC` is about finalizing the decision.

### Algorithm

HotStuff is easiest to read as a handoff protocol between leaders.

The core question is:

> if the current leader disappears at a bad moment, what exact piece of information should the next leader collect so it can continue from the right block?

HotStuff's answer is: collect the highest `prepareQC`.

That is why the algorithm begins with `NEW-VIEW` messages.

#### Phase 1. PREPARE

At the start of a view, the leader waits for `NEW-VIEW` messages from `n - f` replicas.
Each replica sends its highest known `prepareQC`.
The leader picks the highest one and calls it `hihttps://file+.vscode-resource.vscode-cdn.net/Users/perfogic/Workspace/Research/consensus-papers/assets/images/consensus/01/01.png?version%3D1778411744426ghQC`.

This gives the leader a concrete parent block to build on.
In blockchain language, `highQC.node` is the highest safe parent block the leader currently knows how to extend.

Only after learning `highQC` does the leader create a new proposal.
It extends `highQC.node`, broadcasts a `PREPARE` message, and includes `highQC` as the justification for why this proposal is safe.

Replicas then check two things:

- does this proposal extend a branch I am already locked on?
- if not, does the attached QC come from a higher view than my current lock?

If the answer is yes, they send `PREPARE` votes back to the leader.
Once enough of these votes are collected, the leader forms a new `prepareQC`.

So the `PREPARE` phase does one precise job:
it creates the certificate that future leaders will later use to decide which block is safest to continue from.

#### Phase 2. PRE-COMMIT

Now the leader takes that `prepareQC` and broadcasts it in a `PRE-COMMIT` message.
At this point, the protocol is no longer asking replicas whether the proposal is safe to start from.
That question was already answered in the `PREPARE` phase.

The purpose of `PRE-COMMIT` is narrower:
every replica that accepts this message now learns the same `prepareQC`, keeps it locally, and sends a `PRE-COMMIT` vote for the same proposal.

This detail matters because `prepareQC` is exactly what replicas later send forward in `NEW-VIEW`.
So by the end of this phase, the protocol is making sure that the certificate behind the proposal is no longer known only by the leader.
It is now known by a wide enough set of replicas that a later leader can recover it too.

This is also why the phase still needs a new vote.
The protocol is not only rebroadcasting `prepareQC`; it is also collecting a fresh quorum showing that enough replicas have now seen that certificate and are still willing to continue with the same proposal.

This is the extra phase HotStuff adds after the first support certificate is formed, but before the proposal becomes locked and then committed.

Its purpose is not merely “more confirmation”.
Its real purpose is to spread the `prepareQC` widely enough before any replica locks on the block.

**That matters because the leader may fail immediately after this point.**
If some replicas are later going to lock on this proposal, the next leader must still be able to learn about the same `prepareQC` from a quorum of replicas.
The `PRE-COMMIT` phase is what makes that possible.

So the `PRE-COMMIT` phase does one precise job:
it turns “the leader has a `prepareQC`” into “enough replicas also know that same `prepareQC` for the next leader to recover it later”.

#### Phase 3. COMMIT

Once the leader has enough `PRE-COMMIT` votes, it forms `precommitQC` and broadcasts a `COMMIT` message carrying it.

When replicas receive this message, they do two things:

- they store `precommitQC` locally as `lockedQC`;
- they send `COMMIT` votes back to the leader.

This is the moment where the proposal becomes lock-protected.
From this point on, a replica should not vote for a conflicting branch unless it later sees a higher justified QC.

So the `COMMIT` phase does one precise job:
it converts a supported proposal into a locked proposal.

#### Phase 4. DECIDE

Finally, once the leader has enough `COMMIT` votes, it forms `commitQC` and broadcasts `DECIDE`.

After receiving `DECIDE`, replicas:

- treat the proposal as committed;
- execute the commands in the committed branch;
- move to the next view.

So the `DECIDE` step does one precise job:
it tells replicas that the block is no longer just safe to lock, but safe to execute.

#### Visualization

![alt text](/assets/images/consensus/01/01.png)

### Complexity

Compared with PBFT and Tendermint, HotStuff can be summarized in the same three columns:

| Scenario                     |      PBFT | Tendermint | HotStuff |
| ---------------------------- | --------: | ---------: | -------: |
| Correct leader               |  `O(n^2)` |   `O(n^2)` |   `O(n)` |
| Leader failure / view change |  `O(n^3)` |   `O(n^2)` |   `O(n)` |
| `f` leader failures          | `O(fn^3)` |  `O(fn^2)` |  `O(fn)` |

In each phase:

- the leader broadcasts once;
- each replica responds once;
- the quorum can be compressed into one QC.

So even when the leader changes, HotStuff does not create a separate quadratic or cubic recovery spike the way PBFT does.

### Further details

For a more detailed walkthrough, including chained HotStuff and additional paper-level details, I keep a longer version here: [Link](https://coded-distributed-arrays.notion.site/Hotstuff-34d0f6a329b48061a2c6df0cf80750ac?source=copy_link)

</details>

<details>
<summary><span class="paper-title">HotStuff-2</span><span class="paper-status">Notes in progress</span></summary>

As discussed in the previous section, HotStuff uses a three-phase voting mechanism.

HotStuff-2 demonstrates that this can be reduced to two phases without adding substantive complexity to the original protocol.

Crucially, this simplification does not come at the cost of optimistic responsiveness or optimistic linear communication, while still maintaining an O(n²) worst-case communication complexity.

**// TODO: Finish this in recent future.**

</details>

## One-Round Voting Consensus

<details>
<summary>sBFT</summary>

sBFT is one of the early PBFT-family protocols that explicitly tries to add a **fast path**.
This means: in the optimistic case, one sequence slot can finish with only **one real voting round**.

It has two modes:

- a fast path that tries to finish in one voting round;
- a slower fallback path that keeps PBFT's backbone, but in a more optimized form.

### Main Changes From PBFT

#### From PBFT To Linear PBFT

The first change is the communication pattern.
PBFT is expensive because its normal path is all-to-all:

- the leader broadcasts a proposal;
- replicas broadcast votes to other replicas;
- replicas broadcast again in the second voting phase.

sBFT starts by dealing with that cost.

Instead of every replica talking to every other replica, replicas send their signature shares to a small set of **collectors**.
Those collectors **aggregate the shares into one threshold proof**, then broadcast the aggregated proof back to the replicas.

So the message shape changes from:

- PBFT: all-to-all voting

to:

- sBFT: replica-to-collector, then collector-to-all

That is the core idea behind what the paper calls **linear PBFT**.

Once this collector structure is in place, the same design direction is reused in two more places.

First, sBFT uses threshold signatures both in the voting path and in the execution path, so client acknowledgement can also be aggregated into one proof.

Second, instead of relying on only one collector, sBFT uses `c + 1` collectors so that the common path is less fragile when a few collectors are slow or faulty.

#### Adding A Fast Path

The second big change is the fast path.

PBFT needs two voting phases before commit.
sBFT asks whether the optimistic case can finish after only one voting round.

This fast path works with:

`n = 3f + 2c + 1`

Here:

- `f` is still the Byzantine threshold for **safety**;
- `c` is extra slack for the optimistic path, so a small number of crashed or straggler replicas do not immediately kill it.

Overall, this means that if the collectors can gather `3f + c + 1` matching signatures, the protocol can finish on the fast path. But keep in mind that the real Byzantine safety bound is still `f`: once there are more than `f` Byzantine replicas, safety is no longer guaranteed.

Its fast path has three communication steps:

- `PRE-PREPARE`
- `SIGN-SHARE`
- `COMMIT-PROOF`

The primary first broadcasts `PRE-PREPARE` with the decision block.

Then replicas do the only real vote of the fast path:
each replica signs the block hash once and sends that signature share to the commit collectors.

When a collector receives enough shares, it combines them into one threshold proof `σ(h)` and broadcasts a `full-commit-proof`.
After receiving that proof, replicas can commit.

#### Why One Voting Round Is Safe Here

With:

- `n = 3f + 2c + 1`
- fast-path threshold `n - c = 3f + c + 1`

a fast commit proof `σ(h)` means at least

`(3f + c + 1) - f = 2f + c + 1`

honest replicas signed that value.

That is the key difference from PBFT.
The fast certificate leaves behind a much larger honest witness set.

Now look at the next view change.
The new primary collects:

`2f + 2c + 1`

view-change messages.

Let `FC` be the `2f + c + 1` honest replicas that signed the old fast-path value, and let `I` be the `2f + 2c + 1` view-change messages collected by the next leader.

Both sets live inside a system of size:

`n = 3f + 2c + 1`

so they cannot avoid overlapping.

More precisely:

`|FC ∩ I| >= |FC| + |I| - n`

`= (2f + c + 1) + (2f + 2c + 1) - (3f + 2c + 1)`

`= f + c + 1`

Since `f + c + 1 > f`, this overlap cannot be entirely Byzantine.
So every valid new-view quorum must still contain honest witnesses for the old fast-path value, and that is why safety survives view change.

### Algorithm

The algorithm is easiest to read as two cases.

Before that, there is one notation detail worth fixing.

- `σ(h)` is the **fast-path threshold proof**. It needs the larger threshold `3f + c + 1`, so if a collector can form `σ(h)`, the protocol can finish on the fast path.
- `τ(h)` is the **slow-path threshold proof**. It needs the smaller threshold `2f + c + 1`, so it is easier to form, but it is not enough to commit immediately. Instead, it is used to start the slower PBFT-style fallback path.

So the distinction is simple:

- `σ(h)` tries to finish in one voting round;
- `τ(h)` is the certificate that lets the protocol safely continue in the slower path.

#### Case 1. Fast path

The fast path communication pattern is:

- leader broadcasts `PRE-PREPARE`;
- replicas send `SIGN-SHARE` messages to the commit collectors;
- a collector aggregates enough shares into `σ(h)` and broadcasts `full-commit-proof`.

This is the optimistic case: one voting round is enough, and collectors turn those shares into one commit proof.
If that proof cannot be formed in time, the protocol does not abandon the collector structure. It keeps the same communication pattern and falls back to a slower PBFT-style path.

#### Case 2. Fallback slow path

If the fast path does not finish, sBFT falls back to Linear-PBFT.

The slow path still starts from the same `PRE-PREPARE`.
Replicas send `SIGN-SHARE` messages as before, but now the collectors use those shares to start the slower PBFT-style path.

Its message flow is:

- a collector that can form `τ(h)` but not `σ(h)` waits for a timeout, then broadcasts `PREPARE`;
- replicas send `COMMIT` shares back to the collectors;
- a collector aggregates those shares into `full-commit-proof-slow` and broadcasts it.

So even the slower path is still trying to remove PBFT's all-to-all communication cost.

The important point is that sBFT is not "fast path or completely different protocol".
It is PBFT's commit logic rebuilt on top of collectors and threshold signatures.

#### Visualization

![alt text](/assets/images/consensus/01/02.png)

### Complexity

Compared with PBFT, the common asymptotic picture is:

| Scenario                     |      PBFT |      sBFT |
| ---------------------------- | --------: | --------: |
| Correct leader               |  `O(n^2)` |    `O(n)` |
| Leader failure / view change |  `O(n^3)` |  `O(n^2)` |
| `f` leader failures          | `O(fn^3)` | `O(fn^2)` |

The main improvement comes from the collector pattern:

- replicas send shares to collectors;
- collectors aggregate them into one threshold proof;
- the rest of the system sees one compact certificate instead of many separate votes.

### Why sBFT Still Was Not The End

sBFT is important because it makes the one-round idea concrete inside a PBFT-family system.

And if you push its parameter all the way to `c = f`, then:

`n = 3f + 2c + 1 = 5f + 1`

That is the more important takeaway.
The point of the fast path is not that it somehow keeps PBFT's full `33%` Byzantine tolerance and then becomes faster for free.
The point is that if we are willing to move from the usual `3f + 1` world, where the system tolerates up to one-third Byzantine faults, into a `5f + 1` world, where the effective one-round regime only tolerates about `20%` Byzantine faults, then one-round fast finality becomes achievable.

However, this protocol is still not widely used in practice, because its view-change mechanism remains large and complicated. Even though the common path becomes linear, the protocol still has to reconcile fast-path evidence and slow-path evidence during leader change, and that makes recovery heavy.

### Further details

For a more detailed walkthrough, I keep a longer version here: [Link](https://coded-distributed-arrays.notion.site/sBFT-34e0f6a329b4805c9687c6d52b470029)

</details>

<details>
<summary>Simplex Protocol Family</summary>

After sBFT, the next branch of protocols keeps the one-round idea but tries to rethink the relationship between the fast path and the fallback path more cleanly.

The protocols in this branch are not all optimizing the same thing.
They differ mainly in how they balance five design choices:

- **fast-path assumption**: what quorum or resilience model is needed for one-round finality;
- **fallback design**: whether the slow path runs after the fast path fails, in parallel with it, or is removed entirely;
- **faulty-leader behavior**: whether a bad leader only costs a timeout or can create extra protocol/message complexity;
- **crash flexibility**: whether the protocol only optimizes Byzantine resilience or also keeps room for crash-heavy failures;
- **data dissemination**: whether the protocol also attacks the leader bandwidth bottleneck with erasure coding or similar techniques.

The most useful protocols to keep in mind here are:

- **Banyan**: focuses on rotating leaders and integrates the fast path directly with the slow path, rather than waiting for the fast path to fail before starting recovery. Its useful idea is that the first slow-path round can run together with the fast-path round. The trade-off is that faulty leaders can still make the message pattern more complicated.
- **Kudzu**: combines an optimistic `2δ` fast path with a simultaneous `3δ` slow path, and also uses erasure coding to reduce the leader bandwidth bottleneck. It works in the more general `n = 3f + 2p + 1` model, where `p` is tunable. If at most `p` replicas fail to cooperate, the fast path can finalise after one voting round; if more than `p` but at most `f` replicas fail, the slow path preserves `3δ` latency.
- **Alpenglow**: is Solana-oriented and combines two components: **Votor** for voting/finality and **Rotor** for erasure-coded block dissemination. Votor finalises in one voting round if roughly `80%` of stake participates, and otherwise uses a two-round path with roughly `60%` participation. Alpenglow also builds in fixed slots, leader windows, fast handoff between leaders, and erasure-coded streaming as part of the protocol design.
- **Hydrangea**: pushes hardest on mixed Byzantine-and-crash resilience. For `n = 3f + 2c + k + 1`, it gets optimistic two-round commit when the number of faulty parties is at most `p = floor((c + k) / 2)`, whether those faults are Byzantine or crash. If the system reaches the heavier adversarial case with up to `f` Byzantine faults and `c` crash faults, it falls back to a three-round path.

I will come back later with separate sections for **Banyan**, **Kudzu**, **Alpenglow**, and **Hydrangea**, since each of them deserves its own comparison.

The next section will move to a newer protocol in this same line of work: **Minimmit**, from Commonware.
That comparison is easier to make there, because Minimmit can be read as a reaction to this branch:

- it keeps one-round finality
- removes the slow path
- uses smaller view-progression certificates instead.

</details>

<details>
<summary>Minimmit</summary>

After sBFT and the protocols in the Simplex family, Minimmit pushes the idea one step further.
It is a newer protocol from **Commonware**, and its main move is simple:

> keep one-round finality, but remove the slow path altogether.

Most earlier 2-round finality protocols still keep a fallback path when the optimistic case fails.
Minimmit does not.
Instead, it separates **finality** from **view progression**.

### The Main Idea

Minimmit works under:

- `n >= 5f + 1`
- at most `f` Byzantine processors
- partial synchrony

This is a more expensive committee assumption than the classic `3f + 1` world.
The point of paying that cost is that Minimmit separates two jobs that many earlier protocols tie together:

- **L-notarisation**: `n - f` votes for a block, which is enough to finalise it
- **M-notarisation**: `2f + 1` votes for a block, which is enough to move to the next view safely

So processors do not need to wait for the full `n - f` votes before starting the next view.
They can move earlier as soon as they see an `M-notarisation`.

Minimmit then adds one more object:

- **nullification**: `2f + 1` `nullify(v)` messages, which prove that no block in view `v` can still safely become final

So every view ends in one of two ways:

- some block gets an `M-notarisation`
- or the view gets a nullification

This is exactly what replaces the slow path.
Instead of saying "the optimistic case failed, so do one more voting round", Minimmit says:

- either a mini quorum proves which branch is safe to continue from
- or a mini quorum proves that the whole view is dead

#### Why Still Safe?

The protocol relies on two safety facts.

**First**, if some block `B` in view `v` gets an `L-notarisation`, then no conflicting block in that same view can get an `M-notarisation`.
The overlap between those two sets is:

`(n - f) + (2f + 1) - n = f + 1`

Since at most `f` processors are Byzantine, that overlap contains at least one correct processor, and a correct processor does not vote for two different blocks in one view.

**That gives the first invariant**:

- **X1**: if a block in view `v` can still become final, then no conflicting block in view `v` can get an `M-notarisation`

**Second**, if some block in view `v` gets an `L-notarisation`, then the same view cannot also be nullified.

The reason is different from `X1`.
An `L-notarisation` means `n - f` processors voted for that block.
Among them, at least

`(n - f) - f = 3f + 1`

must be correct.

Those correct processors have already voted in view `v`, so they will not also help nullify the same view.
That leaves at most

`n - (3f + 1) = 2f`

processors that could still contribute to nullification, which is not enough to reach the `2f + 1` threshold.

**That gives the second invariant**:

- **X2**: if some block in view `v` gets an `L-notarisation`, then view `v` cannot also be nullified

These two facts are enough to answer the next question:

> when views advance early, how does a new leader know what it is still safe to build on?

When the leader of view `v` proposes a block, it chooses as parent the highest-view block it knows with an `M-notarisation`.
If that parent comes from an earlier view `v'`, then the leader must also provide nullifications for every skipped view in `(v', v)`.

Proof:

```Markdown
Assume there is an existing block b', and then a fork:
b' -> b1
b' -> ... -> b2
where b1 in view v1 has an L-notarisation, and b2 in view v2 has an M-notarisation but does not extend b1.

Case 1: v2 = v1
b' -> b1
b' -> b2
This cannot happen because of X1: once b1 has an L-notarisation in view v1, no other block in the same view can receive an M-notarisation.

Case 2: v2 > v1
b' -> b1
b' -> b -> ... -> b2

There are only two possibilities:
1. There is a block b on the lower branch with b.view = v1.
2. The lower branch skips view v1.

If there is a block b with b.view = v1, then we have case 1.
Therefore, it should be the second possibility.
But to skip view v1, processors must have a nullification for view v1.
This is impossible by X2, because b1 already has an L-notarisation in view v1, so view v1 cannot be nullified.
```

In short, the safety story across views is:

- `M-notarisation` proves which earlier block is still safe to extend
- nullifications prove which intervening views are dead and safe to skip

### Algorithm

Before the steps, two local rules matter:

- `SelectParent(S, v)`: pick the highest-view block in local state `S` that already has an `M-notarisation`, and if that block is not from the immediately previous view, include nullifications for the skipped views.
- **no-progress evidence**: a processor has already voted in the current view and then sees `2f + 1` total messages for that same view, where these messages can be either `nullify(v)` messages or votes for a different block.

With that in mind, the full algorithm can be read as follows:

1. If a processor sees a new nullification or `M-notarisation`, it forwards that proof to everyone else.
2. If it is the leader of view `v`, it proposes one child block using `SelectParent(S, v)`.
3. If it sees a valid proposal and has not already voted or nullified in that view, it votes for the block.
4. If its timer expires before voting, it sends `nullify(v)`.
5. If it sees a nullification for the current view, it moves to `v + 1`.
6. If it sees an `M-notarisation` for the current view, it may first vote for that block if needed, and then moves to `v + 1`.
7. If it already voted, but then sees no-progress evidence, it sends `nullify(v)`.
8. If it sees an `L-notarisation`, it finalises that block.

The important point is still the same:
the next view may start before the previous block is finalised.
That is exactly where Minimmit gets its latency win.
The protocol no longer waits for the slower `n - f` quorum just to keep view progression moving.

### Trade-Offs

Earlier 2-round protocols often keep a slow path:

- if the optimistic case fails, do another voting round

Minimmit removes that extra path completely.
Instead, it makes every view end with one of two certificates:

- an `M-notarisation`, which says which block is still safe to build on;
- or a nullification, which says that nothing in this view can still become final.

That is why the protocol can move on without a fallback voting round.

The trade-off is also clear:

- lower view latency
- cleaner protocol structure
- more expensive committee assumption `n >= 5f + 1`
- less flexibility than protocols that still keep a slow path, especially in crash-heavy settings

### Complexity

Compared with sBFT, the asymptotic picture is:

| Scenario                     |      sBFT |  Minimmit |
| ---------------------------- | --------: | --------: |
| Correct leader               |    `O(n)` |  `O(n^2)` |
| Leader failure / view change |  `O(n^2)` |  `O(n^2)` |
| `f` leader failures          | `O(fn^2)` | `O(fn^2)` |

The reason is simple.
sBFT uses collectors and threshold proofs to make the common path linear.
Minimmit removes the slow path to improve latency, but its basic message pattern is still all-to-all.

### Further details

For a more detailed walkthrough, I keep a longer version here: [Link](https://coded-distributed-arrays.notion.site/Minimmit-3560f6a329b4809fa97fe6cdc7f46ae4)

</details>
