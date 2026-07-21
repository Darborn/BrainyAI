# BrainyAI 现代化升级实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 将 BrainyAI Chrome 扩展从 2024 年 6 月的停滞状态现代化：升级所有依赖、建立测试体系、修复代码质量问题、添加 CI 流水线。

**Architecture:** 渐进式升级策略 — 先建立安全网（lint-staged + CI），再逐层升级依赖（核心 → 构建 → UI），最后偿还技术债务（清理注释代码、修复类型、移除 eslint-disable）。每个阶段都有可验证的检查点。

**Tech Stack:** Plasmo 0.90+, React 18.3, TypeScript 5.5+, Vitest, ESLint 9 flat config, GitHub Actions

---

## 现状总结

| 指标               | 现状                                   |
| ------------------ | -------------------------------------- |
| 构建               | ✅ 可通过 `pnpm build`，产物 31MB      |
| Lint               | ✅ 通过，0 issues                      |
| 测试               | ❌ 零测试文件                          |
| CI                 | ❌ 无 GitHub Actions                   |
| Plasmo             | 0.86.1 → 目标 0.90.5                   |
| React              | 18.2.0 → 目标 18.3.1                   |
| TypeScript         | 5.3.3 → 目标 5.5+                      |
| ESLint             | 8.56 + flat config                     |
| 注释死代码         | ~100+ 行                               |
| `@ts-expect-error` | 14 处                                  |
| `any` 类型         | 50+ 处（18 个文件）                    |
| 空文件             | 1 个 (`provider/ChatAuthProvider.tsx`) |

---

## Phase 1: 开发基础设施（安全网）

### Task 1.1: 添加 Vitest 测试框架

**Objective:** 建立测试运行能力，确保后续改动有回归检测

**Files:**

- Create: `vitest.config.ts`
- Modify: `package.json` (add test scripts + vitest deps)
- Create: `src/__tests__/` 目录

**Step 1: 安装 Vitest 及相关依赖**

```bash
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
```

**Step 2: 创建 `vitest.config.ts`**

```typescript
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: [],
        include: ["src/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"]
        }
    },
    resolve: {
        alias: {
            "~": path.resolve(__dirname, ".")
        }
    }
});
```

**Step 3: 修改 `package.json` scripts**

```json
"scripts": {
  "dev": "plasmo dev",
  "build": "plasmo build",
  "build:staging": "plasmo build --tag=staging",
  "package": "plasmo package",
  "lint": "npx eslint . --fix",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Step 4: 写第一个测试验证框架工作**

创建 `src/__tests__/errors.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { ChatError, ErrorCode, getErrorMessage } from "../../utils/errors";

describe("ChatError", () => {
    it("should create error with default message", () => {
        const err = new ChatError(ErrorCode.NETWORK_ERROR);
        expect(err.code).toBe(ErrorCode.NETWORK_ERROR);
        expect(err.message).toBe("Network error.");
    });

    it("should create error with custom message", () => {
        const err = new ChatError(ErrorCode.UNKNOWN_ERROR, "custom msg");
        expect(err.message).toBe("custom msg");
    });
});

describe("getErrorMessage", () => {
    it("should return message for each error code", () => {
        expect(getErrorMessage(ErrorCode.CONVERSATION_LIMIT)).toContain(
            "limit"
        );
        expect(getErrorMessage(ErrorCode.UNAUTHORIZED)).toBeDefined();
    });

    it("should return unknown for invalid code", () => {
        expect(getErrorMessage("INVALID" as ErrorCode)).toBe("Unknown error.");
    });
});
```

**Step 5: 运行测试验证**

```bash
pnpm test
```

Expected: 3 tests pass.

**Step 6: 提交**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml src/__tests__/
git commit -m "chore: add vitest testing framework with initial tests"
```

---

### Task 1.2: 添加 lint-staged + husky pre-commit hooks

**Objective:** 确保每次提交前自动运行 lint 和测试

**Files:**

- Modify: `package.json` (add lint-staged config)
- Create: `.husky/pre-commit`

**Step 1: 安装 lint-staged**

```bash
pnpm add -D lint-staged
```

