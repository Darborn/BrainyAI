import React, { createContext, useEffect, useRef, useState } from "react";

import { Storage } from "@plasmohq/storage";

import { BotBase } from "~libs/chatbot/BotBase";
import { DeepSeekBot } from "~libs/chatbot/deepseek";
import type { IBot } from "~libs/chatbot/IBot";
import { getLatestState } from "~utils";
import type { ChatError } from "~utils/errors";
import { Logger } from "~utils/logger";

export interface BotClass {
    new (...args: any[]): IBot;
    botName: string;
    logoSrc: string;
    loginUrl: string;
    requireLogin: boolean;
    supportUploadPDF: boolean;
    supportUploadImage: boolean;
    maxTokenLimit: number;
    paidModel: boolean;
    newModel: boolean;
    checkIsLogin(): Promise<[ChatError | null, boolean]>;
}

export type M = BotClass;
export type Ms = BotClass[];

interface IModelManagementProvider {
    currentBots: BotClass[];
    setCurrentBots: React.Dispatch<React.SetStateAction<BotClass[]>>;
    allModels: React.MutableRefObject<BotClass[]>;
    categoryModels: React.MutableRefObject<
        { label: string; models: BotClass[] }[]
    >;
    saveCurrentBotsKeyLocal: () => void;
}

export const ModelManagementContext = createContext(
    {} as IModelManagementProvider
);

export default function ModelManagementProvider({
    children
}: {
    children: React.ReactNode;
}) {
    const defaultModels: BotClass[] = [DeepSeekBot];
    const [currentBots, setCurrentBots] = useState<BotClass[]>(defaultModels);
    const allModels = useRef<BotClass[]>([DeepSeekBot]);
    const storage = new Storage();
    const [isLoaded, setIsLoaded] = useState(false);
    const categoryModels = useRef<{ label: string; models: BotClass[] }[]>([
        { label: "DeepSeek", models: [DeepSeekBot] }
    ]);

    const handleModelStorge = async () => {
        try {
            const value = await storage.get<string[]>("currentModelsKey");
            const arr: BotClass[] = [];
            if (value && value.length) {
                value.forEach((ele) => {
                    allModels.current.forEach((item) => {
                        if (item.botName === ele) {
                            arr.push(item);
                        }
                    });
                });
                if (arr.length) {
                    setCurrentBots(arr);
                } else {
                    setCurrentBots(defaultModels);
                }
            }
        } catch {
            // ignore
        } finally {
            setIsLoaded(true);
        }
    };

    useEffect(() => {
        void handleModelStorge();
    }, []);

    const saveCurrentBotsKeyLocal = async () => {
        const cbots = await getLatestState(setCurrentBots);
        void storage.set(
            "currentModelsKey",
            cbots.map((m) => m.botName)
        );
    };

    return (
        <ModelManagementContext.Provider
            value={{
                currentBots,
                allModels,
                categoryModels,
                setCurrentBots,
                saveCurrentBotsKeyLocal
            }}>
            {isLoaded && children}
        </ModelManagementContext.Provider>
    );
}
