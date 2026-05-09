# Legal Information

## Developer / Maintainer

This plugin is developed and maintained by **Trendyol Group**.

- Website: https://www.trendyol.com
- Developer Portal: https://developers.trendyol.com
- GitHub: https://github.com/trendyol

---

## API Terms of Use

Use of the Trendyol Marketplace Product Integration APIs through this plugin is subject to Trendyol's Developer Terms of Service and API Usage Policy.

- Developer Portal: https://developers.trendyol.com
- API Application & Permissions: https://developers.trendyol.com/docs/marketplace-entegrasyon-bilgileri/basvuru-ve-izinler

By using this plugin, you agree to comply with all applicable Trendyol API terms. API access requires valid credentials (API Key, API Secret, Supplier ID) issued by Trendyol.

---

## Covered API Scope

This plugin provides tooling for the following Trendyol Marketplace API domains only:

- Trendyol Marketplace — Product Integration API (TR)
- Trendyol Marketplace — Product Integration V2 API (TR)
- Trendyol International Marketplace — Product Integration API

No other Trendyol API domains (Orders, Shipments, Finance, Claims, Questions & Answers, etc.) are in scope. This plugin does not interact with those APIs.

---

## Data Handling

This plugin does not collect, transmit, or store any user data.

Specifically:

- **API credentials** (API Key, API Secret, Supplier ID) are never read, stored, or transmitted by the plugin. They appear only in generated curl examples as placeholder values.
- **Request payloads** submitted for validation are processed locally by the MCP server running on the developer's own machine. No payload data leaves the local environment through this plugin.
- **API responses** are not intercepted or stored by the plugin.
- **No telemetry** is collected by this plugin.

---

## Liability

This plugin generates example payloads, curl commands, validation results, and implementation guides for development and testing purposes.

**The following are the sole responsibility of the integrating party:**

- Any requests sent to the Trendyol production API (`https://apigw.trendyol.com`) using credentials provided by the user
- Correctness and completeness of the final integration implementation
- Compliance with Trendyol's API terms and rate limits
- Data accuracy in submitted product listings

Trendyol provides this plugin as a developer productivity tool. It does not guarantee that generated code, payloads, or curl commands will be accepted by the Trendyol API without modification. Always validate on the stage environment (`https://stageapigw.trendyol.com`) before sending requests to production.

---

## Production Safety

The plugin includes a PreToolUse hook (`hooks/pretool-guard.mjs`) that blocks any tool call targeting the Trendyol production API URL (`https://apigw.trendyol.com`) unless the call includes explicit confirmation fields. This is a best-effort safety measure and does not replace proper testing, access control, or deployment review processes.

---

## Third-Party Components

This plugin depends on the following external components:

| Component | Purpose | License |
|---|---|---|
| Trendyol Developer Tools MCP Server | Local API contract server | Internal — Trendyol Group |
| Claude Code Plugin System | Plugin runtime | Anthropic Terms of Service |

No other third-party libraries are bundled in this plugin.

---

## License

Apache License 2.0

Copyright © Trendyol Group

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

---

## Contact

For questions about this plugin or the Trendyol Marketplace Product Integration APIs:

- Developer Support: https://developers.trendyol.com/docs/support-request
- GitHub Issues: https://github.com/trendyol/trendyol-integration-developer-tool/issues
