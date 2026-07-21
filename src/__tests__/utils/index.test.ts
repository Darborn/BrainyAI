import { describe, expect, it } from "vitest";

import { PanelRouterPath } from "~/libs/constants";
import {
    addCspParamsToUrl,
    appendParamToUrl,
    atobObj,
    btoaObj,
    createUuid,
    getGoogleQuery,
    getTimezoneOffsetMin,
    IS_OPEN_IN_PLUGIN,
    openInPlugin,
    PROMPT_PLACEHOLDER_LANG,
    PROMPT_PLACEHOLDER_TEXT
} from "~/utils";

describe("createUuid", () => {
    it("should return a string matching UUID v4 format", () => {
        const uuid = createUuid();
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuid).toMatch(uuidRegex);
    });

    it("should generate unique values on repeated calls", () => {
        const ids = new Set(Array.from({ length: 20 }, () => createUuid()));
        expect(ids.size).toBe(20);
    });

    it("should have correct length", () => {
        expect(createUuid()).toHaveLength(36);
    });
});

describe("appendParamToUrl", () => {
    it("should use ? when URL has no existing query", () => {
        const result = appendParamToUrl("https://example.com", "foo", "bar");
        expect(result).toBe("https://example.com?foo=bar");
    });

    it("should use & when URL already has a query", () => {
        const result = appendParamToUrl(
            "https://example.com?a=1",
            "foo",
            "bar"
        );
        expect(result).toBe("https://example.com?a=1&foo=bar");
    });

    it("should URI-encode param values with special characters", () => {
        const result = appendParamToUrl(
            "https://example.com",
            "q",
            "hello world"
        );
        expect(result).toBe("https://example.com?q=hello%20world");
    });
});

describe("addCspParamsToUrl", () => {
    it("should append CSP param to URL", () => {
        const result = addCspParamsToUrl("https://example.com");
        expect(result).toContain("--r-csp=1");
        expect(result).toMatch(/^https:\/\/example\.com\?/);
    });
});

describe("openInPlugin", () => {
    it("should return true when URL contains plugin flag", () => {
        expect(openInPlugin(`https://example.com?${IS_OPEN_IN_PLUGIN}=1`)).toBe(
            true
        );
    });

    it("should return false for normal URLs", () => {
        expect(openInPlugin("https://example.com")).toBe(false);
    });
});

describe("getGoogleQuery", () => {
    it("should extract query from Google search URL", () => {
        const result = getGoogleQuery(
            "https://www.google.com/search?q=test+query"
        );
        expect(result).toBe("test query");
    });

    it("should return empty string for non-Google URLs", () => {
        expect(getGoogleQuery("https://example.com/search?q=test")).toBe("");
    });

    it("should return empty string when no query param", () => {
        expect(getGoogleQuery("https://www.google.com/")).toBe("");
    });
});

describe("btoaObj / atobObj", () => {
    it("btoaObj should base64-encode all values", () => {
        const obj = { key1: "hello", key2: "world" };
        const encoded = btoaObj({ ...obj });
        expect(encoded.key1).toBe(btoa("hello"));
        expect(encoded.key2).toBe(btoa("world"));
    });

    it("atobObj should reverse btoaObj", () => {
        const original = { key: "test" };
        const encoded = btoaObj({ ...original });
        const decoded = atobObj(encoded);
        expect(decoded.key).toBe(original.key);
    });
});

describe("getTimezoneOffsetMin", () => {
    it("should return a number", () => {
        expect(typeof getTimezoneOffsetMin()).toBe("number");
    });

    it("should be between -720 and 840 (UTC-12 to UTC+14)", () => {
        const offset = getTimezoneOffsetMin();
        expect(offset).toBeGreaterThanOrEqual(-720);
        expect(offset).toBeLessThanOrEqual(840);
    });
});

describe("PanelRouterPath", () => {
    it("should have expected route values", () => {
        expect(PanelRouterPath.SEARCH).toBe("search");
        expect(PanelRouterPath.SEARCH_HOME).toBe("search_home");
        expect(PanelRouterPath.CONVERSATION).toBe("conversation");
    });
});

describe("Prompt placeholders", () => {
    it("should export correct placeholder tokens", () => {
        expect(PROMPT_PLACEHOLDER_TEXT).toBe("${texts}");
        expect(PROMPT_PLACEHOLDER_LANG).toBe("${lang}");
    });
});
