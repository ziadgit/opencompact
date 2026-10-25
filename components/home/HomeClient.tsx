"use client";

import dynamic from "next/dynamic";

// The notebook lives in localStorage, so the home view renders on the client only.
export const HomeClient = dynamic(() => import("./Home").then((m) => m.Home), { ssr: false });
