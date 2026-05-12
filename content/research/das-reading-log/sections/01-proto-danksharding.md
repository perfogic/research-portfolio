---
title: "Proto-Danksharding: From CALLDATA to Blob Transaction"
---

## Before `Proto-Danksharding`

Before `Proto-Danksharding`, rollups such as Optimism, Arbitrum, zkSync, and other L2s were already using Ethereum as their settlement layer.
They executed transactions offchain, but they still needed to publish enough data back to Ethereum so that the L2 could be checked from outside.

For optimistic rollups, this published data is what makes fraud proofs possible.
For zk rollups, this published data is what lets outsiders reconstruct the underlying state transition data instead of trusting the operator blindly.

More generally, the reason rollups publish data to Ethereum is simple: without that data, nobody outside the operator can independently reconstruct the state transition and check whether the L2 is behaving correctly.

At that time, the practical answer was simple: this data was posted through `calldata`.

So the pattern looked like this:

- the L2 executes transactions offchain;
- the operator,called **batch poster**, periodically sends batch data and commitments to Ethereum;
- that L1 data is what later lets outsiders challenge an invalid optimistic transition or verify a validity-based claim.

### What is `CALLDATA` ?

If you have not seen `CALLDATA` before, the easiest way to think about it is:

- it is the input bytes attached to a smart-contract call,
- in Solidity, it is where function arguments live when an external call comes in.

For example:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Inbox {
    event DataPosted(bytes data);

    function postBatch(bytes calldata batchData) external {
        emit DataPosted(batchData);
    }
}
```

Here `batchData` argument is in `CALLDATA`.
At the EVM level, the transaction is calling `postBatch(...)` and those bytes are part of the call input.

<img src="/assets/images/das/00.png" alt="00" width="640" />

### The problem with `CALLDATA`

The problem is that `CALLDATA` is a bad place for this kind of data.
When rollup data is posted through `CALLDATA`:

- it is attached to normal transactions,
- it goes through Ethereum's ordinary block pipeline,
- and it stays in Ethereum history permanently.

That is a bad fit for rollup batch data. This data is mainly there so that others can verify the L2 state transition, generate a fraud proof, or check the validity of a proof. It does not need to be treated like permanent application state on Ethereum itself.

So the mismatch was not only about **permanence**. It was also about **scale**.

Rollup batch data carried through `CALLDATA` has to compete with ordinary execution inside the same block gas budget.
That means if Ethereum wants to carry more rollup data through `calldata`, it does not get a separate data lane for that growth.
It is effectively pushing more pressure into the normal block path.

So the problem with `CALLDATA` was really two problems at once:

- the data was being stored on the wrong path for too long;
- and the only obvious way to scale that path further was to make the ordinary block carry more and more data.

That is the bottleneck `Proto-Danksharding` was trying to break.

## `Proto-Danksharding` and blob transactions

`Proto-Danksharding` (`EIP-4844`) is Ethereum's first real answer to that mismatch.

After `EIP-4844`, rollups get a new data lane:

- instead of publishing their batch data through permanent `calldata`,
- they can publish it through blobs.

The important difference is that blobs are temporary.
They are kept for a bounded window, not forever.
In `EIP-4844`, the minimum retention window for blob sidecars is `4096` epochs, which is roughly 18 days.

<img src="/assets/images/das/01.png" alt="01" width="640" />

After `Proto-Danksharding`, Ethereum no longer treats rollup data and ordinary execution data as the same thing.

Before going into that a bit more, it helps to clarify two terms.

In Ethereum, the **beacon block** is the block produced on the consensus layer.
Inside it, there is an **execution payload**, which is the block passed to the execution layer to process transactions and transform state.
This is block that we see on Etherscan :D, which is the part that contains normal transactions, so this is where `CALLDATA` belongs.

Blobs are different.
They are stored outside this beacon block as temporary data.
Inside the beacon block, there is a field called `blob_kzg_commitments`, which is used to check that a given blob really belongs to that block.

<img src="/assets/images/das/02.png" alt="02" width="640" />

`Proto-Danksharding` does solve the first bottleneck:

- rollup data no longer has to live forever on the ordinary execution path.

But the design is still not scalable enough.
In practice, blobs give Ethereum a target of about `0.375 MB` of blob data per block and a hard limit of about `0.75 MB`.

That already improves on the old `CALLDATA` path, but it still does not solve the main scaling problem.
Every consensus node is **still expected to download all blob data**, so this is still a bottleneck.

But Ethereum wants much more blob capacity than this.
What happens if the roadmap moves toward something like `128 MB` of blob data?

So the next question becomes:

> how can Ethereum keep the same availability guarantee without forcing every node to download everything?

In the next section, we will look at that problem directly.
