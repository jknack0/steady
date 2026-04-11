/**
 * AWS Bedrock client for Anthropic Claude.
 *
 * Uses @anthropic-ai/bedrock-sdk which mirrors the @anthropic-ai/sdk API
 * but authenticates via AWS IAM (EC2 instance role, env vars, or
 * ~/.aws/credentials) instead of an ANTHROPIC_API_KEY.
 *
 * Model selection is tiered:
 *  - Haiku 4.5 for fast/cheap structured tasks (formatting, JSON gen)
 *  - Sonnet 4.5 for clinical/high-stakes content (therapy session notes)
 *
 * All models are called via US inference profiles (HIPAA-friendly
 * regional routing across us-east-1/us-east-2/us-west-2).
 */

import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";

/**
 * Per-use-case model selection. Swap individual lines here to upgrade
 * a specific use case without hunting through call sites.
 */
export const MODELS = {
  /** Content formatting: raw clinician notes → styled HTML */
  styling: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  /** Daily tracker config generation (simple structured JSON) */
  tracker: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  /** Program part content generation (moderately complex structured JSON) */
  part: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  /** PDF homework worksheet parsing (visual + structured JSON) */
  pdf: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  /** Clinical session summary from transcripts — HIGH STAKES, keep Sonnet */
  clinical: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
} as const;

let _client: AnthropicBedrock | null = null;

/**
 * Lazily instantiate the Bedrock client. Credentials come from the
 * AWS SDK default credential chain (instance role on EC2, env vars
 * locally). Region defaults to us-east-2 to match the rest of the
 * infrastructure.
 */
export function getBedrockClient(): AnthropicBedrock {
  if (!_client) {
    _client = new AnthropicBedrock({
      awsRegion: process.env.AWS_REGION || "us-east-2",
    });
  }
  return _client;
}
