# Consensus Reading Log Handoff

Updated: 2026-05-09

## Current Goal

Build the `Consensus Reading Log` section of the portfolio page as a professor-facing research narrative.

The page should show:

- how the reading path is organized
- how the user thinks about protocol trade-offs
- how papers connect to research questions

The current focus is **content**, especially the `What is consensus?` primer and the `PBFT` subsection inside `Leader-Based Consensus`.

## Site Structure

Main file:

- `content/research/consensus-reading-log/index.md`

Current section files:

- `content/research/consensus-reading-log/sections/00-what-is-consensus.md`
- `content/research/consensus-reading-log/sections/01-leader-based-consensus.md`
- `content/research/consensus-reading-log/sections/02-ethereum-finality.md`
- `content/research/consensus-reading-log/sections/03-leaderless-consensus.md`
- `content/research/consensus-reading-log/sections/04-future-reading.md`

Assets:

- `assets/images/reading_mindmap.png`
- PBFT / Tendermint / HotStuff diagrams are under `content/diagrams/`
- newer consensus screenshots/figures are under `/assets/images/consensus/...`

Important implementation detail:

- section ordering now relies on filename prefix like `00-...`, `01-...`
- `order:` was removed from section frontmatter
- `script.js` was updated to sort by filename numeric prefix

## Intro / Index Page Direction

The intro in `index.md` already explains:

- reading started on April 5, 2026
- broad background reading came first
- around 12 papers were covered, 9 read line by line
- roadmap is:
  - leader-based consensus
  - Ethereum finality
  - leaderless consensus
  - future reading

The roadmap is now shown with:

- `assets/images/reading_mindmap.png`

There is also a short primer before the sections begin so new readers can get useful intuition instead of going directly into algorithms.

## Writing Style Preference

The user's preferred style:

- short sections
- explicit headings
- direct explanations
- no overly essay-like prose
- no excessive academic framing
- enough technical precision to be credible

Example preference:

- explain clearly
- split into short paragraphs or bullets
- keep a “human” tone
- avoid sounding too AI-generated or overly formal

The user explicitly said:

- “học cách tôi viết và chia đoạn nhé”

So future edits should match the user’s segmented, concise style.

## Primer: `00-what-is-consensus.md`

The intended content flow is:

1. The nature of a blockchain network
2. What consensus is solving
3. Safety and liveness
4. Long-chain consensus and BFT-type consensus
5. Synchrony assumptions

Key preferences / decisions:

- assume reader already knows what a blockchain is
- explain local views, forks, fork choice, and reorgs
- define consensus as preserving agreement on one canonical history/state
- explain that faulty nodes come in two kinds:
  - crash failure
  - Byzantine failure
- explain safety and liveness in short, direct language
- explain long-chain vs BFT-type consensus:
  - long-chain prioritizes liveness and tolerates temporary forks
  - BFT-type prioritizes safety and stronger finality
- synchrony section should be natural and human:
  - explain synchrony / asynchrony / partial synchrony
  - mention FLP impossibility result with link
  - explain GST intuition:
    - before GST: safety should still hold, liveness may stall
    - after GST: protocol can recover liveness

Specific wording direction that the user liked:

- “The normal path above only works when the primary behaves well. So the next question is: what happens when the leader fails?”

That tone should be preserved.

## PBFT Section Status

PBFT is inside:

- `content/research/consensus-reading-log/sections/01-leader-based-consensus.md`

### PBFT framing decisions

Important corrections:

- do **not** say PBFT is the first consensus algorithm
- do **not** say it was created for a 4-node file sharing system
- do say:
  - originally it was a practical Byzantine fault-tolerant replication protocol for distributed services
  - the paper demonstrates it with a Byzantine-fault-tolerant NFS service
  - later blockchain BFT protocols inherit or react to its structure

Paper link to include:

- PBFT paper: `https://css.csail.mit.edu/6.824/2014/papers/castro-practicalbft.pdf`

Background link if needed for `3f + 1` intuition:

- Byzantine Generals Problem: `https://lamport.azurewebsites.net/pubs/byz.pdf`

### PBFT explanation structure

Current intended PBFT flow:

