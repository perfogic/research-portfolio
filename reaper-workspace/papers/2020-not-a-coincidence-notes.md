# Paper Summary: Not a COINcidence: Sub-Quadratic Asynchronous Byzantine Agreement WHP

## Metadata

- **Title**: Not a COINcidence: Sub-Quadratic Asynchronous Byzantine Agreement WHP
- **Authors**: Shir Cohen, Idit Keidar, Alexander Spiegelman
- **Venue/Year**: International Symposium on Distributed Computing (DISC) 2020
- **Paper ID**: arXiv `2002.06545`
- **Link**: https://arxiv.org/abs/2002.06545

## Problem Statement

This paper breaks the quadratic communication barrier for asynchronous Byzantine agreement.

## System Model

- Permissioned asynchronous setting.
- Delayed-adaptive adversary.
- Trusted PKI and VRFs.
- Resilience roughly `n ≈ 4.5f` asymptotically, not optimal `n > 3f`.

## Construction Overview

The core ideas are VRF-based committee sampling and a shared-coin algorithm adapted to the asynchronous setting, so only small committees send most messages.

## Key Results

1. First asynchronous Byzantine agreement protocol with subquadratic communication.
2. Achieves `\u007eO(n)` word complexity and `O(1)` expected time with high probability.
3. Does so by weakening the adversary model relative to classic full-information, information-theoretic settings.

## Complexity Claims

- **Expected time**: `O(1)`
- **Word complexity**: `\u007eO(n)`
- **Termination mode**: with high probability

## Relevance

- **Solution technique**: major theoretical shift from all-to-all communication to committee sampling.
- **Tradeoff**: gains communication efficiency by assuming PKI, VRFs, and a delayed-adaptive adversary.
