# Security Policy

## Credentials

Do not commit credentials, tokens, private keys, certificates, `.env` files, provider configuration, or machine-local tool state. Use local files ignored by `.gitignore` and a secret manager appropriate for your environment.

Before each commit, run:

```sh
scripts/check-secrets.sh
```

The check requires [gitleaks](https://github.com/gitleaks/gitleaks). Install it through your operating system's package manager or from its verified upstream release before running the script. It is deliberately not installed automatically.

## Reporting a vulnerability

Report vulnerabilities through the repository's private GitHub security advisory feature. Do not include exploitable details or credentials in a public issue.
