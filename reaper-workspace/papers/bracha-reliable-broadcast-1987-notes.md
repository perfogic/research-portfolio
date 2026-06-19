# Asynchronous Byzantine Agreement Protocols (Bracha — Information and Computation 75(2):130–143, 1987)

**Source:** web-verified (DOI 10.1016/0890-5401(87)90054-X; dblp journals/iandc/Bracha87).
No PDF downloaded — the protocol is standard and short; this note suffices for the review scope.

## Why it matters here
Bracha's **reliable broadcast (BRB)** is the skeleton of AVCP's AARBP (anonymity-preserving
all-to-all reliable broadcast): AARBP is essentially n parallel Bracha broadcasts where sender
authentication is replaced by traceable-ring-signature verification and delivery is counted per
*anonymous* slot rather than per known sender.

## The protocol (echo–ready pattern), n > 3t
Sender broadcasts INIT(m). Then every process:
1. on INIT(m) from sender: send ECHO(m) to all;
2. on ECHO(m) from n−t distinct processes, or READY(m) from t+1: send READY(m) to all (once);
3. on READY(m) from 2t+1 distinct processes: **deliver** m.

Properties (t < n/3, asynchronous, no signatures, authenticated point-to-point channels):
- **Validity:** if the sender is correct, every correct process delivers its message.
- **Agreement (consistency):** no two correct processes deliver different messages for the same
  sender — even a Byzantine sender cannot equivocate past the echo quorum intersection.
- **Totality:** if one correct process delivers, all correct processes eventually deliver.

Threshold logic: any two (n−t)-quorums intersect in a correct process (safety of ECHO phase);
t+1 READYs include one correct process (amplification); 2t+1 READYs guarantee t+1 correct
READYs, so all correct processes reach the 2t+1 threshold (totality).

Historical contribution: Bracha used BRB to lift Ben-Or-style randomized Byzantine agreement
from n > 5t to the **optimal n > 3t**, by filtering what Byzantine processes can inject.

## Lineage to AVCP
- Bracha BRB (1987) → BV-broadcast (Mostéfaoui–Moumen–Raynal, PODC 2014) → DBFT's reliable
  broadcast + binary consensus (Crain et al. 2018) → AVCP's AARBP (2020).
- AVCP keeps the 3-step echo/ready structure and its t < n/3 quorum arithmetic; what changes is
  *identity*: message slots are keyed by ring-signature tags, not sender IDs, and equivocation
  is handled by TRS traceability in addition to quorum intersection.

## Relevance assessment
- **High (same-approach / foundational):** correctness of AARBP is argued as "Bracha-style
  quorum reasoning + TRS soundness"; any proof check of AVCP Appendix C needs these thresholds.
