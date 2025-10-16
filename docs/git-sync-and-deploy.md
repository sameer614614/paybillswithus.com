# Git synchronization and deployment recovery guide

When the local checkout on the VPS drifts from GitHub (for example after an aborted pull or a hard reset) use this playbook to get back to the latest code and redeploy safely.

## 1. Inspect your local state

1. `cd /opt/paybillswithus.com`
2. Check for uncommitted changes:
   ```bash
   git status
   ```
   *If files are listed under "Changes not staged" or "Untracked files" create a backup before continuing.*

## 2. Save or discard local changes

* If you want to keep the local edits, stage and commit them first:
  ```bash
  git add <files>
  git commit -m "Describe your change"
  ```
* If the changes were accidental, stash them so the working tree is clean:
  ```bash
  git stash push -m "backup-$(date +%F)"
  ```
  You can later restore them with `git stash pop`.

## 3. Fetch the latest remote history

```bash
git fetch origin
```

Use `git log --oneline origin/main | head` to confirm the newest commits that exist on GitHub.

## 4. Synchronize with the remote branch

You now have three safe options:

* **Fast-forward only (recommended when you just want to match GitHub):**
  ```bash
  git pull --ff-only origin main
  ```
  If this fails with `fatal: Not possible to fast-forward`, it means local commits exist – either push them or move them to another branch (see below).

* **Rebase your local commits on top of GitHub:**
  ```bash
  git pull --rebase origin main
  ```
  Resolve any conflicts by editing the marked files, then run `git add <file>` followed by `git rebase --continue` until the rebase finishes.

* **Merge (default Git behaviour):**
  ```bash
  git pull --no-rebase origin main
  ```
  If conflicts occur Git will list the files. Fix each file, `git add` it, then run `git commit` to complete the merge.

> **Tip:** Set your preferred strategy once so future pulls just work:
> ```bash
> git config pull.ff only              # always fast-forward when possible
> # or
> git config pull.rebase true          # always rebase
> ```

## 5. Close or replace a stuck pull request

1. Visit the PR in GitHub.
2. Use **Close pull request** to abandon it if conflicts are too complex.
3. Create a new branch locally from `main`, cherry-pick or reapply your changes, push, and open a fresh PR:
   ```bash
   git checkout main
   git pull --ff-only origin main
   git checkout -b feature/new-admin-update
   # reapply changes, commit, and push
   git push -u origin feature/new-admin-update
   ```

## 6. Deploy the refreshed code to the GoDaddy VPS

Once `main` is up to date locally, rebuild and restart the services:

```bash
npm install --prefix backend
npm install --prefix frontend
npm install --prefix admin
npm install --prefix agent

npm run build --prefix frontend
npm run build --prefix admin
npm run build --prefix agent

# Apply pending Prisma migrations
npm run migrate:deploy --prefix backend

# Restart your process manager (pm2, systemd, etc.)
pm2 restart all   # example if you use PM2
```

If you accidentally deleted one of the app folders (for example after `git reset --hard origin/main` on an outdated remote), the pull in step 4 restores them. Re-run the installs and builds to regenerate `node_modules/`.

## 7. Verify the deployment

1. `curl http://localhost:4000/health` – API health.
2. Visit `https://paybillswithus.com/` – public site.
3. Visit `https://paybillswithus.com/admin` and `https://paybillswithus.com/agent` – ensure the admin and agent bundles load.
4. Attempt to access `https://paybillswithus.com/api/admin/health` from an unapproved host – expect HTTP 403.

Keep this guide handy on the VPS (`cat docs/git-sync-and-deploy.md`) whenever Git reports divergent branches or blocked pushes.
