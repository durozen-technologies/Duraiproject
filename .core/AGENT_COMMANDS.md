# Agent Skills & Slash Commands

This document contains the core slash commands provided by the `agent-skills` plugin, mapped directly to the software development lifecycle. Use these at any time to force the AI into a specific, structured workflow.

### 📐 1. Definition & Planning
* **`/spec`**
  * **Action**: Stops immediate coding. Forces the agent to ask questions, do research, and write a full Product Requirements Document (PRD) to clarify exactly *what* to build and *why*.
* **`/plan`**
  * **Action**: Takes an existing spec (or a large request) and breaks it down into small, verifiable, atomic tasks. Creates a checklist of tasks before starting.

### 🏗️ 2. Building
* **`/build`**
  * **Action**: Forces incremental building, one slice at a time. The agent focuses on implementing a single task from the plan and pauses for feedback rather than attempting to build everything in one step.
* **`/build auto`** 
  * **Action**: The "autopilot" command. Generates a plan and autonomously implements every single task in a single approved pass. Pauses on failures but doesn't require prompting for every task.

### 🧪 3. Verification & Quality
* **`/test`**
  * **Action**: Enforces Test-Driven Development (TDD). Forces the agent to prove that the code actually works by writing and running tests, diagnosing any errors, and ensuring everything is verified.
* **`/review`**
  * **Action**: Runs a strict multi-axis code review on the codebase. The agent reviews the code for health, architecture, security, and edge cases *before* merging.
* **`/webperf`**
  * **Action**: Audits web performance. Forces the agent to measure current performance (like Core Web Vitals) before attempting any optimizations.
* **`/code-simplify`**
  * **Action**: Triggers a refactoring workflow focused on clarity over cleverness. Looks for overly complex code and simplifies it for readability and maintainability.

### 🚀 4. Deployment
* **`/ship`**
  * **Action**: Prepares for a production launch. Forces a pre-launch checklist, staging verification, monitoring checks, and rollback strategies before pushing to live.

### 🛠️ 5. AAS Community App Building Commands
* **`/app-builder`**
  * **Action**: Orchestrates the creation of full-stack applications. Analyzes the request, determines the tech stack, scaffolds the project, and coordinates agents to build out the frontend and backend features.
* **`/secure-app-builder`**
  * **Action**: Builds features with a strict security-first mindset. Implements safe patterns, mitigates vulnerabilities (like XSS, injection), and ensures the application is hardened during the development process.

### 🎨 6. Frontend Development Commands
* **`/frontend-ui-engineering`**
  * **Action**: The primary command for UI work. Prioritizes modern design aesthetics, vibrant color palettes, micro-animations, and builds production-quality components instead of basic, generic designs.
* **`/performance-optimization`**
  * **Action**: Focuses entirely on making the frontend blazingly fast. Reduces React re-renders, optimizes CSS, improves Core Web Vitals, and ensures animations run smoothly.
* **`/browser-testing-with-devtools`**
  * **Action**: Connects to a real Chrome browser instance via DevTools. Inspects the DOM, checks the browser console for frontend errors, views network requests, and verifies that the UI renders correctly.
* **`/code-simplification`**
  * **Action**: Refactors complex React components and Tailwind classes to make them cleaner and easier to maintain, without changing how they look visually.

