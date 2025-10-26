# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/f16fb528-308b-4eaa-ad6f-36a2da269284

## Package Manager

This project uses **npm** as its package manager.

### Requirements
- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

**Important:** Always use npm commands to avoid dependency conflicts. Do not use Bun, Yarn, or pnpm.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/f16fb528-308b-4eaa-ad6f-36a2da269284) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm install

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**⚠️ Important:** Always use `npm` commands. Do not use other package managers (Bun, Yarn, pnpm) as this will create conflicting lock files.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/f16fb528-308b-4eaa-ad6f-36a2da269284) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Troubleshooting

### Dependency Conflicts
If you encounter dependency issues:

1. Delete conflicting lock files and node_modules:
   ```sh
   rm -rf node_modules
   rm -f bun.lockb yarn.lock pnpm-lock.yaml
   ```

2. Reinstall with npm:
   ```sh
   npm install
   ```

3. Ensure you're using npm for all commands:
   ```sh
   npm run dev
   npm run build
   ```
