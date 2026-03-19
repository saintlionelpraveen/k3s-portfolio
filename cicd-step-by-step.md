# CI/CD Pipeline Documentation — K3s Portfolio

> A complete guide on how our CI/CD pipeline works, the steps to set it up, issues we faced, and how we solved them.

---

## Table of Contents

1. [How the Pipeline Works](#1-how-the-pipeline-works)
2. [Architecture Overview](#2-architecture-overview)
3. [Setup Steps](#3-setup-steps)
4. [The Full CI/CD Flow in Action](#4-the-full-cicd-flow-in-action)
5. [Issues We Faced & Solutions](#5-issues-we-faced--solutions)
6. [Edge Cases & How We Handle Them](#6-edge-cases--how-we-handle-them)
7. [Multi-Namespace Deployment](#7-multi-namespace-deployment)
8. [Quick Reference](#8-quick-reference)

---

## 1. How the Pipeline Works

In simple terms, our pipeline does this:

```
You merge a PR on GitHub
     ↓
GitHub Actions (CI) builds your code into a Docker image and pushes it to Docker Hub
     ↓
You click "Approve" on GitHub
     ↓
GitHub Actions triggers Jenkins (CD) via ngrok
     ↓
Jenkins deploys the Docker image to Minikube (Kubernetes)
     ↓
Your app is live!
```

**Two tools, two jobs:**
- **GitHub Actions** = CI (Continuous Integration) → Build & push the Docker image
- **Jenkins** = CD (Continuous Deployment) → Deploy to Kubernetes

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        GITHUB                               │
│                                                             │
│  Developer → Creates PR → Adds Labels → Merges PR          │
│                                                             │
│  GitHub Actions Workflow (k8s-ci.yml):                      │
│    Job 1: validate-labels    → Check PR labels              │
│    Job 2: build-and-push     → Docker build + push          │
│    Job 3: await-approval     → Human click "Approve"        │
│    Job 4: trigger-jenkins    → HTTP POST to Jenkins         │
└──────────────────────┬──────────────────────────────────────┘
                       │ (via ngrok tunnel)
┌──────────────────────▼──────────────────────────────────────┐
│                      JENKINS (Local PC)                     │
│                                                             │
│  Jenkinsfile.k8s Pipeline:                                  │
│    Stage 1: Validate inputs                                 │
│    Stage 2: Check Minikube cluster                          │
│    Stage 3: Check/create namespace                          │
│    Stage 4: Verify Docker image exists                      │
│    Stage 5: Check if deployment exists                      │
│    Stage 6: Rolling update (kubectl set image)              │
│    Stage 7: Verify rollout health                           │
│    Stage 8: Show final pod state                            │
│                                                             │
│    On Failure → Auto Rollback                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    MINIKUBE (Kubernetes)                     │
│                                                             │
│  Namespace: app1 → NodePort 30080                           │
│  Namespace: app2 → NodePort auto-assigned                   │
│                                                             │
│  Each namespace runs:                                       │
│    - Deployment (php-app) → 1 pod                           │
│    - Service (php-app-service) → NodePort                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Setup Steps

### Step 1: GitHub Repository Labels

Go to **GitHub → repo → Issues → Labels → New label** and create:

| Label | Purpose |
|---|---|
| `deploy-to-k8s` | Tells the pipeline "yes, deploy this" |
| `ns:app1` | Deploy to namespace `app1` |
| `ns:app2` | Deploy to namespace `app2` |

### Step 2: GitHub Secrets

Go to **GitHub → repo → Settings → Secrets and variables → Actions**:

| Secret | Value | Notes |
|---|---|---|
| `DOCKERHUB_USERNAME` | `messitebi` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Your Docker Hub access token | Generate at hub.docker.com → Account Settings → Security |
| `JENKINS_URL` | `https://xxxx.ngrok-free.app` | ⚠️ Changes every time ngrok restarts |
| `JENKINS_USER` | Your Jenkins username | |
| `JENKINS_TOKEN` | Your Jenkins API token | Jenkins → User → Configure → API Token |

### Step 3: GitHub Environment

Go to **GitHub → repo → Settings → Environments**:
- Create environment: `k8s-production`
- Add yourself as a **required reviewer** (this is the approval gate)

### Step 4: Jenkins Job

1. Create a new Pipeline job named: **`php-k8s-deploy`**
2. Configure:
   - ✅ **This project is parameterized** → add 3 String Parameters:
     - `TARGET_NAMESPACE` (default: `app1`)
     - `IMAGE_TAG` (no default)
     - `DOCKERHUB_USERNAME` (default: `messitebi`)
   - ✅ **Trigger builds remotely** → Token: `k8s-deploy-token`
   - **Pipeline** → Pipeline script from SCM → Git → your repo URL
   - **Script Path**: `Jenkinsfile.k8s`

### Step 5: Ensure Tools Are Running

```powershell
# Minikube must be running
minikube status

# ngrok must be running (exposes Jenkins to the internet)
ngrok http 9000

# Jenkins must be running on port 9000
# Access at http://localhost:9000
```

---

## 4. The Full CI/CD Flow in Action

### Example: Deploy a navbar change to `app2`

**Step 1:** Create a feature branch and make your change
```powershell
git checkout main
git pull origin main
git checkout -b feature/app2-clean-nav
# Make your code changes...
git add .
git commit -m "feat: remove test buttons for app2"
git push origin feature/app2-clean-nav
```

**Step 2:** Go to GitHub → Create Pull Request
- Base: `main` ← Compare: `feature/app2-clean-nav`
- Add labels: `deploy-to-k8s` + `ns:app2`
- Click "Create pull request"

**Step 3:** Merge the PR
- Click "Merge pull request" (resolve conflicts if any)

**Step 4:** GitHub Actions starts automatically
- `validate-labels` → Reads labels, confirms `app2`
- `build-and-push` → Builds Docker image, pushes to `messitebi/k3s-ci-cd:<commit-sha>`
- `await-approval` → **You must click "Approve"** in GitHub (Review deployment → Approve)
- `trigger-jenkins` → Pings Jenkins, triggers the deploy job

**Step 5:** Jenkins receives the trigger and deploys
- Validates inputs → Checks Minikube → Creates namespace if needed → Pulls image → Deploys → Verifies health

**Step 6:** Check your app
```powershell
kubectl get svc -n app2
# Find the NodePort, e.g., 80:32575/TCP
# Open: http://172.26.5.222:32575
```

---

## 5. Issues We Faced & Solutions

### Issue 1: Jenkins Job Not Found (HTTP 404)

**What happened:**
GitHub Actions triggered Jenkins, but got a 404 error because the Jenkins job name didn't match.

**Error:**
```
Jenkins job 'php-k8s-deploy' not found (HTTP 404).
```

**Solution:**
Created a new Jenkins pipeline job named exactly `php-k8s-deploy` to match the name in `k8s-ci.yml`. The job name in Jenkins must match the URL path in the GitHub workflow:
```yaml
"${{ secrets.JENKINS_URL }}/job/php-k8s-deploy/buildWithParameters"
```

---

### Issue 2: timestamps() Plugin Not Installed

**What happened:**
Jenkins failed to parse the Jenkinsfile because `timestamps()` requires the Timestamper plugin.

**Error:**
```
Invalid option type "timestamps". Valid option types: [buildDiscarder, timeout, ...]
```

**Solution:**
Removed `timestamps()` from the `options` block in `Jenkinsfile.k8s`. It was a nice-to-have feature from the reference file, not essential.

---

### Issue 3: DOCKERHUB_USERNAME Empty

**What happened:**
GitHub Actions triggered Jenkins, but the `DOCKERHUB_USERNAME` parameter arrived empty. Jenkins validation caught it and failed.

**Error:**
```
Validation failed:
DOCKERHUB_USERNAME is empty.
```

**Solution:**
Set a default value for the `DOCKERHUB_USERNAME` parameter in `Jenkinsfile.k8s`:
```groovy
string(
    name: 'DOCKERHUB_USERNAME',
    defaultValue: 'messitebi',  // ← hardcoded fallback
    description: 'Docker Hub username'
)
```

---

### Issue 4: ngrok Already Running (ERR_NGROK_334)

**What happened:**
Tried to start ngrok but it was already running in another terminal.

**Error:**
```
ERROR: failed to start tunnel: The endpoint is already online.
ERR_NGROK_334
```

**Solution:**
```powershell
# Kill all existing ngrok processes
taskkill /F /IM ngrok.exe

# Wait ~30 seconds for ngrok servers to clear the session
# Then restart
ngrok http 9000
```

---

### Issue 5: Git Merge Conflict on PR

**What happened:**
GitHub showed "Can't automatically merge" because the feature branch was behind `main`.

**Solution:**
```powershell
git fetch origin main
git merge origin/main
# Resolve conflicts (keep our new version)
git checkout --ours Jenkinsfile.k8s
git add Jenkinsfile.k8s
git commit -m "Merge branch 'main' into feature/optimized-cicd"
git push origin feature/optimized-cicd
```

---

### Issue 6: NodePort Conflict Between Namespaces

**What happened:**
`app1` used `nodePort: 30080` in `service.yaml`. When deploying the same `service.yaml` to `app2`, it would clash because NodePort is cluster-wide.

**Solution:**
Removed the hardcoded `nodePort: 30080` from `service.yaml` for the `app2` deployment. Kubernetes auto-assigns a free port (e.g., `32575`). `app1` keeps its port because its service was already deployed and won't be redeployed.

---

## 6. Edge Cases & How We Handle Them

### GitHub Actions (k8s-ci.yml)

| Edge Case | What Could Go Wrong | Our Solution |
|---|---|---|
| **No `deploy-to-k8s` label** | Pipeline deploys without being asked | Skips entire pipeline if label is missing |
| **Both `ns:app1` AND `ns:app2` labels** | Ambiguous — deploy to which one? | Rejects the PR with a clear error message |
| **`deploy-to-k8s` but no `ns:` label** | Don't know which namespace | Rejects with: "Add one namespace label to the PR" |
| **Docker Hub push fails** | Network issue, rate limit | **Retries 3 times** with 15-second wait between attempts |
| **Image doesn't actually reach Docker Hub** | Silent push failure | **Pulls the image back** after push to verify it exists |
| **Dockerfile missing** | Build fails with confusing error | Checks `Dockerfile` exists before trying to build |
| **Jenkins not reachable (ngrok down)** | curl hangs or fails | **Pings Jenkins `/login` first** before triggering, with retry |
| **Jenkins auth fails** | Wrong username/token | Detects HTTP 401/403 and shows "Check JENKINS_USER and JENKINS_TOKEN" |
| **Jenkins job missing** | Job name mismatch | Detects HTTP 404 and shows "Create the job or check the name" |
| **Network timeout** | Slow connection | 30-second timeout + 2 retries on the trigger request |

### Jenkins (Jenkinsfile.k8s)

| Edge Case | What Could Go Wrong | Our Solution |
|---|---|---|
| **Empty IMAGE_TAG** | Deploy with no image tag | Validation stage catches it: "IMAGE_TAG is empty" |
| **Truncated git SHA (< 7 chars)** | Wrong image reference | Validation warns: "looks truncated" |
| **Invalid namespace** | Deploy to wrong place | Only allows `app1` or `app2` (choice parameter) |
| **Minikube not running** | kubectl commands hang | Checks kubeconfig exists + runs `cluster-info` with 10s timeout |
| **Namespace doesn't exist** | `kubectl apply` fails | **Auto-creates** the namespace if missing |
| **Image doesn't exist on Docker Hub** | Pods go into ImagePullBackOff | **Pulls the image first** to verify before deploying |
| **First-ever deployment** | `kubectl set image` fails (no existing deployment) | Checks if deployment exists → if not, runs `kubectl apply` first |
| **Pods crash after deploy** | CrashLoopBackOff | Checks pod status after rollout → triggers rollback if unhealthy |
| **Bad deploy (any stage fails)** | App is broken | **Auto-rollback** via `kubectl rollout undo` in the `post.failure` block |
| **Pipeline aborted manually** | Unclear state | Logs "No rollback performed" — previous version stays active |
| **Disk fills up from images** | Old images pile up | `post.always` block runs `docker rmi` to clean up pulled images |
| **Pipeline hangs forever** | Stuck process | **15-minute global timeout** kills the entire pipeline |

---

## 7. Multi-Namespace Deployment

We use namespaces to run **different versions** of the same app side by side.

### Current Setup

| Namespace | What's Different | URL | NodePort |
|---|---|---|---|
| `app1` | Original app with Pipeline Test + Ngrok Test buttons | http://172.26.5.222:30080 | 30080 (fixed) |
| `app2` | Clean navbar (buttons removed) | http://172.26.5.222:32575 | 32575 (auto) |

### How It Works

Each namespace is like a separate "room" in Kubernetes:
- Same deployment name (`php-app`) and service name (`php-app-service`) can exist in both
- Different Docker image versions (different commit SHAs)
- PR labels control which namespace gets the deployment

### How to Check Both

```powershell
# See what's running in app1
kubectl get pods -n app1
kubectl get svc -n app1

# See what's running in app2
kubectl get pods -n app2
kubectl get svc -n app2
```

---

## 8. Quick Reference

### Files in the Pipeline

| File | Purpose |
|---|---|
| `.github/workflows/k8s-ci.yml` | GitHub Actions workflow (CI) — 4 jobs |
| `Jenkinsfile.k8s` | Jenkins pipeline (CD) — 8 stages + auto-rollback |
| `Dockerfile` | How to build the PHP app image |
| `deployment.yaml` | Kubernetes deployment manifest (1 pod, php-app) |
| `service.yaml` | Kubernetes service manifest (NodePort) |

### Common Commands

```powershell
# Check pods in a namespace
kubectl get pods -n app1

# Check services (find the port)
kubectl get svc -n app1

# See pod logs
kubectl logs -n app1 <pod-name>

# Manually rollback a deployment
kubectl rollout undo deployment/php-app -n app1

# Check what image a deployment is using
kubectl get deployment php-app -n app1 -o=jsonpath="{.spec.template.spec.containers[0].image}"

# Delete everything in a namespace
kubectl delete all --all -n app2
```

### Docker Hub

```powershell
# Images are pushed to:
docker pull messitebi/k3s-ci-cd:latest
docker pull messitebi/k3s-ci-cd:<commit-sha>
```

---

> **Last Updated:** March 18, 2026
> **Project:** K3s Portfolio (saintlionelpraveen/k3s-portfolio)