**Step 2: 在 `package.json` 添加配置**

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{css,scss,json,md}": ["prettier --write"]
}
```

**Step 3: 初始化 husky（已安装但未配置）**

```bash
pnpm exec husky init
```

**Step 4: 编辑 `.husky/pre-commit`**

```bash
pnpm lint-staged
```

**Step 5: 验证**

```bash
# 手动测试: touch a bad file, git add, git commit - 应该被 lint-staged 拦截
```

**Step 6: 提交**

```bash
git add .husky/ package.json pnpm-lock.yaml
git commit -m "chore: add lint-staged + husky pre-commit hooks"
```

---

### Task 1.3: 添加 GitHub Actions CI

**Objective:** 每次 push/PR 自动运行 lint + type-check + test + build

**Files:**

- Create: `.github/workflows/ci.yml`

**Code:**

```yaml
name: CI

on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

jobs:
    check:
        runs-on: ubuntu-latest
        strategy:
            matrix:
                node-version: [20, 22]

        steps:
            - uses: actions/checkout@v4

            - uses: pnpm/action-setup@v4
              with:
                  version: 8

            - uses: actions/setup-node@v4
              with:
                  node-version: ${{ matrix.node-version }}
                  cache: "pnpm"

            - run: pnpm install --frozen-lockfile

            - name: Type check
              run: pnpm exec tsc --noEmit

            - name: Lint
              run: pnpm lint

            - name: Test
              run: pnpm test

            - name: Build
              run: pnpm build
```

**Step 2: 提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI pipeline"
```

---

## Phase 2: 依赖升级

### Task 2.1: 升级核心依赖（保守升级）

**Objective:** 升级 TypeScript + React + 相关类型包，保持兼容性

**Files:**

- Modify: `package.json`

**Step 1: 升级 TypeScript & React 类型**

```bash
pnpm add -D typescript@^5.5
pnpm add react@^18.3.1 react-dom@^18.3.1
pnpm add -D @types/react@^18.3 @types/react-dom@^18.3 @types/node@^20.14 @types/chrome@^0.0.268
```

**Step 2: 更新 `tsconfig.json`**

```json
{
    "extends": "plasmo/templates/tsconfig.base",
    "exclude": ["node_modules"],
    "include": [
        ".plasmo/index.d.ts",
        "./**/*.ts",
        "./**/*.tsx",
        "eslint.config.cjs",
        "vitest.config.ts"
    ],
    "compilerOptions": {
        "paths": { "~*": ["./*"] },
        "baseUrl": ".",
        "strictNullChecks": true,
        "noUncheckedIndexedAccess": true,
        "forceConsistentCasingInFileNames": true
    }
}
```

**Step 3: 运行 type-check 验证无新增错误**

```bash
pnpm exec tsc --noEmit
```

**Step 4: 提交**

```bash
git add package.json pnpm-lock.yaml tsconfig.json
git commit -m "chore: upgrade TypeScript 5.5 + React 18.3"
```

---

### Task 2.2: 升级 Plasmo 框架

**Objective:** 从 Plasmo 0.86.1 升级到 0.90.5+

**Step 1: 查看 Plasmo changelog（需检查 breaking changes）**

```bash
# 在 https://github.com/PlasmoHQ/plasmo/releases 查看 0.86 → 0.90 的变更
```

**Step 2: 升级**

```bash
pnpm add plasmo@^0.90.5
```

**Step 3: 检查 `package.json` manifest 配置是否需要调整**

**Step 4: 构建验证**

```bash
pnpm build
```

Expected: 构建成功，产物正常。

**Step 5: 提交**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: upgrade Plasmo to 0.90.5"
```

---

### Task 2.3: 升级 ESLint 到 v9

**Objective:** 保持 ESLint 最新，修复可能的新规则冲突

**Step 1: 升级 ESLint**

```bash
pnpm add -D eslint@^9 @eslint/js@^9 typescript-eslint@^8
```

**Step 2: 适配 `eslint.config.cjs` 为 ESLint 9 格式（当前已是 flat config，主要是包版本更新）**

**Step 3: 运行 lint 检查**

```bash
pnpm lint
```

Expected: 0 errors（可能有些新的 warning 需要单独修复）。

**Step 4: 提交**

```bash
git add package.json pnpm-lock.yaml eslint.config.cjs
git commit -m "chore: upgrade ESLint to v9"
```

---

### Task 2.4: 升级其余依赖

**Objective:** 升级 UI 库和工具包

**Step 1: 批量升级**

```bash
pnpm add antd@^5.22 @ant-design/icons@^5.5 tailwindcss@^3.4.17 postcss@^8.4 autoprefixer@^10.4
pnpm add @headlessui/react@^2.2 highlight.js@^11.11 markdown-it@^14.1
pnpm add firebase@^11.1 localforage@^1.10
pnpm add -D prettier@^3.4
```

**Step 2: 运行 `npx update-browserslist-db@latest`**

```bash
npx update-browserslist-db@latest
```

**Step 3: 构建 + lint 验证**

```bash
pnpm build && pnpm lint
```

**Step 4: 提交**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: upgrade all remaining dependencies"
```

