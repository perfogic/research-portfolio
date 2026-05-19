---
title: "Future Reading"
---

After going through the more classical consensus directions so far, including leader-based BFT, leaderless BFT, and Ethereum's finality path, I think there are still two big limitations that keep showing up in traditional designs:

- throughput and scalability;
- and the fact that they still rely purely on software trust assumptions.

So the next readings I want to push into are the two modern directions that seem to address those two limits most directly.

## 1. DAG-based BFT

This is the direction I want to study next for the throughput and scalability side.

Traditional leader-based protocols usually run into a leader bottleneck and high communication overhead.
`DAG-based BFT` is quite interesting because it separates data dissemination from ordering and allows parallel proposal flow. This makes much better use of network bandwidth.

This is also the direction that seems to have delivered the biggest practical throughput jump while still staying inside the Byzantine fault tolerant setting.

### Reading plan

I want to start with the core papers:

- `Narwhal and Tusk`
- `Bullshark`

Then continue to later variants and improvements such as:

- `Shoal`
- `Shoal++`
- `Mysticeti`
- `DAG-Rider`
- and other closely related DAG-based consensus papers.

## 2. TEE-Aided BFT

This is the direction I want to study next for the hybrid-trust side.

If DAG-based BFT pushes performance by improving the network and dissemination layer, then `TEE-aided BFT` pushes performance by changing the trust model itself.
With trusted hardware, these protocols can often reduce the replica requirement from `3f + 1` to `2f + 1`, and also reduce the number of communication phases.

That makes this direction especially interesting for high-performance permissioned or semi-permissioned settings.
At the same time, it comes with its own new attack surface, especially rollback and cloning attacks, so the real question is not only whether it is faster, but whether the trust tradeoff is actually worth it.

### Reading plan

The two papers I want to start with are:

- `Pallas and Aegis: Rollback Resilience in TEE-Aided Blockchain Consensus`
- `Achilles: Efficient TEE-Assisted BFT Consensus via Rollback Resilient Recovery`

These are the next papers I want to read to understand how recent TEE-assisted BFT designs handle rollback resilience in a more serious way.
