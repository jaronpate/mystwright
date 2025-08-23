import "../styles/Page.scss";

export default function Page({ children, padding }: { children?: React.ReactNode; padding?: number | string }) {

    return (
        <div className="page" style={{ padding: typeof padding === 'number' ? `${padding}px` : padding }}>
            {children}
        </div>
    );
}
