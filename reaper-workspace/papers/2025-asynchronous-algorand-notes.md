# Paper Summary: Asynchronous Algorand: Reaching Agreement with Near Linear Communication and Constant Expected Time

## Metadata

- **Title**: Asynchronous Algorand: Reaching Agreement with Near Linear Communication and Constant Expected Time
- **Authors**: Ittai Abraham, Eli Chouatt, Ivan Damgård, Yossi Gilad, Gilad Stern, Sophia Yakoubov
- **Venue/Year**: `(preprint)` IACR ePrint 2025/303
- **Paper ID**: ePrint `2025/303`
- **Link**: https://eprint.iacr.org/2025/303

## Problem Statement

The paper asks whether the scalability profile of Algorand can be transferred from synchrony / eventual synchrony to the fully asynchronous setting.

## System Model

- Fully asynchronous communication.
- Weakly adaptive adversary with secure erasures.
- VRF setup and cryptographic primitives.
- Near-optimal resilience, stated as fewer than roughly `(1/3 - ε)n` corruptions in the introduction.

## Construction Overview

The main technical step is asynchronous committee-based role assignment for verifiable secret sharing in the YOSO model, enabling near-linear communication without abandoning full asynchrony.

## Key Results

1. Validated asynchronous Byzantine agreement with expected constant rounds.
2. Honest parties send expected `O(n polylog n)` bits.
3. Achieves a near-Algorand-style scalability profile in the asynchronous model, under stronger cryptographic assumptions than classical information-theoretic protocols.

## Relevance

- **Solution technique**: current frontier for combining constant expected time with near-linear communication in full asynchrony.
- **Tradeoff**: relies on VRFs, secure erasures, and weak adaptivity rather than the classic strongest adversary model.
