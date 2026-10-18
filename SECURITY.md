# Security Policy

ComfyMeal AI handles user accounts, pantry information, saved recipes, and other user-specific data. Reports of security issues are welcome so they can be investigated and addressed responsibly.

## Supported Versions

Security fixes are intended for the latest version on the `main` branch. Older commits and unofficial forks may not receive fixes.

| Version | Security updates |
| --- | --- |
| Latest `main` | Supported |
| Older versions | Not guaranteed |

## Reporting a Vulnerability

**Please do not report security vulnerabilities in public GitHub issues or discussions.** Use GitHub's private vulnerability reporting feature for this repository, if available. If private reporting is unavailable, contact the repository owner privately through a verified contact method listed on their GitHub profile.

When reporting an issue, include:
- A clear description of the potential vulnerability and its impact.
- Steps to reproduce it, with a minimal proof of concept where safe.
- Any affected files, endpoints, or configurations.
- Relevant logs or screenshots, after removing passwords, access tokens, personal information, and other secrets.

Do not access other people's data, disrupt the service, or publicly disclose the issue while it is being investigated.

## Response Process

The maintainer will review reports as soon as reasonably possible, may request additional details, and will communicate whether the report can be reproduced and how it will be addressed. Response and remediation timelines depend on severity and the information available; a fixed response time is not guaranteed.

Please allow reasonable time for investigation and a fix before publicly disclosing a confirmed vulnerability.

## Security Best Practices

- Never commit API keys, Supabase service-role keys, passwords, OTPs, or other secrets to the repository.
- Keep secrets for Supabase Edge Functions in Supabase's server-side environment settings.
- Apply database migrations and maintain appropriate row-level security policies.
- Restrict authentication and data access to the signed-in user's own records.
- Keep dependencies and deployment configuration up to date.
