---
title: "Week 0 Update"
program: "Ethereum Protocol Fellowship Cohort 7"
phase: "Discovery"
week: 0
year: 2026
date: "2026-06-15"
tag: "week-0"
---

# Week 0 Update

Hi I'm Daniel :wave:

Coming into EPF Cohort 7, I am participating permissionlessly and using Week 0 to get oriented around the proposed projects.

My focus so far has been learning more about Lean Ethereum, the client-side architecture around Ream, and how these areas connect to the kinds of contributions I may be able to make.

## Background

I already have some background in Data Availability Sampling and recently worked on a DAS-related paper, namely [CDA](http://danielpham.me/assets/files/cda-final-paper.pdf). I have also become increasingly interested in the consensus space.

Because of that, I am trying to connect my research background with practical client implementation work. I decided to join this cohort because it gives me a chance to contribute to interesting protocol projects while learning from people who are already working close to the core Ethereum stack.

I started by learning about the Lean client direction, which is part of Ethereum’s roadmap around fast finality and post-quantum security.

During the first week, I watched the EPF Lean Introduction videos:

- [Lean Introduction 1](https://www.youtube.com/watch?v=myz54GOqgQk)
- [Lean Introduction 2](https://www.youtube.com/watch?v=Dad2UonQ9Ag)
- [Lean Introduction 3](https://www.youtube.com/watch?v=BWvThjrjTmw)

Justin Drake’s session gave me the most insight, and Nicolas asked several useful questions that helped clarify the surrounding design space.

I also watched Ream's Lean Architecture video:

- [Ream Lean Architecture](https://www.youtube.com/watch?v=E4eLOjI6Ou8&t=1s)

The Ream architecture session, given by Kodby ML, helped me understand how the client is structured and how the different components fit together. Since this is still a new and fast-moving space, it feels like a good opportunity to apply my skills in a more practical setting while continuing to learn.

## Areas I'm Looking Into

Right now, I am testing and reading through networking-related libraries such as discv5 and libp2p. This is partly to refresh the networking-layer details and partly to build enough groundwork before I start touching and modifying the ream codebase.

The proposed projects that currently look most aligned with my background are:

- **Ream: Minimal DAS**. This is the closest match to my DAS background and gives me a path to connect my previous research work with Ethereum client implementation. It also gives me a chance to contribute to the Lean client roadmap.
- **Ream: Execution Layer**. Since I want to work on the Lean client, this project also seems relevant, and from the description, it looks like there is more room to contribute.

I also plan to look further into:

- **Grandine: Lean Client**. This is another project that could be relevant as I compare different client implementations and their approaches to the Lean Ethereum direction.

For now, I will focus on reading the ream client, understanding how a DAS scheme could be applied to it, and thinking about a generic approach that could work for both the Beacon Chain with KZG and the Lean Chain with FRI. If everything works well, my main goal for this EPF will be “Ream: Minimal PeerDAS Data Availability Client”.

## Working Through

My main task now is to read the Ream repository carefully, understand its architecture, and identify the parts where I can contribute realistically. I am also continuing to review the EPF material around Lean Ethereum, networking, and client architecture so that I can narrow my focus before moving deeper into a specific project.

Next, I plan to read through Thomas Coratger’s Lean Consensus 2026 plan, take an initial look at leanSpec, and dive deeper into the `ream` codebase. The goal is to build enough context to form a concrete plan for implementing DAS later on.

## Links

- [EPF Lean Introduction 1](https://www.youtube.com/watch?v=myz54GOqgQk)
- [EPF Lean Introduction 2](https://www.youtube.com/watch?v=Dad2UonQ9Ag)
- [EPF Lean Introduction 3](https://www.youtube.com/watch?v=BWvThjrjTmw)
- [Ream Lean Architecture](https://www.youtube.com/watch?v=E4eLOjI6Ou8&t=1s)
- [Lean Consensus: 2026 Planning](https://hackmd.io/@tcoratger/ryS1ElrWbx#)
- [leanEthereum/leanSpec](https://github.com/leanEthereum/leanSpec)
