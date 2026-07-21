# DeepSeek API Provider 实施计划

> **Goal:** 为 BrainyAI 添加基于标准 API Key 的 DeepSeek 模型支持，建立可复用的 API Provider 模式。

**Architecture:** 新增 `DeepSeekBot` 类直接调用 DeepSeek OpenAI 兼容 API（`api.deepseek.com/v1/chat/completions`），API Key 存储在 `chrome.storage.local`，在选项页提供 Key 配置入口。与现有"偷 token"方案并行，后续其他 Provider 可复用此模式。

**Tech Stack:** DeepSeek API (OpenAI-compatible), chrome.storage.local, React (Ant Design)

---

## 现状

- 所有现有 bot（OpenAI/Perplexity/Copilot/Kimi）通过内容脚本从 AI 网站抓取 auth token
- `IBot` 接口定义：`completion()`, `startAuth()`, `startCaptcha()`, `uploadFile()`
- `BotBase` 提供静态属性和会话管理
- `ModelManagementProvider` 注册所有可用 bot
- 选项页在 `options/` 下，使用 Ant Design

---

## Phase 1: API Key 存储基础设施

### Task 1.1: 创建 DeepSeek 配置存储模块

**Objective:** 提供统一的 API Key 读写接口

**Files:**

- Create: `libs/chatbot/deepseek/config.ts`

```typescript
const STORAGE_KEY = "deepseek_api_key";

export async function getDeepSeekApiKey(): Promise<string | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] ?? null;
}

export async function setDeepSeekApiKey(key: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: key });
}

export async function clearDeepSeekApiKey(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
}
```

**Verification:** 无（纯工具函数，与 BotBase 测试类似）

---

### Task 1.2: 创建 DeepSeekBot 核心实现

**Objective:** 实现 IBot 接口，直接调用 DeepSeek API

**Files:**

- Create: `libs/chatbot/deepseek/index.ts`

**Design notes:**

- `requireLogin = false`（API Key 模式不需要网页登录）
- `startAuth()` 返回 `true`（无需认证流程）
- `startCaptcha()` 返回 `true`（无验证码）
- `completion()` 直接 fetch SSE stream
- `uploadFile()` 暂不支持（DeepSeek API 目前不支持文件上传，返回错误）
- `checkIsLogin()` 检查 API Key 是否有值

**Core completion 实现:**

```typescript
import IconDeepSeek from "data-base64:~assets/deepseek.png";

import { BotBase } from "~libs/chatbot/BotBase";
import { getDeepSeekApiKey } from "~libs/chatbot/deepseek/config";
import {
    type BotCompletionParams,
    type BotConstructorParams,
    type IBot
} from "~libs/chatbot/IBot";
import {
    ConversationResponse,
    ResponseMessageType
} from "~libs/open-ai/open-ai-interface";
import { createUuid } from "~utils";
import { ChatError, ErrorCode } from "~utils/errors";

export class DeepSeekBot extends BotBase implements IBot {
    static botName = "DeepSeek";
    static logoSrc = IconDeepSeek;
    static loginUrl = "";
    static requireLogin = false;
    static supportUploadPDF = false;
    static supportUploadImage = false;
    static maxTokenLimit = 65536;
    static paidModel = true;
    static newModel = true;

    constructor(params: BotConstructorParams) {
        super(params);
    }

    static async checkIsLogin(): Promise<[ChatError | null, boolean]> {
        const key = await getDeepSeekApiKey();
        return [null, !!key];
    }

    async startAuth(): Promise<boolean> {
        return true;
    }
    async startCaptcha(): Promise<boolean> {
        return true;
    }
    async uploadFile(): Promise<string> {
        throw new ChatError(ErrorCode.UPLOAD_FILE_NOT_SUPPORTED);
    }
    get supportedUploadTypes() {
        return [];
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

        const response = await fetch(
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
                                message_type: ResponseMessageType.GENERATING,
                                message_text: delta
                            })
                        );
                    }
                } catch {
                    /* skip malformed chunks */
                }
            }
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

    getBotName() {
        return DeepSeekBot.botName;
    }
    getLoginUrl() {
        return DeepSeekBot.loginUrl;
    }
    getLogoSrc() {
        return DeepSeekBot.logoSrc;
    }
    getRequireLogin() {
        return DeepSeekBot.requireLogin;
    }
    getSupportUploadImage() {
        return DeepSeekBot.supportUploadImage;
    }
    getSupportUploadPDF() {
        return DeepSeekBot.supportUploadPDF;
    }
    getMaxTokenLimit() {
        return DeepSeekBot.maxTokenLimit;
    }
    getPaidModel() {
        return DeepSeekBot.paidModel;
    }
    getNewModel() {
        return DeepSeekBot.newModel;
    }
}
```

