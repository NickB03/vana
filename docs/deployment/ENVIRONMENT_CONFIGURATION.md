# Environment Configuration for Deployment

## Critical Environment Variables

### JWT_SECRET_KEY (REQUIRED for Production)

**Status:** ✅ **REQUIRED** in production environments
**Security Level:** CRITICAL

The `JWT_SECRET_KEY` is used to sign and verify JWT tokens for user authentication. This key MUST be:

1. **Set explicitly** via environment variable (do not use default values)
2. **At least 32 characters long** for security
3. **Consistent across all application instances** to ensure tokens work across load balancers and deployments
4. **Kept secret** and never committed to version control

#### Production Requirement

As of CRIT-003 security fix, the application will **fail to start** if `JWT_SECRET_KEY` is not set in production:

```bash
# This will cause RuntimeError on startup in production
ENVIRONMENT=production
# JWT_SECRET_KEY not set → Application fails to start
```

Error message:
```
RuntimeError: CRITICAL: JWT_SECRET_KEY or AUTH_SECRET_KEY must be set in production environment.
This is required for secure token signing and user session persistence.
Generate a secure key with: openssl rand -hex 32
```

#### Development vs Production

- **Development**: Application warns but continues without `JWT_SECRET_KEY` (insecure, for testing only)
- **Production**: Application **refuses to start** without `JWT_SECRET_KEY`

#### Generating a Secure Key

```bash
# Generate a 32-character secure random key
openssl rand -hex 32

# Example output:
# b0a3405719cba328127b8d55d5d3bf0153fdf47b1e6903e09a26f8fd957dd3ef
```

#### Setting the Environment Variable

**.env.local (Development):**
```bash
JWT_SECRET_KEY=b0a3405719cba328127b8d55d5d3bf0153fdf47b1e6903e09a26f8fd957dd3ef
```

**Cloud Run / Kubernetes:**
```bash
# Set via gcloud CLI
gcloud run services update vana \
  --set-env-vars JWT_SECRET_KEY="your-secure-key-here"

# Or via kubectl
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET_KEY="your-secure-key-here"
```

## Multi-Instance Deployments

### Shared Secret Requirement

When running multiple instances of the application (e.g., behind a load balancer, in a Kubernetes cluster, or with Cloud Run autoscaling), **all instances MUST share the same JWT_SECRET_KEY**.

**Why?** Tokens are signed with the secret key. If each instance has a different key:
- ❌ Tokens created by instance A won't be valid for instance B
- ❌ Users will be randomly logged out as requests hit different instances
- ❌ Session persistence across deployments will fail

### Recommended Secret Management Solutions

#### 1. Google Cloud Secret Manager (Recommended for GCP)

**Setup:**
```bash
# 1. Create secret
echo -n "$(openssl rand -hex 32)" | gcloud secrets create jwt-secret-key \
  --data-file=- \
  --replication-policy="automatic"

# 2. Grant Cloud Run access
gcloud secrets add-iam-policy-binding jwt-secret-key \
  --member="serviceAccount:YOUR-SERVICE-ACCOUNT@YOUR-PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 3. Mount in Cloud Run
gcloud run services update vana \
  --set-secrets="JWT_SECRET_KEY=jwt-secret-key:latest"
```

**Benefits:**
- ✅ Centralized secret management
- ✅ Automatic rotation support
- ✅ Audit logging
- ✅ Fine-grained access control
- ✅ Versioning

#### 2. AWS Secrets Manager (for AWS Deployments)

**Setup:**
```bash
# 1. Create secret
aws secretsmanager create-secret \
  --name vana/jwt-secret-key \
  --secret-string "$(openssl rand -hex 32)"

# 2. Reference in ECS/Fargate task definition
{
  "secrets": [
    {
      "name": "JWT_SECRET_KEY",
      "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:vana/jwt-secret-key"
    }
  ]
}

# 3. Or in Lambda environment
aws lambda update-function-configuration \
  --function-name vana \
  --environment Variables={JWT_SECRET_KEY=secret-from-secrets-manager}
```

#### 3. HashiCorp Vault (for Enterprise/Multi-Cloud)

**Setup:**
```bash
# 1. Write secret to Vault
vault kv put secret/vana/jwt JWT_SECRET_KEY="$(openssl rand -hex 32)"

# 2. Create policy
vault policy write vana-read - <<EOF
path "secret/data/vana/jwt" {
  capabilities = ["read"]
}
EOF

# 3. Application reads at startup
vault kv get -field=JWT_SECRET_KEY secret/vana/jwt
```