1. why PBFT matters
2. `n = 3f + 1`, tolerate at most `f` Byzantine replicas
3. one proposing phase + two voting phases
4. why two voting phases matter
5. view change
6. complexity
7. further reading link

### PBFT normal-path explanation

Current accepted framing:

- original paper starts with client request to primary
- in blockchain language, this can be read as a proposer putting forward a block for the next slot
- `PRE-PREPARE` = proposing phase
- `PREPARE` = first voting phase
- `COMMIT` = second voting phase

Key explanation:

- after `PRE-PREPARE`, replicas broadcast `PREPARE`
- a replica becomes `prepared` once it has:
  - the original `PRE-PREPARE`
  - `2f` matching `PREPARE`s from other replicas
  - its own `PREPARE`
- then it moves to `COMMIT`
- once it has `2f + 1` matching `COMMIT`s, the value is durable enough to survive a later leader change

### PBFT view change

The user liked this transition:

- “The normal path above only works when the primary behaves well. So the next question is: what happens when the leader fails?”

The acceptable high-level summary is:

- Trigger
- View-change
- New-view

Important details to preserve:

- `VIEW-CHANGE` sends local safe state, including checkpoint and prepared information
- `NEW-VIEW` includes the evidence used to justify the new view
- the new primary is not free to propose arbitrary values
- only requests with enough prepared evidence are safely carried forward

The goal is to show that view change is the heavy, complicated part of PBFT without dumping the full algorithm into the main prose.

### PBFT complexity

The user wants:

- explicit reference back to the PBFT message-flow image
- a short explanation that the normal path is quadratic
- a small table

Accepted framing:

- normal path: `O(n^2)`
- one leader failure / view change: `O(n^3)`
- `f` consecutive leader failures: `O(fn^3)`

Important nuance:

- do **not** overstate `O(n^2)` as “expensive” by itself
- better wording:
  - normal path is quadratic
  - the more costly part is view change

### PBFT safety / two-vote intuition

The user wants this short, precise, and not too essay-like.

Core points to preserve:

- PBFT uses quorums of size `2f + 1` under `n = 3f + 1`
- quorum overlap:
  - if `P` and `P'` are both size `2f + 1`
  - `|P ∩ P'| >= (2f + 1) + (2f + 1) - (3f + 1) = f + 1`
- since at most `f` replicas are Byzantine, overlap contains at least one honest replica
- this explains why conflicting values cannot both gather strong support safely

For the one-vote failure intuition:

- if PBFT tried to finalize after one voting phase with a quorum of size `2f + 1`
- that quorum guarantees only `f + 1` honest witnesses:
  - `(2f + 1) - f = f + 1`
- remaining honest replicas that may have missed it:
  - `(2f + 1) - (f + 1) = f`
- so conflicting recovery evidence can still be formed from:
  - `f` Byzantine replicas
  - `f` honest replicas that never saw the first value strongly enough
- conclusion:
  - one vote phase is not enough
  - the second vote phase makes the value durable across view change

### PBFT further-reading link

The user does **not** want to call it a special proof note if that material is not exactly in the Notion page.

Use wording like:

- `For a more detailed PBFT walkthrough...`
- `My detailed PBFT reading`

Notion link:

- `https://coded-distributed-arrays.notion.site/PBFT-32f0f6a329b4803b97faeab7e3eea45b`

## Research Narrative Direction

The reading log should look like:

- research narrative
- comparison-based
- professor-facing

Not like:

- class notes
- form-filling template
- giant protocol dump

The user wants each major section to feel useful to:

- a professor reading for research taste
- a beginner or adjacent blockchain engineer seeking intuition

## Current Open Work

Likely next steps after resuming:

1. finish polishing PBFT subsection
2. add complexity table and concise safety/two-vote explanation
3. add further-reading link
4. move to Tendermint / HotStuff with the same tone
5. keep Ethereum and leaderless sections aligned with the same style

## Resume Instruction

If resuming from this handoff, start by opening:

- `content/research/consensus-reading-log/sections/01-leader-based-consensus.md`

and continue from the PBFT subsection, especially:

- complexity
- why two voting phases matter
- further-reading link
