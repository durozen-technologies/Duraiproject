# Workspace Rules

## Core Documentation Requirement
Always consult the `.core` folder in this workspace before planning or executing tasks. 

1. Review `d:\Layer-Brolier\.core\ARCHITECTURE.md` to understand the folder structure and architectural design. Log any significant structural changes there.
2. Review `d:\Layer-Brolier\.core\DATA_MODELS.md` to understand the database operations and module models.
3. Review `d:\Layer-Brolier\.core\RULES.md` for coding constraints and styling conventions.

## 🚨 MANDATORY ACTION: SESSION HISTORY
**CRITICAL RULE: YOU MUST ALWAYS WITHOUT EXCEPTION update `d:\Layer-Brolier\.core\SESSION_HISTORY.md` BEFORE ending your turn.**
Every single action you take must be logged in the history file with the current timestamp, the user's request, and the action taken. Do NOT wait for the user to remind you. If you perform an action (like installing a plugin, modifying a file, or running a command), your final step MUST be to update the session history file.

## 🚨 MANDATORY ACTION: CHAT AND COMMAND LOGGING
**CRITICAL RULE: YOU MUST ALWAYS WITHOUT EXCEPTION log the chat conversation and the exact terminal commands you run into `d:\Layer-Brolier\.core\CHAT_LOG.md`.**
This ensures that the user can read the exact commands you ran and your technical reasoning in a human-readable file, providing complete transparency and a reference for future agent invocations.

## 🚨 MANDATORY ACTION: IDEA LOGGING
**CRITICAL RULE: YOU MUST ALWAYS WITHOUT EXCEPTION log every new idea, feature request, or conceptual thought the user shares into `d:\Layer-Brolier\.core\IDEA.md`.**
Do not just acknowledge ideas in chat; they must be persistently recorded in the chronological log in the IDEA file for future analysis. You must act as the scribe for the project's vision.

## 🚨 MANDATORY ACTION: DOCUMENTATION PRESERVATION
**CRITICAL RULE: NEVER OVERWRITE HISTORICAL DOCUMENTATION.**
When making architectural pivots or massive changes to the data models, do NOT overwrite `.core/ARCHITECTURE.md` or `.core/DATA_MODELS.md`. Instead, you MUST **APPEND** your new structures under a timestamped header (e.g. `### [2026-06-30 13:25:54] New Architecture`). The original, historical structures must remain intact above it so the project can be rewound to previous states if necessary.
