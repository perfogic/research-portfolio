# Paper Summary: Asynchronous Byzantine Agreement with Optimal Resilience and Linear Complexity

## Metadata

- **Title**: Asynchronous Byzantine Agreement with Optimal Resilience and Linear Complexity
- **Authors**: Cheng Wang
- **Venue/Year**: `(preprint)` arXiv 2015
- **Paper ID**: arXiv `1507.06165`
- **Link**: https://arxiv.org/abs/1507.06165

## Problem Statement

This paper improves the running time of almost-surely terminating asynchronous Byzantine agreement under the optimal resilience threshold `n > 3t`.

## System Model

- `n` asynchronous processes with private channels.
- Up to `t` Byzantine faults.
- Optimal resilience target `n > 3t`.
- Randomization through common-coin style reductions.

## Construction Overview

The protocol improves the efficiency of the common-coin route for asynchronous Byzantine agreement. Its headline contribution is a faster almost-surely terminating ABA protocol than the PODC 2008 Abraham-Dolev-Halpern construction.

## Key Results

1. For `n > 3t + 1`, the protocol reaches agreement in `O(t)` expected running time.
2. For `n = (3 + ε)t`, the protocol reaches agreement in `O(1/ε)` expected running time.
3. This improves over `O(n^2)` expected running time for Abraham-Dolev-Halpern and over Feldman-Micali's stronger resilience requirement for constant expected time.

## Complexity Claims

- **Resilience**: optimal (`n > 3t`)
- **Expected time**: `O(t)` generally, `O(1/ε)` when `n = (3 + ε)t`

## Relevance

- **Solution technique**: marks the best pure-ABA running-time improvement after ADH 2008.
- **Literature/context**: useful to separate improvements in expected time from improvements in communication complexity.