**Verification:** `pnpm exec tsc --noEmit`

---

### Task 1.3: 注册 DeepSeekBot 到模型管理系统

**Objective:** 在侧边栏的模型选择中可以看到 DeepSeek

**Files:**

- Modify: `provider/ModelManagementProvider.tsx`

**Changes:**

1. 在顶部 import DeepSeekBot
2. 在 `allModels` 数组末尾添加 `DeepSeekBot`
3. 在 `categoryModels` 中添加新分类：

```typescript
{
    label: "DeepSeek",
    models: [DeepSeekBot],
},
```

**Verification:** `pnpm exec tsc --noEmit` + `pnpm build`

---

## Phase 2: 选项页 UI — API Key 配置

### Task 2.1: 添加 API Key 设置组件

**Objective:** 在选项页中提供 DeepSeek API Key 输入框

**Files:**

- Create: `options/component/ApiKeySettings.tsx`

**UI 设计:**

- 一个带 label 的密码输入框
- "保存"按钮，保存到 chrome.storage.local
- 保存后显示 ✓ 提示
- 加载时从 storage 读取已有 key

```tsx
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
        message.success("API Key saved");
    }

    return (
        <div style={{ padding: "24px 56px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
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
                {saved && <span style={{ color: "#52c41a" }}>✓</span>}
            </div>
        </div>
    );
}
```

**Verification:** 构建后在 Chrome 扩展选项页可以看到输入框

---

### Task 2.2: 集成到选项页路由

**Objective:** API Key 设置页在选项页中可以访问

**Files:**

- Modify: `options/router.tsx` — 添加路由
- 或在 `options/layout.tsx` 中嵌入

**简单方案:** 在 `options/layout.tsx` 的 settings 页面底部嵌入 `<ApiKeySettings />`

---

## Phase 3: DeepSeek Logo 资源

### Task 3.1: 添加 DeepSeek 图标

**Objective:** 在模型选择器中有 DeepSeek 的图标

**Files:**

- Create: `assets/deepseek.png` — 从 DeepSeek 官网或公开资源获取 128x128 图标

**Verification:** 侧边栏模型选择器中显示图标

---

## Phase 4: 测试

### Task 4.1: DeepSeekBot 单元测试

**Files:**

- Create: `src/__tests__/libs/deepseek.test.ts`

**测试范围:**

- `checkIsLogin()` 在没有 key 时返回 false
- `checkIsLogin()` 在有 key 时返回 true
- `getBotName()` 返回 "DeepSeek"
- `getRequireLogin()` 返回 false
- 静态属性验证（maxTokenLimit, paidModel 等）

---

## 文件变更总结

| 操作   | 文件                                   |
| ------ | -------------------------------------- |
| Create | `libs/chatbot/deepseek/config.ts`      |
| Create | `libs/chatbot/deepseek/index.ts`       |
| Create | `options/component/ApiKeySettings.tsx` |
| Create | `assets/deepseek.png`                  |
| Create | `src/__tests__/libs/deepseek.test.ts`  |
| Modify | `provider/ModelManagementProvider.tsx` |
| Modify | `options/layout.tsx` (或 router.tsx)   |

---

## 风险

1. **DeepSeek API 配额/限流** — 用户需自行管理 API Key 的余额
2. **SSE 流解析** — DeepSeek 的 SSE 格式可能与标准略有差异，需实测验证
3. **CORS** — Chrome 扩展在 background/service worker 中发请求不受 CORS 限制，但 sidepanel 页面可能需要通过 background 中转
4. **不支持文件上传** — 初期 skip，后续 DeepSeek 如果支持 Vision API 再加

---

## DeepSeek vs 现有 Provider 差异

|                  | 现有 Provider      | DeepSeek (新)  |
| ---------------- | ------------------ | -------------- |
| 认证方式         | 抓取网页 token     | API Key        |
| 需要登录 AI 网站 | ✅                 | ❌             |
| 需要内容脚本     | ✅                 | ❌             |
| 需要验证码处理   | ✅                 | ❌             |
| 用户配置         | 无                 | 填入 API Key   |
| 可靠性           | 低（网站改版就挂） | 高（标准 API） |
