import {
  ActionExecutionMessageInput,
  ResultMessageInput,
  TextMessageInput,
  AgentStateMessageInput,
} from "../../inputs/message.input";
import { BaseMessage } from "../base";
import { ActionExecutionScope, MessageRole } from "../enums";

export class TextMessage extends BaseMessage implements TextMessageInput {
  content: string;
  role: MessageRole;
}

export type Message = BaseMessage;

export class ActionExecutionMessage
  extends BaseMessage
  implements Omit<ActionExecutionMessageInput, "arguments">
{
  name: string;
  arguments: Record<string, any>;
  scope: ActionExecutionScope;
}

export class ResultMessage extends BaseMessage implements ResultMessageInput {
  actionExecutionId: string;
  actionName: string;
  result: string;
}

export class AgentStateMessage
  extends BaseMessage
  implements Omit<AgentStateMessageInput, "state">
{
  threadId: string;
  agentName: string;
  nodeName: string;
  role: MessageRole;
  state: any;
  running: boolean;
}
