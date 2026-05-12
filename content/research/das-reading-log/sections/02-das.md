---
title: "Data Availability Sampling"
---

Before talking about specific protocols, it helps to start from the most naive idea.

Suppose we simply split a block into many pieces and distribute those pieces across the network.
At first glance, that sounds enough: each node only stores a small part, so the storage burden is reduced.
![alt text](/assets/images/das/05.png)

However, **The problem appears immediately once even a single part goes missing**.
It is easy to imagine a small cluster of Byzantine nodes deliberately refusing to store or serve one part of the block.
At this case, we can't reconstruct back to our original block from parts.
So plain splitting is not enough.
![alt text](/assets/images/das/06.png)

We need a way to distribute the data such that even if some pieces are missing, the original block can still be recovered.

## Erasure coding

This is why DAS designs start with erasure coding.

At a high level, erasure coding takes:

- `k` original parts of data,
- and encodes them into `n` coded parts,

in such a way that any `k` out of those `n` coded parts are enough to reconstruct the original data.

I don't talk in detail about how it is implemented. But you can imagine, the way it do is:

> Creating a function from n points, with k/n points only we can find the old functions.\
> From that we can find the origin k points by index.

That is the key improvement over simple splitting.
The network no longer depends on every specific part staying online.\
By improving the redundancy of each coded parts, it only needs enough coded parts to remain available.

This changes the data-availability question completely.
We are no longer asking:

- is every original part still there?

We are asking:

- is there still a large enough set of coded parts to recover the block?

That is the door that opens the way to sampling.

![alt text](/assets/images/das/07.png)

## 1D sampling

Once erasure coding is in place, the next idea becomes possible: a validator no longer needs to download the full encoded block just to test availability.

Instead, it can sample a small subset of coded data and use that to gain confidence that the whole block is still recoverable.

The first concrete form of this idea is **1D sampling**.

In the 1D setting, the data is erasure-coded in only one direction, usually pictured as a horizontal extension of the original block into a longer coded strip.

Suppose the original data is encoded from `k` parts into `2k` coded parts. Since the block can still be reconstructed from any `k` available coded parts, an adversary must withhold more than half of the coded data to make the block unrecoverable.

![alt text](/assets/images/das/08.png)

If a validator makes `n` independent random sampling requests by columns, then the probability that all of them still miss the unavailable region is at most:

`(1/2)^n`

So the probability of detecting data withholding is at least:

`1 - (1/2)^n`

For example, with `n = 20`, the probability of detection is already:

`1 - (1/2)^20 ≈ 0.999999`

This is already much better than full download:

- a node does not need the whole block,
- yet it can still test whether enough coded data is available.

But as an engineering design, this is still only a temporary solution.

### Why 1D is not the end

The first limitation of 1D coding is its recovery structure.

With 1D erasure coding, recovery is still global rather than local.
Even if only a few cells go missing, the system does not recover those cells locally.
Instead, it has to fall back to reconstructing the whole encoded block.

That is expensive, both in bandwidth and in computation.
So 1D sampling is a useful first step for DAS, but it is not yet a good long-term structure for distributed recovery.

<img src="/assets/images/das/09.png" alt="03" width="720" />

## 2D sampling: from columns to cells

The main reason to move from 1D to 2D is **recovery**.
With 1D erasure coding, reconstruction is global: if some data is missing, recovery tends to require reconstructing the whole encoded block.
With 2D erasure coding, recovery becomes much more local and structured.

Instead of encoding the data in only one direction, we encode it in two:

- first across rows,
- then across columns.

So the encoded block becomes a matrix rather than a single long strip.

<img src="/assets/images/das/10.png" alt="04" width="720" />

This changes the recovery structure in an important way.

A missing cell can now be recovered from:

- recover through the row,
- or recover through the column.

<img src="/assets/images/das/11.png" alt="04" width="720" />

So if one recovery direction becomes weak, the other may still be enough.
That is the real advantage of 2D coding: it gives the system two repair paths instead of one.

So compared with 1D sampling, 2D sampling gives a much more **local recovery structure**.
The system no longer has to treat every small loss as a whole-block reconstruction problem.

<img src="/assets/images/das/04.png" alt="04" width="720" />

However, 2D coding does not make the whole problem easy.
It mainly fixes the recovery structure.
The next bottleneck moves to the network layer.

Once sampling happens at the level of individual cells, the system now needs to answer harder questions:

- which nodes store which coded data?
- how does a node find the peer that holds the cell it wants to sample?
- how do we make sure every cell is still recoverable in adversarial settings?

This is where the design becomes much harder.
A validator that wants to sample one cell must somehow find and contact the right peer among a large set of nodes.
And if the publisher withholds data, agreement now depends on a stronger condition: each missing cell must still be recoverable through at least one honest direction, either from its row or from its column.

This is the point where protocol design turns into network design.
The harder question now is how to store, route, sample, and reconstruct those coded cells across a real adversarial network.

Ethereum's concrete proposals for that next step, such as PeerDAS, belong more naturally to the network-layer story.
