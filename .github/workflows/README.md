# GitHub Actions Workflows

## Deploy to GitHub Pages

This workflow automatically builds and deploys the playground to GitHub Pages whenever you push to `main` or `master` branch.

### Setup Instructions

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Source: Select "GitHub Actions"

2. **Set up the GUIDE_URL secret** (optional):
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `GUIDE_URL`
   - Value: The URL to your GUIDE.md file (default will be used if not set)
   - Example: `https://raw.githubusercontent.com/DMBerlin/json-forgefy/refs/heads/main/GUIDE.md`

3. **Push to main/master branch**:
   - The workflow will automatically trigger
   - Check the Actions tab to see the build progress
   - Once complete, your playground will be live at: `https://<username>.github.io/<repo-name>/`

### Manual Deployment

You can also manually trigger the workflow:
- Go to Actions tab
- Select "Deploy to GitHub Pages"
- Click "Run workflow"

### What the Workflow Does

1. Checks out your code
2. Sets up Node.js and pnpm
3. Installs dependencies
4. Builds the playground (fetches GUIDE.md, builds browser bundle, copies static files)
5. Deploys the `dist` folder to GitHub Pages

### Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **GUIDE.md not found**: Verify the `GUIDE_URL` secret is set correctly, or the default URL is accessible
- **Pages not updating**: Make sure GitHub Pages is enabled and set to use "GitHub Actions" as the source

