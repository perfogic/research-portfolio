---
title: "Future Reading"
---

The next topics I want to read are not random additions. They extend the same questions about latency, structure, and trust assumptions into newer design spaces.

## Directions I Want To Push Further

### DAG BFT

This is the next direction I want to study for understanding what changes when ordering is no longer tied to a single linear leader path. The question I care about here is whether the DAG structure is mainly a throughput and dissemination improvement, or whether it changes the consensus core in a more fundamental way.

### BFT with TEEs

This is the next direction I want to study for understanding what protocol costs can be reduced by stronger trust assumptions. The attractive part is obvious: fewer rounds or simpler coordination may become possible. The real question is what is paid in return, both technically and architecturally, once trusted hardware becomes part of the model.

## Why These Next

Both directions continue the same reading thread:

- `DAG BFT`: what changes when coordination is not forced through one linear leader path?
- `BFT with TEEs`: what changes when stronger setup assumptions are allowed in exchange for simpler or faster consensus?
