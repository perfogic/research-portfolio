# Paper Summary: Subquadratic Multivalued Asynchronous Byzantine Agreement WHP

## Metadata

- **Title**: Subquadratic Multivalued Asynchronous Byzantine Agreement WHP
- **Authors**: Shir Cohen, Idit Keidar
- **Venue/Year**: DISC 2023 brief announcement / arXiv 2023
- **Paper ID**: arXiv `2308.02927`
- **Link**: https://arxiv.org/abs/2308.02927

## Problem Statement

The paper extends subquadratic asynchronous Byzantine agreement from binary values to multivalued agreement, which is the form needed by real systems agreeing on blocks or batches.

## System Model

- Permissioned asynchronous setting.
- Adaptive Byzantine adversary with anti-front-running assumption.
- Trusted PKI and VRFs.
- Resilience `f = (1/3 - ε)n`.

## Construction Overview

The paper composes newly developed subquadratic binary ABA techniques into a multivalued asynchronous BA reduction.

## Key Results

1. Closes the gap between binary and multivalued subquadratic asynchronous BA.
2. Preserves subquadratic communication in the asynchronous Byzantine setting.

## Relevance

- **Solution technique**: bridges theory to realistic block-sized proposals.
- **Literature/context**: important follow-on to `Not a COINcidence`.
