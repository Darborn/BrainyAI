import type { ChatError } from "~utils/errors";

export type ConversationResponseCb = (
    rid: string,
    m: ConversationResponse
) => void;

export class ConversationResponse {
    conversation_id?: string;
    message_id?: string;
    message_text?: string;
    title?: string;
    message_type: ResponseMessageType;
    error?: ChatError;
    appendix?: any;

    constructor({
        conversation_id,
        message_id,
        message_text,
        message_type,
        title,
        error
    }: {
        conversation_id?: string;
        parent_message_id?: string;
        message_id?: string;
        message_text?: string;
        message_type: ResponseMessageType;
        title?: string;
        error?: ChatError;
    }) {
        this.conversation_id = conversation_id;
        this.message_id = message_id;
        this.message_text = message_text;
        this.message_type = message_type;
        this.error = error;
        this.title = title;
    }
}

export enum ResponseMessageType {
    DONE = "done",
    GENERATING = "generating",
    TITLED = "titled",
    ERROR = "error",
    ERROR_RETRY_MESSAGE = "error_retry_message",
    ERROR_NEED_NEW_CONVERSATION = "error_need_new_conversation"
}

export interface BotConstructorParams {
    globalConversationId: string;
    parentMessageId?: string;
}

export interface BotCompletionParams {
    prompt: string;
    rid: string;
    cb: ConversationResponseCb;
    fileRef?: string;
    file?: File;
    forceRefresh?: boolean;
}

export interface IBot {
    conversationId: string;
    completion(params: BotCompletionParams): Promise<void>;
    getBotName(): string;
    getRequireLogin(): boolean;
    getLogoSrc(): string;
    getLoginUrl(): string;
    getSupportUploadPDF(): boolean;
    getSupportUploadImage(): boolean;
    getMaxTokenLimit(): number;
    getPaidModel(): boolean;
    getNewModel(): boolean;
}
