# System Tracker

System Tracker is a browser-based React app built with Vite. It lets you create and track systems and the projects inside them, and it generates prompts for those projects. Data is stored locally in the browser with IndexedDB.

## Requirements

- Node.js 20 or newer
- npm

## Install

```sh
npm ci
```

## Run in development

```sh
npm run dev
```

The dev server listens on `0.0.0.0` on port 8000, so open http://localhost:8000.

## Build

```sh
npm run build
```

The production build is written to `dist/`.

## Preview the production build

```sh
npm run preview
```

The preview server also listens on `0.0.0.0` on port 8000.

## Run in a container

Build the image from the repository root and run it, publishing container port 8000:

```sh
docker build -t system-tracker .
docker run --rm -p 8000:8000 system-tracker
```

Then open http://localhost:8000.

The image installs dependencies with `npm ci`, builds the app, and serves it with `vite preview` as the non-root `node` user.

## Deploy with deploy-manager

The project meets the deploy-manager requirements:

- A `Dockerfile` at the repository root, built with the repository root as the build context.
- The application listens on port 8000, bound to `0.0.0.0`.
- It does not need privileged mode, the Docker socket or extra Linux capabilities, and it runs as a non-root user.
- A `.dockerignore` keeps the build context small.

To deploy, host the repository on an allowed git host (github.com, gitlab.com or bitbucket.org) and reach it over https without credentials in the URL.