---
title: "Why this problem matters"
---

Data availability becomes a research question as soon as execution and data stop being treated as one object. Once block data is separated, the problem is no longer only whether validators agree on a header. It also becomes whether the underlying data can be sampled, reconstructed, and retrieved under practical network constraints.

For me, this mattered because it connects protocol design to systems reality very quickly. A finality claim can look elegant on paper while silently assuming that data dissemination and retrieval are cheap, symmetric, or replication-heavy.
