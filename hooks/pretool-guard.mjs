#!/usr/bin/env node

/**
 * Trendyol Integration Developer Tool — PreToolUse Safety Guard
 *
 * Guards against accidental production API calls by intercepting:
 * 1. Bash commands that contain the Trendyol production API URL
 * 2. Computer/browser tool use that navigates to production API URL
 *
 * Stage URL (allowed freely): https://stageapigw.trendyol.com
 * Production URL (requires confirmation): https://apigw.trendyol.com
 */

const PRODUCTION_URL = "https://apigw.trendyol.com";
const STAGE_URL = "https://stageapigw.trendyol.com";

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

        if (!reason || String(reason).trim().length === 0) {
            errors.push(
                "reason is required — explain why this production call is necessary."
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
 * Looks at bash commands, computer tool URLs, and any string fields in toolInput.
 */
function checkForProductionTarget(toolName, toolInput) {
    const lowerToolName = toolName.toLowerCase();

    // Bash tool — check command string for production URL
    if (lowerToolName.includes("bash") || lowerToolName.includes("shell") || lowerToolName.includes("execute")) {
        const command = String(toolInput.command || toolInput.cmd || toolInput.input || "");
        if (command.includes(PRODUCTION_URL)) {
            return true;
        }
    }

    // Computer/browser tool — check URL navigation
    if (lowerToolName.includes("computer") || lowerToolName.includes("browser") || lowerToolName.includes("navigate")) {
        const url = String(toolInput.url || toolInput.action || "");
        if (url.includes(PRODUCTION_URL)) {
            return true;
        }
    }

    // generateCurl with environment=production — warn before generating
    if (lowerToolName.includes("generatecurl") || lowerToolName.includes("generate_curl")) {
        const environment = String(toolInput.environment || "stage").toLowerCase();
        if (environment === "production") {
            return true;
        }
    }

    // Generic fallback — scan all string values in toolInput for production URL
    const inputStr = JSON.stringify(toolInput);
    if (inputStr.includes(PRODUCTION_URL)) {
        return true;
    }

    return false;
}

function allow() {
    process.stdout.write(JSON.stringify({ decision: "allow" }));
    process.exit(0);
}

function deny(message) {
    process.stdout.write(JSON.stringify({ decision: "deny", message }));
    process.exit(0);
}
