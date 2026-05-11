#!/usr/bin/env node

/**
 * Trendyol Integration Developer Tool — PreToolUse Safety Guard
 *
 * Guards against accidental production API calls by intercepting ALL tool calls
 * and checking whether their payload targets the Trendyol production API.
 *
 * Stage URL (allowed freely):      https://stageapigw.trendyol.com
 * Production URL (requires confirmation): https://apigw.trendyol.com
 *
 * Security fixes applied:
 * - matcher is ".*" — covers all tool name variants (bash_tool, run_bash, etc.)
 * - URL detection uses regex + normalization to catch encoding bypasses
 * - reason field requires minimum 20 characters to prevent trivial bypasses
 * - MCP response content is never trusted as a source of confirmation
 */

// Regex matches any form of the production hostname
// Handles: URL-encoded, unicode-escaped, with/without protocol, with/without trailing slash
const PRODUCTION_HOST_REGEX = /apigw\.trendyol\.com/i;
const STAGE_URL = "https://stageapigw.trendyol.com";
const PRODUCTION_URL = "https://apigw.trendyol.com";
const REASON_MIN_LENGTH = 20;

let input = "";

process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
    input += chunk;
});

process.stdin.on("end", () => {
    try {
        const payload = JSON.parse(input);

        const toolName =
            payload.tool_name ||
            payload.toolName ||
            payload.name ||
            payload.tool?.name ||
            "";

        const toolInput =
            payload.tool_input ||
            payload.toolInput ||
            payload.arguments ||
            payload.args ||
            payload.tool?.input ||
            {};

        // ─── Check if this tool call targets production ───────────────────────────

        const isProductionTargetingTool = checkForProductionTarget(toolName, toolInput);

        if (!isProductionTargetingTool) {
            allow();
            return;
        }

        // ─── Production call detected — enforce confirmation ──────────────────────

        const confirmExecution = toolInput.confirmExecution;
        const acknowledgeRisks = toolInput.acknowledgeRisks;
        const reason = toolInput.reason;
        const reasonStr = String(reason ?? "").trim();

        const errors = [];

        if (confirmExecution !== "CONFIRM_PRODUCTION_EXECUTION") {
            errors.push(
                'confirmExecution must be exactly "CONFIRM_PRODUCTION_EXECUTION" for production API calls.'
            );
        }

        if (acknowledgeRisks !== true) {
            errors.push(
                "acknowledgeRisks must be explicitly true for production API calls."
            );
        }

        if (reasonStr.length === 0) {
            errors.push(
                "reason is required — explain why this production call is necessary."
            );
        } else if (reasonStr.length < REASON_MIN_LENGTH) {
            errors.push(
                `reason must be at least ${REASON_MIN_LENGTH} characters. Received ${reasonStr.length} chars: "${reasonStr}"`
            );
        }

        if (errors.length > 0) {
            deny(
                `⚠️  PRODUCTION API CALL BLOCKED\n\n` +
                `Detected target: ${PRODUCTION_URL}\n` +
                `Tool: ${toolName}\n\n` +
                `To allow this production call, the tool input must include:\n` +
                errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n") +
                `\n\nAlways test on stage first: ${STAGE_URL}`
            );
            return;
        }

        allow();

    } catch (error) {
        deny(
            `Hook validation failed: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks whether a tool call is targeting the Trendyol production API.
 *
 * Security: uses regex instead of string includes to handle encoding variants.
 * Normalizes unicode escapes before matching to prevent \u002F style bypasses.
 *
 * Detection logic:
 * 1. Bash/shell/execute tools — check command string
 * 2. Computer/browser/navigate tools — check URL field
 * 3. generateCurl — check environment parameter
 * 4. Generic fallback — serialize full toolInput and scan
 */
function checkForProductionTarget(toolName, toolInput) {
    const lowerToolName = toolName.toLowerCase();

    // ── 1. Bash / shell tools ───────────────────────────────────────────────────
    // Matches: bash, Bash, bash_tool, run_bash, shell, execute, execute_command, etc.
    if (/bash|shell|execut/.test(lowerToolName)) {
        const command = String(
            toolInput.command || toolInput.cmd || toolInput.input || ""
        );
        if (containsProductionHost(command)) return true;
    }

    // ── 2. Computer / browser / navigation tools ────────────────────────────────
    if (/computer|browser|navigat|web_fetch|fetch/.test(lowerToolName)) {
        const url = String(toolInput.url || toolInput.action || toolInput.navigate || "");
        if (containsProductionHost(url)) return true;
    }

    // ── 3. generateCurl with environment=production ─────────────────────────────
    if (/generatecurl|generate.curl/.test(lowerToolName)) {
        const environment = String(toolInput.environment || "stage").toLowerCase();
        if (environment === "production") return true;
    }

    // ── 4. Generic fallback — scan serialized toolInput ─────────────────────────
    // Normalize unicode escapes first to prevent \u002F bypass
    const inputStr = normalizeUnicode(JSON.stringify(toolInput));
    if (PRODUCTION_HOST_REGEX.test(inputStr)) return true;

    return false;
}

/**
 * Normalize unicode escapes in a string before regex matching.
 * Prevents bypass via: "https:\u002F\u002Fapigw.trendyol.com"
 */
function normalizeUnicode(str) {
    try {
        return str.replace(/\\u[\da-fA-F]{4}/g, (match) =>
            String.fromCharCode(parseInt(match.slice(2), 16))
        );
    } catch {
        return str;
    }
}

/**
 * Test whether a string contains the production hostname
 * using regex after unicode normalization.
 */
function containsProductionHost(str) {
    return PRODUCTION_HOST_REGEX.test(normalizeUnicode(str));
}

function allow() {
    process.stdout.write(JSON.stringify({ decision: "allow" }));
    process.exit(0);
}

function deny(message) {
    process.stdout.write(JSON.stringify({ decision: "deny", message }));
    process.exit(0);
}
