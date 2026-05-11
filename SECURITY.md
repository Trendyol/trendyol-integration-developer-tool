# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x | ✅ Active |

---

## Reporting a Vulnerability

If you discover a security vulnerability in this plugin, **do not open a public GitHub issue.**

Please report it privately:

**Email:** appsec@trendyol.com
**Subject:** `[SECURITY] trendyol-integration-developer-tool — <brief description>`

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

We will acknowledge receipt within **48 hours** and provide a resolution timeline within **7 business days**.

---

## Scope

This security policy covers the Claude Code plugin itself:

- `hooks/pretool-guard.mjs` — PreToolUse hook script
- `skills/` — SKILL.md and reference files
- `.mcp.json` — MCP server connection configuration
- `.claude-plugin/plugin.json` — plugin manifest

**Out of scope:**
- The Trendyol Developer Tools MCP server (separate repository)
- The Trendyol Marketplace APIs themselves
- Vulnerabilities in Claude Code or the Anthropic platform

For API security issues, contact [Trendyol Developer Support](https://developers.trendyol.com/docs/support-request).

---

## Security Design

### PreToolUse Hook

The `hooks/pretool-guard.mjs` script intercepts tool calls targeting the Trendyol production API URL (`https://apigw.trendyol.com`). It blocks execution unless all three confirmation fields are present:

- `confirmExecution: "CONFIRM_PRODUCTION_EXECUTION"`
- `acknowledgeRisks: true`
- `reason: <non-empty string>`

This is a best-effort safety mechanism. It does not replace proper access control, credential management, or deployment review processes.

### Credential Handling

This plugin does not handle, store, or transmit API credentials. Generated curl commands use placeholder values (`<BASE64_API_KEY_SECRET>`, `<SUPPLIER_ID>`). Credentials are the sole responsibility of the integrating party.

### MCP Connection

The plugin connects to the Trendyol Developer Tools MCP server over HTTPS. The connection is read-only for planning, validation, and code generation purposes. The plugin does not write to or modify any Trendyol API data directly.

---

## Disclosure Policy

We follow responsible disclosure. After a fix is released, we will:

1. Publish a security advisory on GitHub
2. Credit the reporter (unless they prefer to remain anonymous)
3. Update this document if the scope or policy changes
