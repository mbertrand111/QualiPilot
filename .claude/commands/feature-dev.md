# Feature Development

You are helping a developer implement a new feature. Follow a systematic approach: understand the codebase deeply, identify and ask about all underspecified details, design elegant architectures, then implement.

## Core Principles

- **Ask clarifying questions**: Identify all ambiguities, edge cases, and underspecified behaviors. Ask specific, concrete questions rather than making assumptions. Wait for user answers before proceeding with implementation.
- **Understand before acting**: Read and comprehend existing code patterns first
- **Simple and elegant**: Prioritize readable, maintainable, architecturally sound code

---

## Phase 1: Discovery

**Goal**: Understand what needs to be built

**Actions**:
1. If feature unclear, ask user for:
   - What problem are they solving?
   - What should the feature do?
   - Any constraints or requirements?
2. Summarize understanding and confirm with user

---

## Phase 2: Codebase Exploration

**Goal**: Understand relevant existing code and patterns

**Actions**:
1. Read existing routes in `backend/src/routes/`
2. Read existing services in `backend/src/services/`
3. Read existing pages/components in `frontend/src/`
4. Identify patterns to follow (naming, error handling, test structure)
5. Present summary of findings

---

## Phase 3: Clarifying Questions

**Goal**: Fill in gaps before designing

**CRITICAL**: DO NOT SKIP.

**Actions**:
1. Identify underspecified aspects: edge cases, error handling, integration points, scope
2. Present all questions in a clear list
3. **Wait for answers before proceeding**

---

## Phase 4: Architecture Design

**Goal**: Design the implementation approach

**Actions**:
1. Propose 2-3 approaches with trade-offs
2. Give your recommendation with reasoning
3. **Ask user which approach they prefer**

---

## Phase 5: Implementation

**Goal**: Build the feature

**DO NOT START WITHOUT USER APPROVAL**

**Actions**:
1. Wait for explicit approval
2. Use TDD approach (see `/project:test-driven-development`) — write failing tests first
3. Implement following chosen approach
4. Follow project conventions:
   - Routes in `backend/src/routes/<resource>.ts`
   - Services in `backend/src/services/<name>.ts`
   - Pages in `frontend/src/pages/<Page>.tsx`
   - Register route: add 2 lines in `backend/src/routes/index.ts`
   - Register page: add 1 line in `frontend/src/routes.ts`

---

## Phase 6: Quality Review

**Goal**: Ensure code is correct and follows conventions

**Actions**:
1. Run `npm run test` — all tests must pass
2. Run `npm run lint` — zero TypeScript errors
3. Review for: simplicity, correct error handling, no `any` types
4. Present findings to user

---

## Phase 7: Summary

**Goal**: Document what was accomplished

**Actions**:
1. List files created/modified
2. Summarize key decisions
3. Suggest next steps
