import "@plasmohq/messaging";

interface MmMetadata {
    "close-window": {};
    "fix-partition-cookie": {};
    "metaso-session": {};
    "open-new-window": {};
    "copilot/check-login": {};
    "copilot/init-copilot-conversation": {};
    "copilot/upload-file": {};
    "kimi/create-conversation": {};
    "kimi/pre-sign-url": {};
    "kimi/prompt-snippet-instance": {};
    "kimi/refresh-access-token": {};
}

interface MpMetadata {
    "kimi/chat": {};
}

declare module "@plasmohq/messaging" {
    interface MessagesMetadata extends MmMetadata {}
    interface PortsMetadata extends MpMetadata {}
}
