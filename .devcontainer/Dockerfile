# Development container for stack-site-builder (the theme + its playground site).
# Based on Microsoft's devcontainer Node image (includes git, zsh, common tooling).
FROM mcr.microsoft.com/devcontainers/javascript-node:24

# Enable pnpm via Corepack (bundled with Node). Pinned to match package.json's
# packageManager field so the dev container matches CI/consumers.
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

# Astro dev server default port
EXPOSE 4321

# Work as the non-root "node" user (provided by the base image)
USER node
