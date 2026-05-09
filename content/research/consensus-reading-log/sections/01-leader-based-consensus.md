---
title: "Leader-Based Consensus"
---

## Two-Round Voting Consensus

<details>
<summary>PBFT</summary>

PBFT was my starting point because it gave me the clearest classical picture of leader-based BFT under the `3f + 1` model. In human terms, I understand it as a protocol where a leader proposes a value, replicas vote in two stages to converge on it, and a separate view-change mechanism is used when the leader fails.

What mattered most to me was not only the three-step normal path, but the structure of view change. PBFT made it clear that the real difficulty is the safety handoff: when leadership changes, the new leader has to prove which value is still safe to continue. That made PBFT useful as a baseline, because later protocols can be read partly as attempts to reduce or reorganize this handoff cost.

This changed the way I looked at the protocol. I initially treated PBFT as simply an older design with worse complexity, but it became more useful to me as a baseline for understanding what later systems are actually trying to simplify.

**Open questions**

- Which parts of PBFT’s cost are structural?
- Which later improvements only move the cost into a different certificate form?

**Artifacts**

- Notes: [PBFT complexity report](reaper-workspace/report-pbft-complexity.md)

![PBFT pre-prepare, prepare, commit](content/diagrams/pbft-flow.svg)

</details>

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
