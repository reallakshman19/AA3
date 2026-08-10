# M047 BM4_L source-custody evidence

## Status

**BLOCKED — immutable source authorities are internally inconsistent.**

No stiffness, load, restraint, recovery, tolerance, reference, or benchmark-specific mechanics change is justified while this contradiction remains unresolved.

## Pinned repository identity

The diagnostic checkout used `reallaksh19/Common` commit:

`45d51ea18624f5775805f399110c1738301c0d90`

For `LFEA/BM4/BM4_L.zip`:

- expected Git blob SHA-1: `df119ae1b8272469b6204036ab1aff21e561dfb8`
- observed Git blob SHA-1: `df119ae1b8272469b6204036ab1aff21e561dfb8`
- expected ZIP SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- observed ZIP SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- expected ZIP size: `582,488` bytes
- observed ZIP size: `582,488` bytes

The archive contains exactly one member:

- name: `BM4_L.ACCDB`
- compressed length: `582,296` bytes
- uncompressed length: `5,136,384` bytes

These checks establish that the exact pinned ZIP was read from the exact pinned repository commit; this is not a raw-download or branch-drift problem.

## Independent member extraction

The sole `BM4_L.ACCDB` member was extracted twice from the pinned ZIP using independent paths on the Windows runner:

1. .NET `System.IO.Compression.ZipFile`
2. Windows `tar.exe`

Both produced a `5,136,384` byte ACCDB with SHA-256:

`64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

The declared expected ACCDB SHA-256 is:

`e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c`

Therefore:

- ZIP repository identity: **PASS**
- ZIP blob identity: **PASS**
- ZIP SHA-256/size: **PASS**
- ZIP member inventory/name/size: **PASS**
- independent extraction agreement: **PASS**
- declared extracted ACCDB SHA-256: **FAIL**

This is a provenance contradiction between the immutable ZIP authority and the declared extracted-member hash.

## Execution consequence

The diagnostic workflow failed closed before ACE ingestion and before the BM4_L solve. It did **not**:

- substitute InputXML;
- accept the observed ACCDB hash as a new authority;
- alter the benchmark profile or reference;
- run a mechanics A/B test on unapproved source bytes;
- fit any coefficient or tolerance.

The independent framework regression checks still passed:

- `check:lfea-b3.0`
- `check:lfea-b3.4`
- `check:lfea-b3.8`
- `check:lfea-b3.9`

## Reproducible evidence

GitHub Actions run: `31358317689`

Job: `93362058882`

Uploaded artifact: `9051419626`

Artifact digest: `sha256:6e1b00faf178e3ec55c436e826457dc65c152a3433c86de842f18b21793c8ea3`

The artifact contains `bm4l-custody.json`, including the pinned commit, blob identity, ZIP identity, member inventory, and both extraction hashes.

## Unblock condition

Mechanics work can resume only after one source authority is corrected with explicit provenance, for example either:

- a versioned ACCDB/ZIP whose member actually hashes to `e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c`; or
- authoritative confirmation that the pinned ZIP's member hash `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8` is the intended source, accompanied by an explicit source-authority update.

Until then the correct state is `BLOCKED`, not a solver correction.
