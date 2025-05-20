import {  } from "lucide-react";
import { useState } from "react";
import "../styles/Page.css";

export default function Page({ children }: { children?: React.ReactNode }) {

    return (
        <div className="page">
            {children}
        </div>
    );
}