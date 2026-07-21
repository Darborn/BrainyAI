import { Button, Input, message } from "antd";
import React, { useEffect, useState } from "react";

import {
    getDeepSeekApiKey,
    setDeepSeekApiKey
} from "~libs/chatbot/deepseek/config";

export default function ApiKeySettings() {
    const [apiKey, setApiKey] = useState("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getDeepSeekApiKey().then((key) => {
            if (key) setApiKey(key);
        });
    }, []);

    async function handleSave() {
        await setDeepSeekApiKey(apiKey.trim());
        setSaved(true);
        void message.success("API Key saved");
    }

    return (
        <div style={{ padding: "24px 56px" }}>
            <h2
                style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 16,
                    color: "#333"
                }}>
                API Key Settings
            </h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Input.Password
                    value={apiKey}
                    onChange={(e) => {
                        setApiKey(e.target.value);
                        setSaved(false);
                    }}
                    placeholder="sk-xxxxxxxxxxxxxxxx"
                    style={{ maxWidth: 480 }}
                />
                <Button type="primary" onClick={handleSave}>
                    Save
                </Button>
                {saved && (
                    <span style={{ color: "#52c41a", fontWeight: 600 }}>
                        ✓ Saved
                    </span>
                )}
            </div>
        </div>
    );
}
