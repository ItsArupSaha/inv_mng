# Interaction Constraints
- **Zero Scratchpad Usage**: DO NOT open the Scratchpad, Playground, or separate temp tabs. The AI agent must never use, open, or refer to separate temporary documents/scratchpads.
- **Direct Workspace Focus**: All tasks, edits, changes, and historical references must remain directly within the active project files and the context of the workspace.

# Coding Guidelines & Industry Best Practices
- **Strict Industry Standards**: Follow standard, proven software engineering design patterns and clean code principles (SOLID, DRY, OOP/functional patterns, separation of concerns). Never write whimsical, speculative, or incomplete code.
- **Refactoring Over Appending**: When adding features, refactor existing code structures to support the new capability elegantly instead of appending block code or wrapping in ad-hoc conditionals.
- **Type Safety & Complete Implementations**: Ensure full TypeScript safety and static analysis correctness for all `.ts` and `.tsx` files. Never use `any` unless absolutely necessary, and define clear, descriptive interfaces and types.
- **Modularity & Size Constraint**: Ensure every file serves exactly one clear goal. Proactively extract sub-components, helpers, custom hooks, or business logic if a component starts growing large (aiming to keep files under 150 lines).
- **No Placeholders or Mock Code**: Write fully functional, production-ready logic with proper error handling and input validation. Do not insert "todo" comments or incomplete code placeholders.
