import { Fragment } from "react";
import { createBrowserRouter } from "react-router-dom";

import Layout from "~options/layout";
import Index from "~options/pages";
import ShortcutMenu from "~options/pages/ShortcutMenu";
import OptionsProvider from "~provider/Options";

export const PATH_SETTING_SIDEBAR = "path_shortcut";
export const PATH_SETTING_CONTACT_US = "path_contact_us";
export const PATH_SETTING_SHORTCUT = "";

const Wrapper = ({ children }) => {
    return <Fragment>{children}</Fragment>;
};

export const router = createBrowserRouter([
    {
        path: "options.html",
        element: (
            <Wrapper>
                <OptionsProvider>
                    <Layout />
                </OptionsProvider>
            </Wrapper>
        ),
        children: [
            // {
            //     path: "",
            //     element: <DetermineRedirect/>,
            // },
            {
                path: PATH_SETTING_SIDEBAR,
                element: <Index />
            },
            {
                path: PATH_SETTING_SHORTCUT,
                element: <ShortcutMenu />
            }
        ]
    }
]);
