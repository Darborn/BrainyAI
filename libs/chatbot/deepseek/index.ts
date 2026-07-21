import { BotBase } from "~libs/chatbot/BotBase";
import { getDeepSeekApiKey } from "~libs/chatbot/deepseek/config";
import {
    ConversationResponse,
    ResponseMessageType,
    type BotCompletionParams,
    type BotConstructorParams,
    type IBot
} from "~libs/chatbot/IBot";
import { createUuid } from "~utils";
import { ChatError, ErrorCode } from "~utils/errors";

export class DeepSeekBot extends BotBase implements IBot {
    static botName = "DeepSeek";
    static logoSrc = "";
    static loginUrl = "";
    static requireLogin = false;
    static supportUploadPDF = false;
    static supportUploadImage = false;
    static maxTokenLimit = 65536;
    static paidModel = true;
    static newModel = true;
    static desc = "DeepSeek Chat — API-based, no website login needed";

    conversationId: string;

    constructor(params: BotConstructorParams) {
        super(params);
        this.conversationId = params.globalConversationId;
    }

    static async checkIsLogin(): Promise<[ChatError | null, boolean]> {
        const key = await getDeepSeekApiKey();
        return [null, !!key];
    }

    async completion({ prompt, rid, cb }: BotCompletionParams): Promise<void> {
        const apiKey = await getDeepSeekApiKey();
        if (!apiKey) {
            cb(
                rid,
                new ConversationResponse({
                    message_type: ResponseMessageType.ERROR,
                    error: new ChatError(ErrorCode.UNAUTHORIZED)
                })
            );
            return;
        }

        let response: Response;
        try {
            response = await fetch(
                "https://api.deepseek.com/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "deepseek-chat",
                        messages: [{ role: "user", content: prompt }],
                        stream: true
                    })
                }
            );
        } catch {
            cb(
                rid,
                new ConversationResponse({
                    message_type: ResponseMessageType.ERROR,
                    error: new ChatError(ErrorCode.NETWORK_ERROR)
                })
            );
            return;
        }

        if (!response.ok) {
            cb(
                rid,
                new ConversationResponse({
                    message_type: ResponseMessageType.ERROR,
                    error: new ChatError(
                        ErrorCode.MODEL_INTERNAL_ERROR,
                        `HTTP ${response.status}`
                    )
                })
            );
            return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data: ")) continue;
                    const data = trimmed.slice(6);
                    if (data === "[DONE]") {
                        cb(
                            rid,
                            new ConversationResponse({
                                message_type: ResponseMessageType.DONE,
                                message_text: fullText,
                                message_id: createUuid()
                            })
                        );
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullText += delta;
                            cb(
                                rid,
                                new ConversationResponse({
                                    message_type:
                                        ResponseMessageType.GENERATING,
                                    message_text: delta
                                })
                            );
                        }
                    } catch {
                        // skip malformed SSE chunks
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        cb(
            rid,
            new ConversationResponse({
                message_type: ResponseMessageType.DONE,
                message_text: fullText,
                message_id: createUuid()
            })
        );
    }

    getBotName(): string {
        return DeepSeekBot.botName;
    }
    getLoginUrl(): string {
        return DeepSeekBot.loginUrl;
    }
    getLogoSrc(): string {
        return DeepSeekBot.logoSrc;
    }
    getRequireLogin(): boolean {
        return DeepSeekBot.requireLogin;
    }
    getSupportUploadImage(): boolean {
        return DeepSeekBot.supportUploadImage;
    }
    getSupportUploadPDF(): boolean {
        return DeepSeekBot.supportUploadPDF;
    }
    getMaxTokenLimit(): number {
        return DeepSeekBot.maxTokenLimit;
    }
    getPaidModel(): boolean {
        return DeepSeekBot.paidModel;
    }
    getNewModel(): boolean {
        return DeepSeekBot.newModel;
    }
}
