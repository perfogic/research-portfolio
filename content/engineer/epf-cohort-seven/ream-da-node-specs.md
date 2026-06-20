# Ream DA-node Specification

This work still is in-progress, it may change in the future.

## Description of the work in EPF

This project builds a standalone ream da-node binary fully dedicated to the data layer:

- A data layer client that custodies and serves the full 128 columns in the first version. This is basically a supernode/full-custody mode, but can be serves as documented in `consensus-specs`.
- No fork choice, no execution, no validator. Just the data layer, decoupled from any one consensus runtime and runnable alongside a minimal consensus node.
- Can plug into a minimal beacon client through a generic interface, and later maybe also plug into a post-quantum consensus client in Rust.

## What I think

Currently, I don't know whether some DA-related code in the main `ream` codebase should be removed later, because `ream` already implemented some parts of the DA functions.

But to plug into a minimal beacon client, we need to abstract a DA layer that satisfies the DAS-related parts of the Fulu specs:

- `das-core.md`
- `p2p-interface.md`
- `polynomial-commitments-sampling.md`
- the relevant sidecar construction helpers from `validator.md`
- the availability interface needed by `fork-choice.md`

The DA-node should not own fork choice or execution. If it needs beacon context for validation, it should receive that context from the consensus client.

Besides that, to be able to plug into a post-quantum consensus client later, the DAS scheme should be abstractable because:

- In a post-quantum design, we may use FRI or ZODA instead of KZG. With FRI, we may also use a different hash scheme such as Poseidon for the ZK roadmap, so the commitment or proof, hash types will be different.
- In Beacon/Fulu, we adopt KZG commitments over BLS12-381, and SHA-256-based `hash_tree_root`. For this one, i think the work is pretty light.

## How architecture looks like to me

### High Level

![image](https://hackmd.io/_uploads/r1gLvEEfGg.png)

#### Consensus Bridge

A layer that abstract the communication
interfaces. For example:
+) on_block: which notify that new block is created
=> Knowing which block that it should accept
blobs' columns
+) check_data_available: client call before moving to new
stage in a slot to know whether sampling failed or not
and more...

**Block Context Service:**
Receives block context from the consensus client, such as block root, slot, signed header, blob commitments, and inclusion proof. It tracks which blocks the DA-node should expect columns for.

#### DA Node

**BlockContextService**: Receives block context from the consensus client, such as block root, slot, signed header, blob commitments, and inclusion proof. It tracks which blocks the DA-node should expect columns for.

**NetworkService**: responsible for`data_column_sidecar` gossip, handles DAS req/resp, discovers peers through discv5 (really important in sampling process), and advertises custody metadata such as `cgc`.

**ValidationService**: validates incoming `DataColumnSidecar`s.

**AvailabilityService**: decides whether a block's data is available. It checks locally stored columns, fetches missing columns when needed, triggers sampling/reconstruction, and reports `available`, `pending`, or `unavailable`.

**ColumnCustodyService**: manages which columns the node custodies and stores.

#### DAS Scheme

This one is a layer that will public generic interface, and supports both:

- KZG
- FRI
- ZODA
  For evaluation and implementation.

### Usecase

The normal flow is that the consensus client receives the beacon block, while the DA-node receives the data columns directly from the data-column gossip network.

```text
Beacon gossip network
        |
        v
Consensus Client
        |
        | block_root, slot, signed header,
        | blob commitments, inclusion proof
        v
ConsensusBridge
        |
        v
DA-node
```

At the same time, the DA-node listens to data column sidecar topics by itself:

```
data_column_sidecar_{0..127}
        |
        v
DA-node
```

If it receives before `beacon block`, just mark these columns `pending` for consuming in the future.

The full logic flow will lie on the DA-node.

## TODO: specification about the type in each services

This one I will finish in week 2 update.
