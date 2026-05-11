---
title: "DAS Solutions"
---

Before talking about specific protocols, it helps to start from the most naive idea.

Suppose we simply split a block into many pieces and distribute those pieces across the network.
At first glance, that sounds enough: each node only stores a small part, so the storage burden is reduced.

The problem appears immediately once even a single part goes missing.
If the data was only split, but not encoded with redundancy, then losing one piece may already make the whole block unrecoverable.
And in a large network, this is not a strange corner case.
It is easy to imagine a small cluster of Byzantine nodes deliberately refusing to store or serve one part of the block.

So plain splitting is not enough.
We need a way to distribute the data such that even if some pieces are missing, the original block can still be recovered.

## Erasure coding

This is why DAS designs start with erasure coding.

At a high level, erasure coding takes:

- `k` original pieces of data,
- and encodes them into `n` coded pieces,

in such a way that any `k` out of those `n` coded pieces are enough to reconstruct the original data.

That is the key improvement over simple splitting.
The network no longer depends on every specific piece staying online.
Instead, it only needs enough coded pieces to remain available.

This changes the data-availability question completely.
We are no longer asking:

- is every original piece still there?

We are asking:

- is there still a large enough set of coded pieces to recover the block?

That is the door that opens the way to sampling.

## 1D sampling: PeerDAS

Once erasure coding is in place, the next idea is straightforward:

- instead of downloading the full block,
- a node can sample a small subset of coded data and use that to gain confidence that the whole block is available.

This is the basic idea behind PeerDAS in its current Ethereum form.

The data is first erasure-coded in one direction.
Then validators or peers are assigned responsibility for certain coded parts, and a sampling node queries only a subset of them.

In practice, current PeerDAS is best understood as a **1D sampling** design.
The sampling unit is effectively a column, not an arbitrary cell in a two-dimensional coded matrix.

<img src="/assets/images/das/03.png" alt="03" width="720" />

The picture above captures the basic idea.
The block is extended horizontally, grouped into columns, and the node doing DAS samples those columns from the network.

This is already much better than full download:

- a node does not need the whole block,
- yet it can still test whether enough coded data is available.

But as an engineering design, this is still only a temporary solution.

### Why 1D PeerDAS is not the end

The main issue is not the sampling idea itself.
The main issue is how the data is disseminated and retrieved.

PeerDAS currently relies on:

- `GossipSub` for dissemination,
- and DHT-style retrieval for finding the data to sample.

Both parts are costly and fragile.

For broadcast, `GossipSub` is still a multi-hop dissemination mechanism.
For retrieval, DHT-based routing is efficient under benign assumptions, but it is much more vulnerable once Byzantine nodes are present.

This is the weakness you should keep in mind:

- if sampling requires multi-hop routing,
- then a Byzantine node on the route can delay, drop, or misdirect the request,
- and the availability check starts depending not only on the data layout, but also on the behavior of the routing substrate.

That is why DHT-based sampling looks good in theory but becomes much more fragile in adversarial settings.

So 1D PeerDAS is an important step, but it is not yet the final shape of a strong DAS design.
The sampling logic exists, but the retrieval and dissemination layers are still doing too much heavy lifting.

## 2D sampling: from columns to cells

This is where the next idea becomes interesting.
Instead of erasure-coding only in one direction, we can erasure-code the data in two dimensions.

In other words:

- first encode rows,
- then encode columns as well.

Now the data is no longer just a long coded strip.
It becomes a coded matrix.

That changes two things at once.

First, the sampling unit can now become a **cell** instead of a whole column.
Second, reconstruction becomes more resilient, because a missing part can be recovered either through its row or through its column.

<img src="/assets/images/das/04.png" alt="04" width="720" />

This is the main reason 2D coding is more attractive.
With 1D coding, recovery pressure lives in one direction only.
With 2D coding, the system has two independent repair paths:

- recover through the row,
- or recover through the column.

That gives better resilience against selective loss.
If some cells are missing, the network is no longer forced to rely on one single recovery direction.

### Why 2D helps more than 1D

The advantage of 2D is not only that it feels more redundant.
It changes the recovery structure in a concrete way.

With 2D coding:

- a row that is partially missing can be repaired from the remaining cells in that row;
- a column that is partially missing can be repaired from the remaining cells in that column;
- and if one direction becomes weak, the other direction may still be enough to repair the data.

That is why 2D designs are usually discussed as stronger candidates for distributed reconstruction.
They are not just doing DAS.
They are also making repair and recovery much more structured.

At the same time, this area is still relatively underexplored.
There is much less mature research and implementation work here than in the simpler 1D story.

So the real picture is:

- 1D PeerDAS is the practical stepping stone;
- 2D sampling is the more structurally promising direction;
- but once you move to 2D, the design and networking questions become harder, not easier.

## Where the later solutions fit

This is also the right place to position the later designs.

- `PeerDAS` gives Ethereum a practical path away from full download, but still inherits expensive multi-hop retrieval and broadcast.
- `PANDAS` tries to reduce that inefficiency by moving toward more direct and deterministic dissemination.
- `RDA` pushes further toward a design that is secure even in strongly adversarial settings, though it pays for that with substantial storage and communication duplication.

So the DAS design space is not only about sampling.
It is really about the whole package:

- how data is encoded,
- how data is assigned,
- how sampling requests are routed,
- and how missing data can be recovered.
