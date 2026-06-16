# Contributing to Dzul's Dev Studio API

First off, thank you for considering contributing to Dzul's Dev Studio API! 

## Development Workflow

1. **Fork & Clone**: Fork the repository and clone it locally.
2. **Branching**: Create a new branch for your feature or bugfix (`feature/your-feature-name` or `bugfix/issue-description`).
3. **Install Dependencies**: Run `bun install`.
4. **Make Changes**: Implement your feature or fix.
5. **Testing**: Ensure all tests pass by running `bun test`. Write new tests for new features.
6. **Linting & Formatting**: Run `bun run check` to ensure your code adheres to the Biome standards.
7. **Documentation**: Ensure all exported functions, classes, and types are documented using TSDoc.

## Pull Request Process

1. Ensure your code is fully tested and passes the CI pipeline.
2. Update the `CHANGELOG.md` with your changes under the `[Unreleased]` section.
3. Submit a Pull Request with a clear description of the problem and the solution.
4. A maintainer will review your PR. Please address any feedback promptly.

## Coding Standards

- **Strict TypeScript**: No `any` types allowed unless absolutely necessary and documented.
- **Schema-First**: All API inputs and outputs must be validated using TypeBox schemas.
- **Error Handling**: Use the specific error classes defined in `src/shared/errors.ts` (e.g., `NotFoundError`, `BadRequestError`). Do not throw generic `Error` objects.
- **Logging**: Use the Winston logger (`logger.info`, `logger.error`) instead of `console.log`.
