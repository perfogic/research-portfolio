---
title: "Network Layer for DAS"
---

In the previous section, we went through the main DAS solutions.
But both **1D and 2D sampling** only answered one part of the problem:

- how the data should be encoded.

It did not yet answer the next question:

- once the data has been encoded, how should it actually be stored, disseminated, and retrieved across the network?

That is the purpose of this section.
Here I want to focus on the network-layer directions that try to answer that question.

## PeerDAS

In the current `Fulu` version, **1D PeerDAS** is already the direction being applied to Ethereum.

Its basic structure is column-based data assignment:

- the encoded data is grouped into columns,
- and each node is assigned to store some of those columns.

The exact assignment rules are more detailed than I want to go into here, but they can be checked directly in the `consensus-specs`.

Sampling is then done through **DHT retrieval**.
A node that wants to sample does not download the whole block. Instead, it tries to find the peer responsible for the column it wants and retrieves that sampled data from the network.

<img src="/assets/images/das/03.png" alt="PeerDAS 1D sampling" width="720" />

This is already a meaningful step away from full download, but the bottleneck now moves to the network layer.

- `DHT` retrieval is multi-hop,
- `GossipSub` dissemination is also multi-hop.

That is where the weakness appears.
`DHT` works well under more benign assumptions, but once Byzantine nodes are present it becomes much more vulnerable.
An adversary can try to attack the hash-space neighborhood itself, for example through eclipse-style behavior, and make the needed sampling data hard to retrieve.

At that point, the problem is no longer just "some sample is missing".
The network may fail to retrieve the sampled piece at all, which means the availability check itself becomes unstable.
In practice, that means no new block can be safely accepted.

For more background on `DHT` and `GossipSub` in Ethereum's consensus network, I already wrote about that in an older blog post:

- [Ethereum consensus layer: from peer discovery with discv5 to message propagation with GossipSub](https://perfogic.medium.com/ethereum-consensus-layer-from-peer-discovery-with-discv5-to-message-propagation-with-gossipsub-3536e8952e5c)

## SubnetDAS

Besides 1D PeerDAS, there have also been discussions around **SubnetDAS** on Ethereum Research.

The idea there is still in the 1D-sampling family, but the sampling path is moved more directly onto `GossipSub` itself through subnets, instead of treating retrieval as a separate DHT-heavy problem.

However, the main issue with `SubnetDAS` is not sampling itself, but reconstruction. Its convergence property depends on many subnets remaining reliable under adversarial conditions, and a disruption in even one critical subnet may be enough to stall full reconstruction.

<img src="/assets/images/das/13.png" alt="FullDAS 2D sampling" width="720" />

## FullDAS

Another direction is **FullDAS**, which moves into the `2D` sampling setting.
Here the sampling unit is no longer a full column, but an individual cell inside a two-dimensional coded matrix.

<img src="/assets/images/das/12.png" alt="FullDAS 2D sampling" width="720" />

Compared with 1D PeerDAS, this gives a much cleaner recovery structure.
But it also makes the network-layer problem harder, because now the system must support sampling and retrieval at finer granularity.

This line of work is also still far from the final answer for Ethereum's long-term roadmap.
For example, work such as `FullDAS` is still framed around settings like `32 MB`, while the longer-term target people talk about is closer to `128 MB` blob data per block.

So the current picture is still unfinished.
There are already proposals to optimize sampling by improving parts of the `DHT` path or by moving more logic into `GossipSub`, but these designs are still not fully settled for Ethereum's current implementation path.

## PANDAS

`PANDAS` is another direction for making DAS practical within Ethereum's consensus time bounds. Before going to a bit detail, block time in Ethereum is `12s`, with `4s` for block probagation:

<img src="/assets/images/das/14.png" alt="slot phases" width="720" />

The main idea is to push the first dissemination step onto the **block builder**.
Instead of relying mainly on multi-hop propagation from the start, the builder directly seeds the coded data to the nodes that are supposed to custody it.
After that, nodes do two things in parallel:

- **Consolidation**: fetch the missing cells they are supposed to store;
- **Sampling**: fetch the random cells they want to sample for DAS.

So the flow is roughly:

1. the builder constructs the block and the encoded blob data;
2. the builder directly sends seed cells to responsible nodes;
3. nodes consolidate the rest of their assigned data from peers;
4. nodes also perform DAS sampling in parallel;
5. if this finishes within roughly `4s`, validators can safely attest to the block.

![alt text](/assets/images/das/15.png)

This is the main appeal of `PANDAS`. It is designed around Ethereum's actual production constraint: DAS is not useful if dissemination and sampling cannot finish within the attestation deadline.

Its main advantage is therefore practical performance.
The paper evaluates `PANDAS` specifically against the `4s` window even with `128MB` block and shows that direct exchanges scale much better than relying only on `GossipSub` or `DHT`-style multi-hop retrieval.

But the tradeoff is also clear.
`PANDAS` pushes a lot of responsibility onto the builder:

- the builder becomes the first major distributor of blob data;
- the builder needs a timely and broad view of the nodes it should send data to;
- and the builder must have enough network capacity to seed that data quickly.

So while `PANDAS` improves performance, it also makes the system more builder-centric and centralized.
In practice, the builder is required as a SUPERnode: it needs to know who should receive what, and it needs enough bandwidth and coordination to deliver those packets in time.
Imagining if block builder can not make it in time, then no blocks can be created at all.

## Robust Distributed Arrays

`RDA` is a cleaner and more formal network-layer direction for DAS.
Compared with earlier proposals, the idea is simpler, and the security analysis is much tighter.

The basic idea is to organize the network itself as a matrix, usually called a **node matrix**, with dimensions `k1 × k2`.
Each node is randomly assigned to one row and one column of this matrix.

In the paper, there are two types of nodes:

- **Validator nodes**
- **Bootstrap nodes**

Bootstrap nodes mainly help with network membership, such as join and leave events.
They participate in all rows, so they effectively know the whole network.
Regular validator nodes are lighter: each one only needs to know the nodes in its own row and its own column.

The storage rule is also simple.
Nodes in the same node-matrix column store the same portion of the data.
So if the block is divided into `512` columns, and the node matrix has `k2` columns, then each node is responsible for roughly `512 / k2` data columns.

This gives `RDA` a very clean retrieval path.
If a node wants to sample some data, it only needs to determine the destination column for that data and query nodes in that column.
So retrieval is essentially **one-hop**, which is much faster and much less fragile than DHT-style multi-hop routing.

This is the main appeal of `RDA`.
The sampling path is simple, the retrieval path is simple, and the security model is stated much more explicitly.

Another important point is the trust assumption.
`RDA` does not rely on an honest majority.
Instead, its robustness depends on having a sufficiently large **absolute number of honest nodes** online for sufficiently long periods of time.

The paper also gives a concrete example of this tradeoff.

> It shows that with `5000` honest network participants, where each node stores only `1%` of the data and is connected to `10%` of the other peers, the system can still provably ensure that `90%` of the data remain available at all points in time.

The cost is replication.
To get this robustness and one-hop retrieval, `RDA` duplicates data much more aggressively.
All nodes in the same column store the same assigned data, so storage and communication overhead are significantly higher.

So compared with PeerDAS-style designs, `RDA` spends more on replication in exchange for a simpler retrieval path and a much stronger formal guarantee.

For visualization, you can check this slide:
<embed src="/assets/files/rda_slide.pdf" width="100%" height="600px" type="application/pdf">
