import React from "react";

export const GoogleAnalyticsContext = React.createContext({});

export default function GoogleAnalyticsProvider({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
