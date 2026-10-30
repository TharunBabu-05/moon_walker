# Security policy

## Supported scope

Security reports are welcome for the latest source on `main` and the [current hosted SELENE game](https://tharunbabu-05.github.io/moon_walker/). Older builds are not maintained as separate security release branches. Please check whether a problem also occurs after refreshing to the current build.

## Report a vulnerability privately

Use the repository's [private vulnerability reporting page](https://github.com/TharunBabu-05/moon_walker/security/advisories/new) when **Report a vulnerability** is available. Do not include exploitable details, credentials or other people's data in a public issue or pull request.

If private reporting is unavailable and no private contact method is listed on the [maintainer's profile](https://github.com/TharunBabu-05), open a public issue containing only a request to establish a private security contact. Do not include the vulnerability details until a private channel is agreed.

Include:

- A clear description and the affected game URL or commit.
- The browser, operating system and whether the issue requires a crew session or host role.
- Minimal reproduction steps and a small proof of concept, using your own test session.
- Expected and actual behavior, the potential impact and any suggested fix.
- Relevant redacted logs or screenshots, if they help reproduce the issue.

Test only with sessions and participants you control or have permission to test. Avoid disrupting public services, collecting other players' information or publishing a working exploit before a fix is available. Please allow time for the maintainer to investigate and coordinate disclosure. This project has no guaranteed response time or bug bounty.

## Relevant areas

Reports may concern unsafe rendering of callsigns or network data, malformed multiplayer messages, unauthorized shared-state changes, accidental secret exposure, dependency vulnerabilities or deployment configuration. Reproducible evidence helps distinguish a security issue from normal latency, visual glitches or gameplay balance problems.

GitHub Pages distributes static files. PeerJS provides signalling, and WebRTC connects crew browsers. The host coordinates shared gameplay; expedition codes and invite links should be shared only with intended participants. The current game does not provide authenticated user accounts or a dedicated trusted game server.

This policy documents how to report concerns. It is not a claim that the application has undergone a security audit. For ordinary movement, graphics or connection bugs, use the [contribution guide](CONTRIBUTING.md).

Private reporting must be enabled by a repository administrator. See [GitHub's configuration guide](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository) if the private form is unavailable.
