/**
 * OpenAI Service (Replacement for Claude)
 * Handles chat streaming with OpenAI's GPT models.
 */

import OpenAI from "openai";
import AppConfig from "./config.server";
import systemPrompts from "../prompts/prompts.json";

/**
 * Creates an OpenAI service instance
 * @param {string} apiKey - OpenAI API key
 * @returns {Object} Service with methods for interacting with OpenAI
 */
export function createOpenAIService(apiKey = process.env.OPENAI_API_KEY) {
  const openai = new OpenAI({ apiKey });

  /**
   * Streams a conversation with OpenAI
   * @param {Object} params - Stream parameters
   * @param {Array} params.messages - Conversation history
   * @param {string} params.promptType - The type of system prompt to use
   * @param {Array} params.tools - Available tools for OpenAI
   * @param {Object} streamHandlers - Stream event handlers
   * @param {Function} streamHandlers.onText - Handles text chunks
   * @param {Function} streamHandlers.onMessage - Handles complete messages
   * @param {Function} streamHandlers.onToolUse - Handles tool use requests
   * @returns {Promise<Object>} The final message
   */
  const streamConversation = async (
    { messages, promptType = AppConfig.api.defaultPromptType, tools },
    streamHandlers
  ) => {
    // Get system prompt
    const systemInstruction = getSystemPrompt(promptType);

    // Build conversation
    const conversation = [
      { role: "system", content: systemInstruction },
      ...messages,
    ];

    // Create stream
    const stream = await openai.chat.completions.create({
      model: AppConfig.api.defaultModel || "gpt-4o-mini",
      messages: conversation,
      stream: true,
    });

    // Handle streamed data
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";

      if (delta && streamHandlers.onText) {
        streamHandlers.onText(delta);
      }
    }

    // Return final message
    const finalMessage = {
      role: "assistant",
      content: "Stream complete",
    };

    if (streamHandlers.onMessage) {
      streamHandlers.onMessage(finalMessage);
    }

    return finalMessage;
  };

  /**
   * Gets the system prompt content for a given prompt type
   * @param {string} promptType - The prompt type to retrieve
   * @returns {string} The system prompt content
   */
  const getSystemPrompt = (promptType) => {
    return (
      systemPrompts.systemPrompts[promptType]?.content ||
      systemPrompts.systemPrompts[AppConfig.api.defaultPromptType].content
    );
  };

  return {
    streamConversation,
    getSystemPrompt,
  };
}

export default {
  createOpenAIService,
};
