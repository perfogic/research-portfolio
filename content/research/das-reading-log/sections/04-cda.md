---
title: "Coded Distributed Array"
---

This section is only a draft of the idea.
I only want to explain how the direction of `CDA` started to form.

The starting point for me was that `RDA` is already very clean from the security side, but it still pays a very large data-duplication cost.

If the network has `5000` nodes and the node matrix has `100` columns, then the data-duplication factor is already:

`5000 / 100 = 50`

That is a lot of replication.

At the same time, the paper on DHT limitations in DAS suggests something else that is important:

- `DHT` is already quite good for fast sampling,
- but it is much worse for data dissemination if we try to use it as the main broadcast substrate.

That led me to a different direction.
Instead of trying to keep `RDA` exactly as it is, I started thinking about whether it would be better to accept a slightly longer sampling path, as long as we could reduce the duplication inside each column and improve propagation time overall.

The intuition was roughly this:

- if sampling does not need one specific piece, but can tolerate reconstruction from random coded pieces, then the system becomes less sensitive to Byzantine behavior on exact lookup paths;
- and if column dissemination is the expensive part, then maybe network coding can reduce the amount of duplication needed there.

That is what led us to think about combining `RLNC` with the `RDA` direction.

The hope is not to preserve every property of `RDA` exactly.
The hope is to find a better tradeoff:

- allow a few more hops during sampling,
- reduce the duplication cost during propagation,
- and still keep the total sampling plus propagation time below the roughly `4s` budget inside block propagation.

That is the point where the idea of `Coded Distributed Arrays` started to take shape for me.

For more detail, the slides are still the best reference for now.