---

## Phase 3: 技术债务清理

### Task 3.1: 清理注释掉的无用代码

**Objective:** 移除 100+ 行被注释掉的旧代码

**Files affected:**

- `utils/errors.ts` — 30+ 行注释掉的 ErrorCode
- `libs/chatbot/PerplexityBase.tsx` — 注释掉的静态方法
- `libs/chatbot/BotSessionBase.ts` — 注释掉的 singleton 模式
- `libs/chatbot/IBot.ts` — 注释掉的抽象类
- `background/index.ts` — 注释掉的事件监听器

**Step 1: 搜索并确认所有注释代码块**

```bash
rg "^\s*//\s+\w" --type ts libs/ utils/ background/ --count
```

**Step 2: 逐个文件清理** — 仅移除明确被注释掉的实现代码，保留文档性注释

**Step 3: 构建 + 测试验证**

```bash
pnpm build && pnpm test
```

**Step 4: 提交**

```bash
git add -A
git commit -m "refactor: remove commented-out dead code"
```

---

### Task 3.2: 修复 `@ts-expect-error` 和 `eslint-disable`

**Objective:** 消除所有类型安全绕过（14 处），用正确的类型替代

**Files affected:**

- `contents/base.tsx` (5 处)
- `libs/open-ai/open-ai-api.ts` (4 处)
- `utils/index.ts` (2 处)
- `background/messages/metaso-session.ts` (1 处)
- `background/messages/fix-partition-cookie.ts` (1 处)
- `libs/chatbot/openai/RequirementsRequestToken.ts` (1 处)

**Step 1: 逐个文件修复**

对每处 `@ts-expect-error`：

- 如果是类型不匹配 → 添加正确的类型断言或守卫
- 如果是 window/chrome API 缺失 → 添加类型声明
- 如果是 null 检查遗漏 → 添加非空断言守卫

**Step 2: 运行 type-check 确认无新增错误**

```bash
pnpm exec tsc --noEmit
```

**Step 3: 提交**

```bash
git add -A
git commit -m "fix: resolve all @ts-expect-error suppressions"
```

---

### Task 3.3: 减少 `any` 类型使用

**Objective:** 将 50+ 处 `any` 替换为具体类型

**Files with most `any`:**

- `libs/open-ai/open-ai-interface.ts` (10 处)
- `utils/index.ts` (5 处)
- `libs/chatbot/kimi/index.ts` (4 处)

**Step 1: 定义缺失的接口类型**

为 `open-ai-interface.ts` 中的 `any` 字段添加具体类型：

- `adaptiveCards` → 定义 `AdaptiveCard` 接口
- `IOpenAISessionResponse.groups` → `string[]`
- `Account.processor` → 定义 `AccountProcessor` 接口
- `AccountEntitlement.billing_period` → 定义 `BillingPeriod` 类型
- `Account.organization_id` → `string | null`

**Step 2: 全局搜索并替换**

对 `utils/index.ts` 等工具函数，添加泛型约束替代 `any`。

**Step 3: type-check 验证**

```bash
pnpm exec tsc --noEmit
```

**Step 4: 提交**

```bash
git add -A
git commit -m "refactor: replace any types with proper interfaces"
```

---

### Task 3.4: 删除空文件 + 命名规范化

**Objective:** 清理无效文件，规范化变量命名

**Step 1: 删除空文件**

```bash
rm provider/ChatAuthProvider.tsx
```

检查是否有其他文件 import 了它，如果有则移除 import。

**Step 2: 重命名混淆变量**

