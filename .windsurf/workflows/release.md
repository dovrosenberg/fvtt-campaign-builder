# Module Release Workflow

Performs a complete release of the Campaign Builder module, including version verification, changelog validation, testing, and GitHub release creation.

---

## Steps

1. **Verify version number is incremented.**

   Read `package.json` to get the current version. Then check GitHub releases to find the latest released version:
   ```bash
   gh release list --limit 5
   ```
   
   Compare the two versions. The `package.json` version must be **higher** than the latest release. If not, ask the user to update the version in `package.json` before proceeding.

2. **Validate changelog entry.**

   Read `CHANGELOG.md` and verify:
   - There is a section for the new version (e.g., `## 1.10.2 - <title>`)
   - The header includes the version number matching `package.json`
   - The release date badge is present and correct format: `![](https://img.shields.io/badge/release%20date-<Month>%20<Day>%2C%20<Year>-blue)`
   - The download badge is present with correct version: `![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v<version>/module.zip)`
   
   For each **new feature** listed (not bug fixes), verify it has a documentation link in the format:
   `([documentation](https://dovrosenberg.github.io/fvtt-campaign-builder/<path>))`
   
   If any issues are found, ask the user to fix them before proceeding.

3. **Ask about additional updates.**

   Ask the user:
   > Are any updates needed to:
   > - README.md and Foundry registry description
   > - CREDITS.md
   > - Tested Foundry version (in `static/module.json`)
   >
   > If yes, make those changes now before proceeding.

4. **Run tests and confirm they pass.**

   Run the test build:
   ```bash
   npm run debug:test
   ```
   
   After the build completes, ask the user:
   > Please reload Foundry and run the Quench tests. Confirm all tests pass before proceeding.

   Wait for user confirmation.

5. **Ensure dev branch is up to date.**

   Check current branch and ensure all changes are committed:
   ```bash
   git status
   git branch --show-current
   ```
   
   If on `dev` branch and there are uncommitted changes, ask the user to commit them. If on a different branch, ask whether to switch to `dev` or proceed from current branch.

6. **Create pull request from dev to main.**

   Push the current state and create a PR:
   ```bash
   git push origin dev
   gh pr create --base main --head dev --title "Release v<VERSION>" --body "Release preparation for v<VERSION>. See CHANGELOG.md for details."
   ```
   
   Then ask the user:
   > A PR has been created to merge dev into main. Please merge the PR manually in GitHub, then confirm when done.

   Wait for user confirmation that the PR is merged.

7. **Create the GitHub release.**

   After the PR is merged, create the release:
   ```bash
   git checkout main
   git pull origin main
   gh release create v<VERSION> --title "v<VERSION>" --notes-file - <<EOF
   See [CHANGELOG.md](https://github.com/dovrosenberg/fvtt-campaign-builder/blob/main/CHANGELOG.md) for release details.
   EOF
   ```
   
   The GitHub release workflow (`.github/workflows/release.yml`) should automatically build and attach the `module.zip` to the release.
   
   Confirm completion by telling the user: "Release v<VERSION> created successfully!"