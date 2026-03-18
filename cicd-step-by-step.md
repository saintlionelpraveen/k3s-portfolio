# CI/CD Step-by-Step — What You Need to Do

Everything below is what **you** need to set up manually. The code files are already updated.

---

## 1. GitHub Repository Labels

Go to **GitHub → your repo → Issues → Labels → New label** and create these 3 labels:

| Label Name | Color (suggestion) | Purpose |
|---|---|---|
| `deploy-to-k8s` | `#0E8A16` green | Triggers the deployment pipeline |
| `ns:app1` | `#1D76DB` blue | Deploy to `app1` namespace |
| `ns:app2` | `#D93F0B` orange | Deploy to `app2` namespace |

---

## 2. GitHub Secrets

Go to **GitHub → your repo → Settings → Secrets and variables → Actions** and make sure these secrets exist:

| Secret Name | Value | You Have It? |
|---|---|---|
| `DOCKERHUB_USERNAME` | `messitebi` | ✅ Already set |
| `DOCKERHUB_TOKEN` | Your Docker Hub access token | ✅ Already set |
| `JENKINS_URL` | Your current ngrok URL (e.g. `https://xxxx.ngrok-free.app`) | ⚠️ Update every time ngrok restarts |
| `JENKINS_USER` | Jenkins username | ✅ Already set |
| `JENKINS_TOKEN` | Jenkins API token | ✅ Already set |

---

## 3. GitHub Environment

Go to **GitHub → your repo → Settings → Environments** and create:

- **Environment name:** `k8s-production`
- **Protection rules:** Add yourself as required reviewer (this is the approval gate)

> If you already have this from before, you're good!

---

## 4. Jenkins Job Setup

In Jenkins, create a **new Pipeline job**:

1. **Name:** `php-k8s-deploy` (must match exactly — the GitHub workflow uses this name)
2. **Type:** Pipeline
3. **Configuration:**
   - ✅ Check "This project is parameterized" — add these 3 string parameters:
     - `TARGET_NAMESPACE` (default: `app1`)
     - `IMAGE_TAG` (no default)
     - `DOCKERHUB_USERNAME` (no default)
   - ✅ Check "Trigger builds remotely" → Token: `k8s-deploy-token`
   - Pipeline Definition: **Pipeline script from SCM**
     - SCM: Git → your repo URL
     - Script Path: `Jenkinsfile.k8s`

---

## 5. The Full Flow (How It Works)

```
You create a PR → add labels → merge PR
         ↓
GitHub Actions runs:
  1. validate-labels  → checks deploy-to-k8s + ns:app1 or ns:app2
  2. build-and-push   → builds Docker image → pushes to messitebi/k3s-ci-cd:{SHA}
  3. await-approval   → waits for you to click "Approve" in GitHub
  4. trigger-jenkins  → pings Jenkins → triggers deployment
         ↓
Jenkins runs (Jenkinsfile.k8s):
  1. Validate inputs    → checks IMAGE_TAG, DOCKERHUB_USERNAME
  2. Check cluster      → is Minikube running?
  3. Check namespace    → creates app1/app2 if needed
  4. Verify image       → pulls from Docker Hub to confirm
  5. Check deployment   → first deploy or rolling update?
  6. Rolling update     → kubectl set image
  7. Verify rollout     → checks pods are healthy
  8. Show final state   → prints pod status
         ↓
  If anything fails → AUTO ROLLBACK to previous version
```

---

## 6. How to Test

1. Make sure **Minikube is running:** `minikube status`
2. Make sure **ngrok is running:** `ngrok http 9000` (already running ✅)
3. Update `JENKINS_URL` secret in GitHub with current ngrok URL
4. Create a feature branch, make a small change, create a PR
5. Add labels: `deploy-to-k8s` + `ns:app1`
6. Merge the PR
7. Watch GitHub Actions run → Approve when prompted → Watch Jenkins deploy

---

## Files Changed

| File | What Changed |
|---|---|
| `.github/workflows/k8s-ci.yml` | 2 jobs → 4 jobs (validation, retries, error handling) |
| `Jenkinsfile.k8s` | 1 stage → 8 stages (validation, health checks, auto-rollback) |
| `deployment.yaml` | Image changed to `messitebi/k3s-ci-cd:latest` |
