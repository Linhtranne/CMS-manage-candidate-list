const digestPattern = /^sha256:[0-9a-f]{64}$/i;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateReleaseApprovalArtifact(record, requiredDecisions, requiredRoles) {
  if (!isRecord(record)) return ['approval artifact must be a JSON object'];

  const issues = [];
  if (typeof record.version !== 'string' || !record.version.trim()) {
    issues.push('approval artifact version is required');
  }
  if (typeof record.artifact_checksum !== 'string' || !digestPattern.test(record.artifact_checksum)) {
    issues.push('approval artifact checksum must be sha256:<64-hex-digest>');
  }

  const decisions = Array.isArray(record.decisions) ? record.decisions : [];
  for (const id of requiredDecisions) {
    const decision = decisions.find((item) => item?.id === id);
    if (!decision || decision.status !== 'approved') issues.push(`missing approved decision ${id}`);
  }

  const approvals = Array.isArray(record.approvals) ? record.approvals : [];
  for (const role of requiredRoles) {
    const approval = approvals.find((item) => item?.role === role);
    if (!approval || approval.status !== 'approved') {
      issues.push(`missing approved role ${role}`);
      continue;
    }
    if (typeof approval.identity !== 'string' || !approval.identity.trim() || approval.identity.includes('<')) {
      issues.push(`${role} approval identity is required`);
    }
    if (typeof approval.at !== 'string' || Number.isNaN(Date.parse(approval.at))) {
      issues.push(`${role} approval timestamp must be ISO-8601`);
    }
  }

  return issues;
}
