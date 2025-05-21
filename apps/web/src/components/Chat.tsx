import { DBGameState } from "@mystwright/db";
import { Bot, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorldContext } from "../context/world-context";
import "../styles/Chat.css";
import { useApi } from "../utils/api";
import Page from "./Page";

export default function Chat() {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { activeWorld, activeGameState, activeCharacter, updateActiveGameState } = useWorldContext();
    const api = useApi();

    useEffect(() => {
        if (activeCharacter && activeGameState) {
            const previousMessages = activeGameState.payload.dialogueHistory[activeCharacter.id] ?? [];
            setMessages(previousMessages);
        }
    }, [activeWorld, activeGameState, activeCharacter]);

    useEffect(() => {
        const chatContainer = document.querySelector(".chat-messages");
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (input.trim() === "") return;

        setLoading(true);
        setMessages([...messages, { role: "user", content: input }]);
        setInput("");

        if (activeCharacter) {
            if (activeWorld === null || activeGameState === null) {
                console.error("No active world or game state");
                console.log("activeWorld", activeWorld);
                console.log("activeGameState", activeGameState);
                return;
            }

            const payload = {
                input,
                character_id: activeCharacter.id
            }

            try {
                const data = await api<{ response: string, state: DBGameState['payload'] }>(`/api/v1/worlds/${activeWorld.id}/states/${activeGameState.id}/dialogue`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
                updateActiveGameState(data.state);
            } catch (err) {
                setError("Failed to send message");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <Page>
            <div className="dialog">
                <div className="dialog-header">
                </div>
                <div className="dialog-content">
                    <div className="chat-messages">
                        {messages.map((message, index) => (
                            <div key={index} className={`message ${message.role}`}>
                                {message.role === "assistant" ? 
                                    <div className="message-avatar">
                                        <Bot width={18} height={18} />
                                    </div>
                                : null}
                                <div className="message-content">
                                    <div className="message-text">{message.content}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="dialog-footer">
                    <div className="chat flex flex-align-center">
                        <input
                            type="text"
                            disabled={loading}
                            placeholder="Type something..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <button className="has-icon-right">
                            Send
                            <Send width={16} height={16} />
                        </button>
                    </div>
                    <div className="tip">
                        e.g. Try: `/help` for a list of commands
                    </div>
                </div>
            </div>
        </Page>
    );
}