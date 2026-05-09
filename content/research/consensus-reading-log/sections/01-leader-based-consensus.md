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

For a more detailed PBFT walkthrough, including additional paper-level details, I keep a longer version here:

- [My detailed PBFT reading](https://coded-distributed-arrays.notion.site/PBFT-32f0f6a329b4803b97faeab7e3eea45b)
</details>

<!-- OTHER PART -->
<details>
<summary>Tendermint</summary>

Tendermint interested me because it keeps a PBFT-like voting shape while changing the setting quite a lot. Instead of assuming a tightly connected replica set, it works in a blockchain validator environment with gossip, repeated rounds, and timeout-driven progress.

What stood out to me was the way safety is carried across rounds. Tendermint does not use a PBFT-style new-view proof. Instead, it relies on local locks, `validValue`, `validRound`, and the gradual spread of vote evidence through gossip. That made me see it as more than “PBFT with renamed phases.” The deeper change is in how round advancement and safety evidence are handled.

This paper helped me separate two questions that I had previously blurred together: how to vote safely in one round of progress, and how to preserve that safety information when the network is only partially synchronized and communication is indirect.

**Open questions**

- How far can local-gossip safety evidence scale?
- Which Ethereum-facing designs inherit this logic and which reject it?

**Artifacts**

- Notes: [Tendermint vs PBFT, SBFT, HotStuff](reaper-workspace/notes/tendermint-vs-pbft-sbft-hotstuff.md)

![Tendermint propose, prevote, precommit](content/diagrams/tendermint-flow.svg)

</details>

<details>
<summary>HotStuff</summary>

HotStuff became important in this reading path because it reframed the PBFT question more cleanly: maybe the core issue is not the number of phases alone, but the structure of the safety handoff between leaders. In human terms, my understanding is that HotStuff keeps the same resilience target as PBFT, but reorganizes the protocol around quorum certificates so that a new leader can safely continue from the highest known QC.

The extra phase is what made the paper click for me. At first it looked like “PBFT plus one more phase,” which did not seem like an obvious simplification. But the point is that this extra step buys a much cleaner proof structure for leader replacement. Instead of carrying bulky view-change evidence, the next leader can extend the highest QC and continue in a way that stays simple and linear.

That made HotStuff feel less like a small optimization and more like a structural answer to the view-change problem exposed by PBFT and approached differently by Tendermint.

**Open questions**

- Which parts of HotStuff’s gain remain meaningful under Ethereum-like deployment assumptions?
- When does QC compression hide assumptions that should be compared explicitly?

**Artifacts**

- Notes: [HotStuff vs PBFT](reaper-workspace/report-hotstuff-vs-pbft.md)

![HotStuff three-chain commit](content/diagrams/hotstuff-3chain.svg)

</details>