**Integration example:**
```python
# app/auth/vault_config.py
import hvac
import os

def get_jwt_secret_from_vault():
    client = hvac.Client(url=os.getenv('VAULT_ADDR'))
    client.token = os.getenv('VAULT_TOKEN')
    secret = client.secrets.kv.v2.read_secret_version(path='vana/jwt')
    return secret['data']['data']['JWT_SECRET_KEY']

# Use in config
os.environ['JWT_SECRET_KEY'] = get_jwt_secret_from_vault()
```

#### 4. Kubernetes Secrets (for Kubernetes Deployments)

**Setup:**
```bash
# 1. Create secret
kubectl create secret generic vana-jwt \
  --from-literal=JWT_SECRET_KEY="$(openssl rand -hex 32)"

# 2. Reference in deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vana
spec:
  template:
    spec:
      containers:
      - name: vana
        env:
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: vana-jwt
              key: JWT_SECRET_KEY
```

## Deployment Checklist

Before deploying to production:

- [ ] Generate a secure 32+ character JWT_SECRET_KEY using `openssl rand -hex 32`
- [ ] Store secret in a secret management system (Google Secret Manager, AWS Secrets Manager, etc.)
- [ ] Configure ALL application instances to use the SAME secret
- [ ] Set `ENVIRONMENT=production` environment variable
- [ ] Verify application starts successfully (no RuntimeError)
- [ ] Test user login and verify tokens persist across instance restarts
- [ ] Document secret rotation procedure
- [ ] Set up monitoring/alerts for authentication failures

## Testing Multi-Instance Configuration

```bash
# 1. Deploy first instance
gcloud run deploy vana-instance-1 \
  --set-secrets="JWT_SECRET_KEY=jwt-secret-key:latest"

# 2. Deploy second instance
gcloud run deploy vana-instance-2 \
  --set-secrets="JWT_SECRET_KEY=jwt-secret-key:latest"

# 3. Test token persistence
# Login to instance 1
TOKEN=$(curl -X POST https://vana-instance-1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  | jq -r '.access_token')

# Use token on instance 2 (should work!)
curl https://vana-instance-2.run.app/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Should return user info, not 401 Unauthorized
```

## Session Persistence Across Deployments

**Problem:** Without proper JWT secret management, deployments invalidate all user sessions.

**Solution:** Use a consistent `JWT_SECRET_KEY` stored in a secret manager:

```bash
# ❌ WRONG: Random key on each deployment
JWT_SECRET_KEY=$(openssl rand -hex 32)  # Different every time!

# ✅ CORRECT: Load from secret manager
JWT_SECRET_KEY=$(gcloud secrets versions access latest --secret=jwt-secret-key)
```

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Recommended: Every 90 days
   - Use secret manager's rotation features
   - Plan rotation during maintenance windows

2. **Use Different Secrets per Environment**
   ```bash
   # Development
   jwt-secret-key-dev

   # Staging
   jwt-secret-key-staging

   # Production
   jwt-secret-key-production
   ```

3. **Monitor Secret Access**
   - Enable audit logging in secret manager
   - Alert on unusual access patterns
   - Review access logs monthly

4. **Principle of Least Privilege**
   - Only grant secret access to necessary service accounts
   - Use separate service accounts per environment
   - Regularly audit IAM permissions

## Troubleshooting

### Application Fails to Start

**Error:** `RuntimeError: CRITICAL: JWT_SECRET_KEY or AUTH_SECRET_KEY must be set`

**Solution:**
```bash
# Check environment variables
gcloud run services describe vana --format="value(spec.template.spec.containers[0].env)"

# Verify secret exists
gcloud secrets describe jwt-secret-key

# Check secret access permissions
gcloud secrets get-iam-policy jwt-secret-key
```

### Users Logged Out After Deployment

**Symptom:** All users are logged out after deploying new version

**Cause:** JWT_SECRET_KEY changed between deployments

**Solution:**
1. Verify same secret is used: `gcloud run services describe vana --format=json | jq '.spec.template.spec.containers[0].env'`
2. Use secret manager instead of hardcoded values
3. Never generate new random secrets on deployment

### Tokens Invalid Across Instances

**Symptom:** Login works on instance A, but token rejected by instance B

**Cause:** Instances using different JWT_SECRET_KEY values

**Solution:**
```bash
# Verify all instances use same secret
kubectl get pods -l app=vana -o json | \
  jq '.items[].spec.containers[].env[] | select(.name=="JWT_SECRET_KEY")'

# All should reference the same secret
```

## Additional Resources

- [CRIT-003 Security Audit](../../audit/final-recommendations.md) - Original security requirement
- [Integration Tests](../../tests/integration/test_jwt_token_persistence.py) - Token persistence validation
- [Google Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [AWS Secrets Manager Docs](https://docs.aws.amazon.com/secretsmanager/)
- [HashiCorp Vault Docs](https://developer.hashicorp.com/vault/docs)
