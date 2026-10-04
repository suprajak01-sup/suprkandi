# Security Policy

## Reporting a Vulnerability

Do not report suspected security vulnerabilities in public GitHub issues.

Use GitHub private vulnerability reporting / Security Advisories when enabled.

Include the SuprKandi version, Node.js version, OS, affected component, reproduction steps, expected behavior, actual behavior, and potential impact.

Never include real credentials, API keys, tokens, or production database connection strings.

## Security Guidance

- Treat workspace files as executable automation input.
- Only run workspace files from trusted sources.
- Use environment variables or an approved secrets manager for credentials.
- Run desktop/RPA workflows with the minimum OS privileges required.