- `open-ai-api.ts`: `IRe()` → `getProofOfWorkInputs()`, `MRe()` → `computeProofOfWork()`
- `PerplexityBase.ts`: `V` → `BASE64_CHARS`, `Z()` → `toBase64()`, `t` → `timestamp`

**Step 3: 验证**

```bash
pnpm build && pnpm test
```

**Step 4: 提交**

```bash
git add -A
git commit -m "refactor: remove empty files, improve variable naming"
```

---

### Task 3.5: 增强 Logger — 移除生产环境 console

**Objective:** 确保生产构建不泄露日志信息（当前 Logger 依赖环境变量）

**Files:**

- Modify: `utils/logger.ts`

**改进:** 添加结构化日志级别，生产环境完全禁用输出

```typescript
enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
    TRACE = 4
}

const isProduction = process.env.NODE_ENV === "production";
const currentLevel: LogLevel = isProduction ? LogLevel.ERROR : LogLevel.TRACE;

export class Logger {
    static error(...args: unknown[]) {
        if (currentLevel >= LogLevel.ERROR) console.error(...args);
    }
    static warn(...args: unknown[]) {
        if (currentLevel >= LogLevel.WARN) console.warn(...args);
    }
    static log(...args: unknown[]) {
        if (currentLevel >= LogLevel.INFO) console.log(...args);
    }
    static debug(...args: unknown[]) {
        if (currentLevel >= LogLevel.DEBUG) console.debug(...args);
    }
    static trace(...args: unknown[]) {
        if (currentLevel >= LogLevel.TRACE) console.trace(...args);
    }
}
```

---

## Phase 4: 测试覆盖

### Task 4.1: Utils 单元测试

**Objective:** 为核心工具函数添加测试

**Files:**

- Create: `src/__tests__/utils/index.test.ts`
- Create: `src/__tests__/utils/logger.test.ts`
- Create: `src/__tests__/utils/constants.test.ts`

**测试范围:**

- `createUuid()` — 格式验证
- `appendParamToUrl()` — URL 参数追加
- `getLatestState()` — React state 读取
- `Logger` — 各日志级别行为
- `PanelRouterPath` — 枚举值正确性

---

### Task 4.2: Bot 模型单元测试

**Objective:** 为 chatbot 抽象层添加测试

**Files:**

- Create: `src/__tests__/libs/BotBase.test.ts`
- Create: `src/__tests__/libs/BotSessionBase.test.ts`

**测试范围:**

- `BotBase` 静态属性正确性
- `BotSession` 消息管理
- `FileRef` 创建和错误处理
- `BotSupportedMimeType` 标签映射

---

### Task 4.3: Error 处理测试

**Objective:** 覆盖所有错误码和错误消息

**Files:**

- Modify: `src/__tests__/errors.test.ts` (已有基础，扩展)

**测试范围:**

- 所有 `ErrorCode` 枚举值都有对应的 `getErrorMessage`
- `ChatError` 构造和 message fallback
- `ErrorCode.UNKNOWN_ERROR` 兜底

---

## 风险与注意事项

1. **Plasmo 升级风险**: 0.86 → 0.90 跨越多个大版本，`package.json` 中的 `manifest` 配置可能有 breaking changes。需查阅 [Plasmo changelog](https://github.com/PlasmoHQ/plasmo/releases)。

2. **React 19 暂不升级**: React 19 引入了显著的 breaking changes（如 `forwardRef` 移除），当前先稳定在 18.3。

3. **TypeScript strictNullChecks**: 当前已开启 `strictNullChecks`，新增 `noUncheckedIndexedAccess` 可能导致新的编译错误，需逐一修复。

4. **AI Provider 兼容性**: 依赖升级不会修复核心功能问题 — ChatGPT/Perplexity 的 API 如果已变更，需单独处理（不在本次计划范围内）。

5. **构建产物大小**: 当前 31MB 较大，后续可考虑 code splitting 优化，但本次不涉及。

---

## 成功标准

- [x] `pnpm build` 成功
- [ ] `pnpm test` 通过，覆盖 ≥ 15 个测试
- [ ] `pnpm lint` 零 error
- [ ] `pnpm exec tsc --noEmit` 零 error
- [ ] GitHub Actions CI 全绿
- [ ] 零 `@ts-expect-error` 注释
- [ ] 无空文件
- [ ] 无注释掉的无用代码块
