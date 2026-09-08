#!/usr/bin/env node

import assert from 'node:assert/strict';
import { autoEnsureDefaultQualificationProfile } from '../src/workspace/master-data-ui.js';
import { projectDataStore } from '../src/workspace/project-data/project-data-store.js';
import { nonFeaCommonInputStore } from '../src/workspace/non-fea-common-input-store.js';

const PROFILE_PATH = 'qualificationPolicy.qualificationProfiles';
const PROFILE_EVIDENCE = Object.freeze({
  source: 'Issue #1644 qualification-profile auto-ensure regression',
  sourceKey: 'projectData',
});

try {
  await assertExistingProfileRemainsUnbound({
    profileId: 'engineer-unqualified',
    version: 4,
    qualification: 'UNQUALIFIED',
    locked: false,
    methods: ['WEIGHT_AND_GRAVITY'],
    basis: { approvedBy: 'ENGINEER', approvedAt: '2026-09-05' },
  });

  await assertExistingProfileRemainsUnbound({
    profileId: 'engineer-unlocked-qualified',
    version: 2,
    qualification: 'QUALIFIED',
    locked: false,
    methods: ['WEIGHT_AND_GRAVITY'],
    basis: { approvedBy: 'ENGINEER', approvedAt: '2026-09-05' },
  });

  await assertLockedQualifiedProfileMayBind();
  await assertEmptyProfileSetCreatesLockedQualifiedDefault();

  console.log('Load Calc qualification profile auto-ensure authority: PASS');
} finally {
  projectDataStore.restoreApprovedProfile();
  nonFeaCommonInputStore.clear();
}

async function assertExistingProfileRemainsUnbound(profile) {
  seedProfiles([profile]);
  const beforeProfile = structuredClone(projectDataStore.getProfile());

  const changed = await autoEnsureDefaultQualificationProfile();

  assert.equal(changed, false, `${profile.profileId} must not be treated as an automatic default`);
  assert.deepEqual(projectDataStore.getProfile(), beforeProfile, 'existing engineer profile data must remain untouched');
  assert.equal(nonFeaCommonInputStore.getSnapshot().configuration.qualificationProfileId, null);
  assert.equal(nonFeaCommonInputStore.getSnapshot().configuration.qualificationProfileVersion, null);
}

async function assertLockedQualifiedProfileMayBind() {
  seedProfiles([{
    profileId: 'owner-qualified',
    version: 3,
    qualification: 'QUALIFIED',
    locked: true,
    methods: ['WEIGHT_AND_GRAVITY'],
    basis: { approvedBy: 'OWNER', approvedAt: '2026-09-05' },
  }]);

  const beforeProfile = structuredClone(projectDataStore.getProfile());
  const changed = await autoEnsureDefaultQualificationProfile();
  const configuration = nonFeaCommonInputStore.getSnapshot().configuration;

  assert.equal(changed, true);
  assert.deepEqual(projectDataStore.getProfile(), beforeProfile, 'binding must not rewrite the approved profile set');
  assert.equal(configuration.qualificationProfileId, 'owner-qualified');
  assert.equal(configuration.qualificationProfileVersion, 3);
}

async function assertEmptyProfileSetCreatesLockedQualifiedDefault() {
  seedProfiles([]);

  const changed = await autoEnsureDefaultQualificationProfile();
  const profiles = projectDataStore.getProfile().qualificationPolicy.qualificationProfiles.value.profiles;
  const configuration = nonFeaCommonInputStore.getSnapshot().configuration;

  assert.equal(changed, true);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].profileId, 'default-gravity-loads');
  assert.equal(profiles[0].qualification, 'QUALIFIED');
  assert.equal(profiles[0].locked, true);
  assert.equal(configuration.qualificationProfileId, 'default-gravity-loads');
  assert.equal(configuration.qualificationProfileVersion, 1);
}

function seedProfiles(profiles) {
  projectDataStore.clear();
  projectDataStore.update(
    PROFILE_PATH,
    {
      schema: 'non-fea-qualification-profile-set/v1',
      profiles: structuredClone(profiles),
    },
    PROFILE_EVIDENCE,
    true,
  );
  nonFeaCommonInputStore.clear();
}
