# Paper Summary: Validated Asynchronous Byzantine Agreement with Optimal Resilience and Asymptotically Optimal Time and Word Communication

## Metadata

- **Title**: Validated Asynchronous Byzantine Agreement with Optimal Resilience and Asymptotically Optimal Time and Word Communication
- **Authors**: Ittai Abraham, Dahlia Malkhi, Alexander Spiegelman
- **Venue/Year**: `(preprint)` arXiv 2018
- **Paper ID**: arXiv `1811.01332`
- **Link**: https://arxiv.org/abs/1811.01332

## Problem Statement

The paper targets validated asynchronous Byzantine agreement, the multivalued building block used for asynchronous atomic broadcast and state-machine replication.

## System Model

- Fully asynchronous communication.
- Up to `f < n/3` Byzantine faults.
- External validity predicate for candidate values.
- Authentication and signatures available.

## Construction Overview

The protocol improves the classic CKPS-style validated ABA line by reducing expected word communication from cubic to quadratic while preserving constant expected time and optimal resilience.

## Key Results

1. First VABA protocol with optimal resilience, asymptotically optimal expected `O(1)` time, and expected `O(n^2)` word communication.
2. Improves Cachin-Kursawe-Petzold-Shoup 2001 from expected `O(n^3)` words to expected `O(n^2)` words.

## Complexity Claims

- **Resilience**: optimal (`f < n/3`)
- **Expected time**: `O(1)`
- **Expected word communication**: `O(n^2)`

## Relevance

- **Solution technique**: central milestone for moving from binary ABA to practical multivalued consensus.
- **Blockchain context**: directly informs later Dumbo-style reductions and asynchronous atomic broadcast protocols.
