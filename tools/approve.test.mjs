// approve.test.mjs: tests for the approval status of a character's model sheets (tools/approve.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvalStatus } from './approve.mjs';

test('never approved', () => { assert.equal(approvalStatus({ version: 1, approvedVersion: undefined, sameBytes: null }), 'da approvare'); });
test('approved an older version', () => { assert.equal(approvalStatus({ version: 2, approvedVersion: 1, sameBytes: true }), 'da approvare'); });
test('approved and unchanged', () => { assert.equal(approvalStatus({ version: 1, approvedVersion: 1, sameBytes: true }), 'ok'); });
test('approved but the drawing changed', () => { assert.equal(approvalStatus({ version: 1, approvedVersion: 1, sameBytes: false }), 'deriva'); });
