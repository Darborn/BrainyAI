import React from "react";
import { RouterProvider } from "react-router-dom";

import { router } from "~options/router";

import "~base.scss";

import GoogleAnalyticsProvider from "~provider/GoogleAnalyticsProvider";

export default function () {
    return (
        <GoogleAnalyticsProvider>
            <RouterProvider router={router} />
        </GoogleAnalyticsProvider>
    );
}
