import { type LanguageModelV3Prompt } from '@ai-sdk/provider';
import { type LanguageModelMiddleware } from 'ai';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mistral error code 3230: "Duplicate tool call id in assistant message".
 *
 * This happens in two distinct scenarios:
 *
 * 1. REQUEST side (multi-turn history): Mistral validates that no tool call ID
 *    appears in more than one assistant message in the entire conversation.
 *    When `streamText` runs multiple agentic steps (e.g. step 1 calls tool A,
 *    step 2 calls tool B), Mistral's sequential IDs ("0", "1") reset per step,
 *    so step 2's "0" collides with step 1's "0" in the accumulated history.
 *    We fix this in `transformParams` by scanning the outgoing prompt for any
 *    assistant messages that share a tool call ID and rewriting duplicates to
 *    fresh UUIDs — keeping the matching tool-result messages in sync.
 *
 * 2. RESPONSE side (stream): Mistral's streaming SDK emits `tool-input-start`,
 *    `tool-input-delta`, `tool-input-end`, and `tool-call` events for each
 *    chunk — but with the *original* Mistral ID. We replace every emitted ID
 *    with a UUID in `wrapStream` so the AI SDK stores unique IDs, preventing
 *    future collisions in the message history.
 */
export const deduplicateMistralToolCallIdsMiddleware: LanguageModelMiddleware =
  {
    specificationVersion: 'v3',

    // ── 1. Fix the OUTGOING prompt ──────────────────────────────────────────
    transformParams: async ({ params }) => ({
      ...params,
      prompt: deduplicatePromptToolCallIds(params.prompt),
    }),

    // ── 2. Fix the INCOMING stream ──────────────────────────────────────────
    wrapStream: async ({ doStream }) => {
      const { stream, ...rest } = await doStream();

      const idMap = new Map<string, string>();

      const remap = (originalId: string): string => {
        let newId = idMap.get(originalId);

        if (!newId) {
          newId = uuidv4();
          idMap.set(originalId, newId);
        }

        return newId;
      };

      const rewrittenStream = stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            switch (chunk.type) {
              case 'tool-input-start':
                controller.enqueue({ ...chunk, id: remap(chunk.id) });
                break;
              case 'tool-input-delta':
                controller.enqueue({ ...chunk, id: remap(chunk.id) });
                break;
              case 'tool-input-end':
                controller.enqueue({ ...chunk, id: remap(chunk.id) });
                break;
              case 'tool-call':
                controller.enqueue({
                  ...chunk,
                  toolCallId: remap(chunk.toolCallId),
                });
                break;
              default:
                controller.enqueue(chunk);
            }
          },
        }),
      );

      return { stream: rewrittenStream, ...rest };
    },
  };

/**
 * Scan the prompt for assistant messages that share a tool call ID with any
 * earlier assistant message. For each duplicate, assign a fresh UUID and
 * update the immediately-following tool-result messages to match.
 *
 * Mistral validates uniqueness GLOBALLY across all assistant messages in the
 * conversation, so one pass collecting all seen IDs is sufficient.
 */
function deduplicatePromptToolCallIds(
  prompt: LanguageModelV3Prompt,
): LanguageModelV3Prompt {
  const seenToolCallIds = new Set<string>();
  const result: LanguageModelV3Prompt = [];

  for (let i = 0; i < prompt.length; i++) {
    const message = prompt[i];

    if (message.role !== 'assistant') {
      result.push(message);
      continue;
    }

    const content = message.content;

    if (typeof content === 'string') {
      result.push(message);
      continue;
    }

    // Build a remapping for any IDs we've already seen
    const remapInThisMessage = new Map<string, string>();

    for (const part of content) {
      if (part.type === 'tool-call') {
        if (seenToolCallIds.has(part.toolCallId)) {
          remapInThisMessage.set(part.toolCallId, uuidv4());
        }
      }
    }

    if (remapInThisMessage.size === 0) {
      // No duplicates — record IDs as seen and pass through unchanged
      for (const part of content) {
        if (part.type === 'tool-call') {
          seenToolCallIds.add(part.toolCallId);
        }
      }
      result.push(message);
      continue;
    }

    // Rewrite the assistant message with the new IDs
    const rewrittenContent = content.map((part) => {
      if (part.type === 'tool-call') {
        const newId = remapInThisMessage.get(part.toolCallId);

        if (newId) {
          return { ...part, toolCallId: newId };
        }
      }

      return part;
    });

    // Record the (possibly rewritten) IDs as seen
    for (const part of rewrittenContent) {
      if (part.type === 'tool-call') {
        seenToolCallIds.add(part.toolCallId);
      }
    }

    result.push({ ...message, content: rewrittenContent });

    // Also patch the immediately-following tool message(s) to keep IDs in sync
    let j = i + 1;

    while (j < prompt.length && prompt[j].role === 'tool') {
      const toolMessage = prompt[j];
      const toolContent = Array.isArray(toolMessage.content)
        ? toolMessage.content
        : [];

      const rewrittenToolContent = toolContent.map((part) => {
        if (part.type === 'tool-result') {
          const newId = remapInThisMessage.get(part.toolCallId);

          if (newId) {
            return { ...part, toolCallId: newId };
          }
        }

        return part;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.push({ ...toolMessage, content: rewrittenToolContent } as any);
      i = j;
      j++;
    }
  }

  return result;
}
