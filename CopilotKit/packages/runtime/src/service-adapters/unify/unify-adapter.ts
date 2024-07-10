/**
 * CopilotKit Adapter for Unify
 *
 * <RequestExample>
 * ```jsx CopilotRuntime Example
 * const copilotKit = new CopilotRuntime();
 * return copilotKit.response(req, new UnifyAdapter());
 * ```
 * </RequestExample>
 *
 * You can easily set the model to use by passing it to the constructor.
 * ```jsx
 * const copilotKit = new CopilotRuntime();
 * return copilotKit.response(
 *   req,
 *   new UnifyAdapter({ model: "llama-3-8b-chat@fireworks-ai" }),
 * );
 * ```
 */
import { TextMessage } from "../../graphql/types/converted";
import {
  CopilotRuntimeChatCompletionRequest,
  CopilotRuntimeChatCompletionResponse,
  CopilotServiceAdapter,
} from "../service-adapter";
import OpenAI from "openai";
import { randomId } from "@copilotkit/shared";
import { convertActionInputToOpenAITool, convertMessageToOpenAIMessage } from "../openai/utils";

export interface UnifyAdapterParams {
  apiKey?: string;
  model: string;
}

export class UnifyAdapter implements CopilotServiceAdapter {
  private apiKey: string;
  private model: string;

  constructor(options?: UnifyAdapterParams) {
    if (options?.apiKey) {
      this.apiKey = options.apiKey;
    } else {
      this.apiKey = "UNIFY_API_KEY";
    }
    this.model = options?.model;
  }

  async process(
    request: CopilotRuntimeChatCompletionRequest,
  ): Promise<CopilotRuntimeChatCompletionResponse> {
    const tools = request.actions.map(convertActionInputToOpenAITool);
    const openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://api.unify.ai/v0/",
    });

    const messages = request.messages.map(convertMessageToOpenAIMessage);

    const _stream = await openai.chat.completions.create({
      model: this.model,
      messages: messages,
      stream: true,
      ...(tools.length > 0 && { tools }),
    });

    request.eventSource.stream(async (eventStream$) => {
      let mode: "function" | "message" | null = null;
      for await (const chunk of _stream) {
        const toolCall = chunk.choices[0].delta?.tool_calls[0];
        const content = chunk.choices[0].delta?.content;

        // When switching from message to function or vice versa,
        // send the respective end event.
        // If toolCall?.id is defined, it means a new tool call starts.
        if (mode === "message" && toolCall?.id) {
          mode = null;
          eventStream$.sendTextMessageEnd();
        } else if (mode === "function" && (toolCall === undefined || toolCall?.id)) {
          mode = null;
          eventStream$.sendActionExecutionEnd();
        }

        // If we send a new message type, send the appropriate start event.
        if (mode === null) {
          if (toolCall?.id) {
            mode = "function";
            eventStream$.sendActionExecutionStart(toolCall!.id, toolCall!.function!.name);
          } else if (content) {
            mode = "message";
            eventStream$.sendTextMessageStart(chunk.id);
          }
        }

        // send the content events
        if (mode === "message" && content) {
          eventStream$.sendTextMessageContent(content);
        } else if (mode === "function" && toolCall?.function?.arguments) {
          eventStream$.sendActionExecutionArgs(toolCall.function.arguments);
        }
      }

      // send the end events
      if (mode === "message") {
        eventStream$.sendTextMessageEnd();
      } else if (mode === "function") {
        eventStream$.sendActionExecutionEnd();
      }

      eventStream$.complete();
    });
    return {
      threadId: request.threadId || randomId(),
    };
  }
}
