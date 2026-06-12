# Project Context (bridge to Rosetta)

> Existing-system knowledge is maintained by Rosetta.
> This file points BMAD agents at it and adds implementation rules.
> Keep in sync after each Rosetta refresh.

## Source of truth (Rosetta — AS-IS)

- Tech stack & versions   → see ../docs/TECHSTACK.md
- File / module map       → see ../docs/CODEMAP.md
- Dependencies & bounds   → see ../docs/DEPENDENCIES.md
- Current architecture    → see ../docs/ARCHITECTURE.md  ← AS-IS; do not redesign here
- Business / domain       → see ../docs/CONTEXT.md

## Implementation rules (non-obvious, BMAD-specific)

<!-- Add project-specific conventions here, e.g.:
- All public classes require JSDoc.
- Errors go through src/errors/AppError, never throw raw strings.
- New endpoints must register in src/routes/index and have a contract test.
-->

## To-be vs as-is

- BMAD architecture.md   = TO-BE design for new work (created per feature)
- ../docs/ARCHITECTURE.md = AS-IS, maintained by Rosetta; do not overwrite with TO-BE
