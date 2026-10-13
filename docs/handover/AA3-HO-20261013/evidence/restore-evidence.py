#!/usr/bin/env python3
"""Reassemble and verify the unchanged handover ZIP. Standard library only."""
import hashlib
import json
import pathlib
import tempfile
import zipfile

root = pathlib.Path(__file__).resolve().parent
manifest = json.loads((root / 'parts-manifest.json').read_text(encoding='utf-8'))
target = root.parent / manifest['archive']['path']
if target.exists():
    if target.stat().st_size != manifest['archive']['bytes'] or hashlib.sha256(target.read_bytes()).hexdigest() != manifest['archive']['sha256']:
        raise SystemExit('Existing ZIP differs; move it aside before restoring.')
else:
    digest = hashlib.sha256()
    total = 0
    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as stream:
        temporary = pathlib.Path(stream.name)
        try:
            for part in manifest['parts']:
                source = root / part['path']
                data = source.read_bytes()
                if len(data) != part['bytes'] or hashlib.sha256(data).hexdigest() != part['sha256']:
                    raise ValueError('Missing or corrupt evidence part: ' + part['path'])
                stream.write(data)
                digest.update(data)
                total += len(data)
            if total != manifest['archive']['bytes'] or digest.hexdigest() != manifest['archive']['sha256']:
                raise ValueError('Reconstructed archive checksum differs.')
        except Exception:
            stream.close()
            temporary.unlink(missing_ok=True)
            raise
    temporary.replace(target)
with zipfile.ZipFile(target) as archive:
    if archive.testzip() is not None:
        raise SystemExit('ZIP integrity check failed.')
    contents = json.loads(archive.read('MANIFEST.json'))
    for item in contents['files']:
        data = archive.read(item['path'])
        if len(data) != item['bytes'] or hashlib.sha256(data).hexdigest() != item['sha256']:
            raise SystemExit('Packaged evidence differs: ' + item['path'])
print('Verified:', target)
print('Evidence files:', len(contents['files']))
print('SHA-256:', manifest['archive']['sha256'])
