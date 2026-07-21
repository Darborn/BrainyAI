import { Storage } from "@plasmohq/storage";

import { FileTypes } from "~options/constant/FileTypes";
import {
    MESSAGE_ACTION_OPEN_PANEL,
    STORAGE_OPEN_PANEL_INIT_DATA
} from "~utils";
import { Logger } from "~utils/logger";

export enum PromptTemplate {
    JUST_OPEN = "JUST_OPEN",
    DEFAULT = "DEFAULT",
    RELATED_QUESTIONS = "RELATED_QUESTIONS",
    ASK_AI = "ASK_AI",
    EXPLAIN = "Explain",
    TRANSLATE = "Translate",
    SUMMARY = "Summarize",
    REPHRASE = "Rephrase",
    GAMMA_CHECK = "Gamma_check"
}

export class IAskAi {
    appendix?: string;
    prompt: string;
    promptText?: string | null;
    lang: string;
    text?: string | null;
    promptImageUri?: string | null;
    promptImageTitle?: string | null;
    promptType?: number;
    uploadFile?:
        [string, string, Map<string, string>, FileTypes, File | null] | null;
    isHaveUploadFile?: boolean;

    constructor({
        appendix,
        prompt,
        promptText = null,
        lang,
        text = null,
        promptImageUri = null,
        promptImageTitle = null,
        promptType = 1,
        uploadFile = null,
        isHaveUploadFile = false
    }: {
        appendix?: string;
        prompt: string;
        promptText?: string | null;
        lang?: string;
        text?: string | null;
        promptImageUri?: string | null;
        promptImageTitle?: string | null;
        promptType?: number;
        uploadFile?:
            | [string, string, Map<string, string>, FileTypes, File | null]
            | null;
        isHaveUploadFile?: boolean;
    }) {
        this.prompt = prompt;
        this.promptText = promptText;
        this.lang = lang || "en";
        this.text = text;
        this.appendix = appendix;
        this.promptImageUri = promptImageUri;
        this.promptImageTitle = promptImageTitle;
        this.promptType = promptType;
        this.uploadFile = uploadFile;
        this.isHaveUploadFile = isHaveUploadFile;
    }
}

export enum OpenPanelType {
    SEARCH = "search",
    AI_ASK = "ai_ask"
}

export interface IOpenPanelData {
    openType: OpenPanelType;
    data: IAskAi | string;
}

const openPanel = function (openType: OpenPanelType, data: IAskAi | string) {
    const storage = new Storage();
    void storage
        .set(STORAGE_OPEN_PANEL_INIT_DATA, {
            openType,
            data
        } as IOpenPanelData)
        .then(() => {
            void chrome.runtime.sendMessage({
                action: MESSAGE_ACTION_OPEN_PANEL,
                data
            });
        });
};

export const openPanelAskAi = function (askAi: IAskAi) {
    Logger.log("openPanelAskAi", JSON.stringify(askAi));
    openPanel(OpenPanelType.AI_ASK, askAi);
};

export const openPanelSearchInContent = function (text: string) {
    Logger.log(`openPanelSearchInContent: ${text}`);
    openPanel(OpenPanelType.SEARCH, text);
};

export const justOpenPanel = function () {
    void chrome.runtime.sendMessage({ action: MESSAGE_ACTION_OPEN_PANEL });
};
