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

### Why This Is Different From PBFT View Change

PBFT assumes that a new leader can explicitly collect status information from the others, then redistribute enough proof so that everyone can verify the next proposal is safe. That works, but it also makes proposer change heavy.

In a blockchain-style setting, requiring one validator to directly know and communicate with every other validator already creates heavier communication and heavier workload. A PBFT-style design is still possible, but it scales poorly as the validator set grows.

Instead of using a separate proof-heavy view-change protocol as pBFT, Tendermint changes the design at exactly that point:

- it removes the dedicated `VIEW-CHANGE / NEW-VIEW` subprotocol;
- it keeps one repeated round structure;
- it lets safety move across rounds through four local variables:
  `lockedValue`, `lockedRound`, `validValue`, and `validRound`;
- when a new proposer proposes a block, the important pair is `validValue` and `validRound`, which act as the proposer’s memory of the latest safe candidate.

For example, if a proposer wants to propose block `B+1`, it have to piggyback a value that was already supported earlier, together with the round where that support happened.
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

For a more detailed PBFT walkthrough, including additional paper-level details, I keep a longer version here: [Link](https://coded-distributed-arrays.notion.site/Tendermint-34e0f6a329b4801db987d603ca242b0f?source=copy_link)

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
