# Anonymous Communication Background for AVCP: Mix-nets, DC-nets, Tor

**Source:** standard literature, web-verified citations. No PDFs downloaded — AVCP only *assumes*
anonymous channels; their internals are explicitly out of scope per clarified-goal.md.

## The three classical options
1. **Mix-nets** — Chaum, "Untraceable electronic mail, return addresses, and digital
   pseudonyms", CACM 24(2), 1981. Relays batch, shuffle, and re-encrypt messages; anonymity
   against observers who don't control all mixes. Adds batching latency.
2. **DC-nets (dining cryptographers)** — Chaum, Journal of Cryptology 1(1):65–75, 1988.
   Information-theoretic sender anonymity via pairwise shared keys and XOR-sum rounds.
   Cost: every anonymous bit requires a round involving **all n participants**; collisions/
   slot-reservation mean transmitting one message takes O(n) work/latency per slot, and
   malicious jamming needs extra machinery (e.g., Dissent, Verdict line of systems).
3. **Onion routing / Tor** — Dingledine, Mathewson, Syverson, "Tor: The Second-Generation
   Onion Router", USENIX Security 2004. Practical low-latency circuits; anonymity is
   *computational and traffic-analysis-limited*, not information-theoretic.

## What AVCP assumes and why
- AVCP needs each process to send protocol messages **unlinkably to its identity** (otherwise
  the ring signature's anonymity is voided by the network layer trivially identifying senders).
- The paper **rejects DC-nets-style anonymous broadcast** as the transport: embedding an O(n)
  communication/latency primitive *inside every message step* of an all-to-all broadcast
  protocol would multiply round complexity by O(n) and make the t < n/3 consensus impractical.
- Instead AVCP **assumes Tor-like anonymous point-to-point channels** as a black box: messages
  from correct processes are eventually delivered and the adversary cannot link sender identity
  to message beyond what the message content reveals. This is a *trust assumption imported from
  outside the protocol*: Tor's guarantees are empirical/heuristic (global passive adversaries
  and traffic analysis break them), so AVCP's anonymity is only as strong as the channel.
- Honest-but-curious vs Byzantine distinction: the consensus tolerates t < n/3 Byzantine, but
  the anonymity property is argued against adversaries who additionally observe messages —
  the anonymous-channel assumption is what separates "vote content" from "voter identity".

## Relevance assessment
- **Medium (assumption layer):** needed to (a) explain why the paper's anonymity claim is
  conditional, (b) ground the critique section: channel latency (Tor circuit RTTs are orders of
  magnitude above LAN delays) likely dominates AVCP's latency overhead vs DBFT in any real
  deployment, and (c) note the gap: no integrated analysis of consensus liveness when the
  anonymity network itself is attacked (cf. Luo et al., "Attacking and Improving the Tor
  Directory Protocol", IEEE S&P 2024 — which, conversely, cites AVCP as a consensus tool for
  Tor's directory).
