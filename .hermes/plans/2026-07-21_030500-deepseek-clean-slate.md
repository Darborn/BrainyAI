# 全部迁移至 API Key 模式 — 实施计划

> **Goal:** 删除所有"偷 token"的旧 provider，建立干净的 API Key 架构，以 DeepSeek 为首个实现。

**Architecture:** 保留 UI 层（sidepanel/component/options）和核心会话抽象（BotBase/IBot/BotSessionBase），删除所有网站认证相关代码（content scripts、auth 模块、captcha、Arkose），新建简洁的 API Provider 模式。

---

## Phase 0: 删除旧代码

### Task 0.1: 删除 contents/ 所有内容脚本

**Files to delete:**

```
contents/base.tsx
contents/chat-auth-copilot.tsx
contents/chat-auth-kimi.tsx
contents/chat-auth-openai.tsx
contents/chat-auth-perplexity.tsx
contents/chat-captcha-copilot.tsx
contents/chat-captcha-openai.tsx
contents/chat-captcha-perplexity.tsx
contents/devv_.tsx
contents/perplexity.tsx
contents/perplexity-in-standalone-challenge-window.tsx
contents/phind.tsx
contents/phind-in-standalone-challenge-window.tsx
contents/search-engine-content.tsx
contents/you.tsx
contents/you-in-standalone-challenge-window.tsx
```

### Task 0.2: 删除 libs/chatbot/ 旧 provider

**Files to delete:**

```
libs/chatbot/openai/*          (Arkose.ts, ChatGPT35Turbo.ts, ChatGPT4o.ts, ChatGPT4Turbo.ts, fileInstance.ts, index.ts, ModelInstance.ts, RequirementsRequestToken.ts)
libs/chatbot/perplexity/*      (全部 8 个模型文件 + fileInstance.ts + PerplexityBase.ts)
libs/chatbot/copilot/*         (全部)
libs/chatbot/kimi/*            (全部)
```

### Task 0.3: 删除 auth 相关 libs

**Files to delete:**

```
libs/open-ai/*                 (全部 — open-ai-api.ts, open-ai-auth.ts, open-ai-constant.ts, open-ai-interface.ts, open-panel.ts, use-case.ts)
libs/copilot/*                 (全部)
libs/ga.ts                     (GA4，不需要)
libs/prompt.ts                 (如果不影响 UI)
```

### Task 0.4: 删除 background messages

**Files to delete:**

```
background/messages/copilot/*
background/messages/kimi/*
background/messages/fix-partition-cookie.ts
background/messages/metaso-session.ts
background/ports/*
```

### Task 0.5: 删除 component/ 旧组件

**Files to delete:**

```
component/xframe/*             (perplexity-chat.tsx, challenge/*, dialog.tsx — 用于在 iframe 中嵌入 AI 网站)
component/ModelCheckList.tsx   (旧模型选择)
component/common/ChatCaptchaBanner.tsx  (验证码横幅)
```

### Task 0.6: 删除 resources/ 旧资源

```
resources/js/*                 (Arkose worker)
rulesets/rule.json             (user agent modifier)
```

### Task 0.7: 清理 ModelManagementProvider

**修改 `provider/ModelManagementProvider.tsx`：**

- 删除所有旧 import
- `defaultModels` 只保留 `[DeepSeekBot]`
- `allModels` 只保留 `[DeepSeekBot]`
- `categoryModels` 只保留 DeepSeek 分类

### Task 0.8: 简化 IBot / BotBase 接口

**修改 `libs/chatbot/IBot.ts`：**

- 删除 `startAuth()`, `startCaptcha()`, `uploadFile()`, `supportedUploadTypes`
- 保留 `completion()`, `getBotName()`, `getLogoSrc()`, `getRequireLogin()`, `getPaidModel()`, `getNewModel()`, `getMaxTokenLimit()`

**修改 `libs/chatbot/BotBase.ts`：**

- 删除 `FileRef`, `BotFileInstance`, `BotSupportedMimeType` — 暂不支持文件上传
- 删除 `supportUploadPDF`, `supportUploadImage`

### Task 0.9: 清理 background/index.ts

- 删除 injectContentScript 逻辑（不需要注入内容脚本了）
- 删除 openGuidePageAfterInstall
- 保留 sidePanel 基础逻辑（open/close panel）

### Task 0.10: 清理 utils/

- 删除 `utils/custom-fetch-for-chat.ts`（旧的带 cookie 的 fetch）
- 删除 `utils/UploadUtils.tsx`
- 简化 `utils/index.ts` — 删除 `getCookiesInBackendByDomain`, `addCspParamsToUrl`, `openInPlugin`, `addMobileHeaderToUrl`, `R_SCP_PARAM` 等

### Task 0.11: 清理 package.json

```bash
pnpm remove ali-oss firebase websocket-as-promised lottie-web js-sha3 @ungap/custom-elements console-browserify path-browserify process url
```

---

## Phase 1: DeepSeek API Provider

### Task 1.1: DeepSeek 配置存储

**Create:** `libs/chatbot/deepseek/config.ts`

```typescript
const STORAGE_KEY = "deepseek_api_key";

export async function getDeepSeekApiKey(): Promise<string | null> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] ?? null;
}

export async function setDeepSeekApiKey(key: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: key });
}
```

### Task 1.2: DeepSeekBot 实现

**Create:** `libs/chatbot/deepseek/index.ts`

核心逻辑：fetch SSE stream from `https://api.deepseek.com/v1/chat/completions`

### Task 1.3: 注册到 ModelManagementProvider

已经在 Phase 0.7 中处理。

### Task 1.4: API Key 设置 UI

**Create:** `options/component/ApiKeySettings.tsx`
**Modify:** `options/layout.tsx` — 嵌入 ApiKeySettings

### Task 1.5: DeepSeek Logo

**Create:** `assets/deepseek.png`

---

## Phase 2: 测试与验证

### Task 2.1: DeepSeekBot 单元测试

### Task 2.2: 构建验证

```bash
pnpm exec tsc --noEmit && pnpm build
```

### Task 2.3: 全流程测试

在 Chrome 中加载扩展 → 打开选项页设置 API Key → 侧边栏选择 DeepSeek → 发送消息 → 验证回复

---

## 变更统计（预估）

| 操作     | 数量 |
| -------- | ---- |
| 删除文件 | ~50+ |
| 新建文件 | ~4   |
| 修改文件 | ~8   |

---

## 风险

1. **删除可能影响 UI 的引用** — 需要逐步验证 type-check，确保没有 broken import
2. **sidepanel 的 conversation 页面**依赖旧 provider 的类型 — 需要确认兼容
3. **构建体积**将大幅减小（从 32MB 可能降到 ~10MB）
