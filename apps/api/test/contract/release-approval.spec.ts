import { describe, expect, it } from 'vitest';
import { validateReleaseApprovalArtifact } from '../../scripts/release-approval.mjs';

const requiredDecisions = ['DEC-001', 'DEC-002', 'DEC-004', 'DEC-005', 'DEC-006', 'DEC-007'];
const requiredRoles = ['Backend Tech Lead', 'Product Owner', 'QA Lead', 'Security Owner', 'Operations Owner'];

type ApprovalArtifact = {
  version?: string;
  artifact_checksum?: string;
  decisions: Array<{ id: string; status: string }>;
  approvals: Array<{ role: string; status: string; identity: string; at: string }>;
};

function validArtifact(): ApprovalArtifact {
  return {
    version: '1.0.0',
    artifact_checksum: 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    decisions: requiredDecisions.map((id) => ({ id, status: 'approved' })),
    approvals: requiredRoles.map((role) => ({ role, status: 'approved', identity: `${role}@example.test`, at: '2026-08-21T00:00:00Z' })),
  };
}

describe('release approval artifact contract', () => {
  it('accepts a complete immutable approval artifact', () => {
    expect(validateReleaseApprovalArtifact(validArtifact(), requiredDecisions, requiredRoles)).toEqual([]);
  });

  it('rejects an artifact without version or checksum', () => {
    const artifact = validArtifact();
    delete artifact.version;
    delete artifact.artifact_checksum;

    expect(validateReleaseApprovalArtifact(artifact, requiredDecisions, requiredRoles)).toEqual([
      'approval artifact version is required',
      'approval artifact checksum must be sha256:<64-hex-digest>',
    ]);
  });

  it('rejects missing approved decisions and unverifiable role approvals', () => {
    const artifact = validArtifact();
    artifact.decisions[0].status = 'pending';
    artifact.approvals[0].identity = '';
    artifact.approvals[1].at = 'not-a-date';

    expect(validateReleaseApprovalArtifact(artifact, requiredDecisions, requiredRoles)).toEqual([
      'missing approved decision DEC-001',
      'Backend Tech Lead approval identity is required',
      'Product Owner approval timestamp must be ISO-8601',
    ]);
  });
});
