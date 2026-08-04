import assert from "node:assert/strict";
import {
  awardAdminPoints,
  calculateBmi,
  claimReward,
  createMember,
  defaultState,
  generateWeeklyPlan,
  getLeaderboard,
  getMemberProofs,
  getMemberQrPayload,
  getStats,
  parseMemberQrPayload,
  scanMemberQr,
  updateChallengeProgress
} from "./core.mjs";

const member = createMember({
  id: "BIMO-TEST-001",
  name: "Test Lid",
  age: 24,
  heightCm: 180,
  weightKg: 81,
  targetWeightKg: 76,
  bodyFat: 28,
  bloodPressure: "128/84",
  goal: "weight_loss",
  program: "metcon",
  level: "active"
}, new Date("2026-06-24T10:00:00Z"));

assert.equal(member.name, "Test Lid");
assert.equal(member.id, "BIMO-TEST-001");

const bmi = calculateBmi(81, 180);
assert.equal(bmi.value, 25);
assert.equal(bmi.category, "Overgewicht");

const plan = generateWeeklyPlan(member);
assert.equal(plan.length, 6);
assert.equal(plan[0].day, "Maandag");

let state = defaultState();
state.member = member;

const qrPayload = getMemberQrPayload(member);
assert.equal(parseMemberQrPayload(qrPayload).memberId, member.id);

const blockedAward = awardAdminPoints(state, "bring-friend", {
  adminVerified: false
}, new Date("2026-06-24T11:00:00Z"));
assert.equal(blockedAward.awarded, 0);
assert.equal(blockedAward.state.points, 0);

const firstScan = scanMemberQr(state, qrPayload, {
  adminVerified: true,
  adminName: "Frontdesk"
}, new Date("2026-06-24T12:00:00Z"));
assert.equal(firstScan.awarded, 10);
assert.equal(firstScan.state.points, 10);
assert.equal(firstScan.scan.status, "Goedgekeurd");
assert.equal(getStats(firstScan.state).totalCheckins, 1);

const duplicateScan = scanMemberQr(firstScan.state, qrPayload, {
  adminVerified: true
}, new Date("2026-06-24T20:00:00Z"));
assert.equal(duplicateScan.awarded, 0);
assert.equal(duplicateScan.state.points, 10);

let friendAward = awardAdminPoints(duplicateScan.state, "bring-friend", {
  adminVerified: true,
  adminName: "Coach",
  note: "Nieuwe inschrijving bevestigd"
}, new Date("2026-06-25T09:00:00Z"));
assert.equal(friendAward.awarded, 75);
assert.equal(friendAward.state.points, 160);
assert.equal(friendAward.state.challenges.find((challenge) => challenge.id === "community").completed, true);

friendAward = awardAdminPoints(friendAward.state, "weight-loss", {
  adminVerified: true,
  metricValue: "3",
  note: "3 kg afname bevestigd"
}, new Date("2026-06-26T09:00:00Z"));
assert.equal(friendAward.awarded, 100);
assert.equal(friendAward.state.challenges.find((challenge) => challenge.id === "body-goal").completed, true);

const proofs = getMemberProofs(friendAward.state);
assert.equal(proofs.some((proof) => proof.title === "QR check-in bevestigd"), true);
assert.equal(proofs.some((proof) => proof.title === "Bring a friend"), true);

let rewardResult = claimReward(friendAward.state, "voucher");
assert.equal(rewardResult.claimed, false);

friendAward.state.points = 300;
rewardResult = claimReward(friendAward.state, "subscription-discount");
assert.equal(rewardResult.claimed, true);
assert.equal(rewardResult.state.claimedRewards.includes("subscription-discount"), true);

const challengeState = updateChallengeProgress(rewardResult.state, "events", 2, {
  adminVerified: true
}, new Date("2026-06-27T09:00:00Z"));
assert.equal(challengeState.challenges.find((challenge) => challenge.id === "events").completed, true);

const leaderboard = getLeaderboard(challengeState);
assert.equal(leaderboard.some((entry) => entry.name === "Test Lid"), true);

console.log("Alle BIMO Fit Challenge tests zijn geslaagd.");
