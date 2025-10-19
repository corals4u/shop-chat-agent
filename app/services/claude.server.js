/**
 * Claude-compatible shim powered by OpenAI
 * Keeps createClaudeService(...) and streamConversation(...) so chat.jsx works unchanged.
 */

import OpenAI from "openai";
import AppConfig from "./config.server";
import systemPrompts from "../prompts/prompts.json";

export function createClaudeService(apiKey = process.env.OPENAI_API_KEY) {
  const openai = new OpenAI({ apiKey });

  const getSystemPrompt = (promptType) =>
    systemPrompts.systemPrompts?.[promptType]?.content ||
    systemPrompts.systemPrompts?.[AppConfig.api.defaultPromptType]?.content ||
    "You are a helpful assistant.";

  /**
   * Streams a conversation with OpenAI but preserves Claude-like interface.
   * Calls handlers.onText for chunks, handlers.onMessage at end,
   * and returns { stop_reason: "end_turn" } so chat.jsx's while-loop exits.
   */
  const streamConversation = async (
    { messages, promptType = AppConfig.api.defaultPromptType /*, tools*/ },
    handlers = {}
  ) => {
    const systemInstruction = getSystemPrompt(promptType);

    // Normalize messages: DB may store JSON strings; OpenAI expects strings.
    const normalized = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

    const chatMessages = [
      { role: "system", content: systemInstruction },
      ...normalized,
    ];

    let full = "";

    const stream = await openai.chat.completions.create({
      model: AppConfig.api.defaultModel || "gpt-4o-mini",
      messages: chatMessages,
      stream: true,
      max_tokens: AppConfig.api.maxTokens || undefined,
      // TODO (Phase 2): map MCP tools to OpenAI tool-calling and surface handlers.onToolUse(...)
    });

    for await (const chunk of stream) {
      const delta = chunk?.choices?.[0]?.delta?.content || "";
      if (delta) {
        full += delta;
        handlers.onText?.(delta);
      }
    }

    const finalMessage = {
      role: "assistant",
      content: full,
      stop_reason: "end_turn", // CRITICAL for breaking the while loop in chat.jsx
    };

    handlers.onMessage?.(finalMessage);
    return finalMessage;
  };

  return { streamConversation, getSystemPrompt };
}

export default { createClaudeService };

