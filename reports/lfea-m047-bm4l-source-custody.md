# M047 BM4_L source-custody evidence

## Status

**RESOLVED for the pinned server source.**

The immutable Common repository/ZIP authority is internally reproducible. The historically declared extracted-member SHA-256 `e21b0862…` is stale metadata and is not produced by the pinned ZIP or by the controlled ACE reader used for reproduction.

No XML or sibling archive was substituted.

## Pinned repository identity

The source is `reallaksh19/Common` commit:

`45d51ea18624f5775805f399110c1738301c0d90`

For `LFEA/BM4/BM4_L.zip`:

- Git blob SHA-1: `df119ae1b8272469b6204036ab1aff21e561dfb8`
- ZIP SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- ZIP size: `582,488` bytes
- sole member: `BM4_L.ACCDB`
- member size: `5,136,384` bytes

Independent .NET ZipFile and `tar.exe` extraction both produce ACCDB SHA-256:

`64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

No member of the sibling `BM4 accdb.zip`, `BM4_L.zip`, or `BM4_NL.zip` archives at the pinned revision has SHA-256 `e21b0862…`.

## Controlled ACE reproduction

A Windows 2022 GitHub Actions run installed the signed Microsoft Access Database Engine 2016 x64 package and recorded the provider identity before reading the copied ACCDB.

Provider:

- ProgID: `Microsoft.ACE.OLEDB.12.0`
- ACE DLL file version: `16.0.5011.1000`
- Microsoft Authenticode signature was verified before installation.

The copied ACCDB hash was measured at four phases:

1. pre-ACE extraction;
2. after a simple ACE open/close;
3. from the unchanged benchmark exporter while ACE had read the database;
4. after exporter close.

All four hashes are exactly:

`64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

Therefore ACE did not mutate the database into `e21b0862…`; that historical value does not identify the immutable pinned source.

Primary ACE reproduction:

- workflow run: `31359652980`
- job: `93365824742`
- artifact: `9051901943`

## Reproducible numerical baseline

The unchanged six-case benchmark run against the pinned `64c05a50…` member reproduces the published comparison table exactly except for one historical threshold count in L6 source-element actions:

| Case | restraint | displacement/rotation | source end actions |
| --- | ---: | ---: | ---: |
| L2 | 4 | 115 | 142 |
| L3 | 9 | 98 | 179 |
| L4 | 6 | 66 | 86 |
| L5 | 3 | 72 | 162 |
| L6 | 1 | 64 | 49 |
| L14 | 9 | 98 | 179 |

Reproducible total: **1,342** targeted failures.

The published #988 table reported L6 end actions as 50, producing historical total 1,343. That one-count difference is retained as historical provenance rather than silently rewritten into an apparent improvement.

## Consequence

BM4_L mechanics diagnostics may proceed using the immutable pinned ZIP and pristine extracted ACCDB SHA-256 `64c05a50…`.

The stale `e21b0862…` member hash must not be used to block or relabel the source bytes, and must not be treated as a second benchmark source.
