# Branch Protection Rules Configuration

This document outlines the branch protection rules that should be configured for the Vana repository to ensure code quality and security.

## Main Branch Protection (`main`)

### Required Status Checks
- ✅ `Hook System Validation CI/CD / security-scan`
- ✅ `Hook System Validation CI/CD / shell-script-validation` 
- ✅ `Hook System Validation CI/CD / documentation-quality`
- ✅ `Hook System Validation CI/CD / hook-functional-tests`
- ✅ `Hook System Validation CI/CD / performance-monitoring`
- ✅ `Hook System Validation CI/CD / generate-comprehensive-report`
- ✅ `Security Hardening & Branch Protection / dependency-security`
- ✅ `Security Hardening & Branch Protection / code-quality-security`
- ✅ `Security Hardening & Branch Protection / secrets-detection`
- ✅ `Security Hardening & Branch Protection / license-compliance`
- ✅ `Security Hardening & Branch Protection / security-summary`

### Protection Settings
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners
  - ✅ Restrict pushes that create files that bypass branch protection

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - ✅ Require conversation resolution before merging

- ✅ **Require signed commits**

- ✅ **Restrict pushes**
  - Only allow specified users, teams, or apps to push
  - Repository administrators: ✅ Include administrators

- ✅ **Allow force pushes**: ❌ Disabled

- ✅ **Allow deletions**: ❌ Disabled

## Develop Branch Protection (`develop`)

### Required Status Checks
- ✅ `Hook System Validation CI/CD / security-scan`
- ✅ `Hook System Validation CI/CD / shell-script-validation`
- ✅ `Hook System Validation CI/CD / hook-functional-tests`
- ✅ `Security Hardening & Branch Protection / secrets-detection`
- ✅ `Pre-Commit Hook Validation / pre-commit-validation`

### Protection Settings
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale PR approvals when new commits are pushed

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging

- ✅ **Allow force pushes**: ❌ Disabled for non-admins

## Configuration Commands

### Using GitHub CLI

```bash
# Main branch protection
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Hook System Validation CI/CD / security-scan","Hook System Validation CI/CD / generate-comprehensive-report","Security Hardening & Branch Protection / security-summary"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Develop branch protection  
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Hook System Validation CI/CD / security-scan","Pre-Commit Hook Validation / pre-commit-validation"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### Using GitHub Web Interface

1. Go to Repository Settings → Branches
2. Click "Add rule" or edit existing rule
3. Configure the settings as outlined above

## Security Policies

### Required Security Checks
1. **No secrets in code** - Enforced by `secrets-detection` workflow
2. **Dependency vulnerability scan** - Enforced by `dependency-security` workflow  
3. **Code security analysis** - Enforced by `security-scan` workflow
4. **License compliance** - Enforced by `license-compliance` workflow

### Quality Gates
1. **Hook validation** - All hook tests must pass
2. **Shell script quality** - ShellCheck validation required
3. **Documentation quality** - Markdown linting required
4. **Performance benchmarks** - Must meet performance thresholds

### Automated Remediation
- Automated fixes can be applied via the `Automated Code Fixes` workflow
- Security issues trigger immediate notifications
- Performance regressions are tracked and reported

## Exemption Process

### Emergency Hotfixes
1. Create issue describing the emergency
2. Tag repository administrators
3. Use hotfix branch naming: `hotfix/critical-fix-description`
4. Require administrator approval for protection bypass

### Exemption Request Template
```markdown
## Emergency Branch Protection Bypass Request

**Issue:** [Link to critical issue]
**Risk Level:** [Critical/High/Medium]
**Business Impact:** [Description]
**Security Review:** [Completed/Waived with justification]
**Rollback Plan:** [Description]

**Approver:** [Administrator name and approval]
**Duration:** [Time limit for bypass]
```

## Monitoring and Alerts

### Security Monitoring
- ✅ Failed security scans trigger immediate alerts
- ✅ Secret detection violations block merges
- ✅ Dependency vulnerabilities reported weekly
- ✅ License compliance violations tracked

### Quality Monitoring  
- ✅ Hook validation failures tracked in metrics
- ✅ Performance regression alerts
- ✅ Code quality trend reporting
- ✅ Documentation coverage monitoring

### Compliance Reporting
- ✅ Weekly security scan summary
- ✅ Monthly compliance report
- ✅ Quarterly security review
- ✅ Annual branch protection audit

## Implementation Checklist

- [ ] Configure main branch protection rules
- [ ] Configure develop branch protection rules  
- [ ] Set up required status checks
- [ ] Configure CODEOWNERS file
- [ ] Test emergency bypass process
- [ ] Train team on new workflows
- [ ] Document exemption procedures
- [ ] Set up monitoring dashboards
- [ ] Schedule regular compliance reviews

---

**Last Updated:** $(date -u +%Y-%m-%d)
**Version:** 1.0
**Approved By:** Repository Administrators