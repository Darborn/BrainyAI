import "@plasmohq/messaging";

interface MmMetadata {
    "close-window": {};
    "open-new-window": {};
}

interface MpMetadata {}

declare module "@plasmohq/messaging" {
    interface MessagesMetadata extends MmMetadata {}
    interface PortsMetadata extends MpMetadata {}
}
