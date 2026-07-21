const STORAGE_KEY = "deepseek_api_key";

export async function getDeepSeekApiKey(): Promise<string | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] ?? null;
}

export async function setDeepSeekApiKey(key: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: key });
}
