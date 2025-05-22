import { DBGameState } from "@mystwright/db";
import { Bot, Send } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useUserContext } from "../context/user-context";
import { useWorldContext } from "../context/world-context";
import "../styles/Chat.css";
import { useApi } from "../utils/api";
import Page from "./Page";

export default function Chat() {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const inputElm = useRef<HTMLInputElement>(null);

    const audioElm = useRef<HTMLAudioElement>(null);
    const [audioIsPlaying, setAudioIsPlaying] = useState(false);
    const [audioIsLoading, setAudioIsLoading] = useState(false);

    const { user } = useUserContext();
    const { activeWorld, activeGameState, activeCharacter, updateActiveGameState } = useWorldContext();
    const api = useApi();

    useEffect(() => {
        if (audioElm.current) {
            const audio = audioElm.current;

            audio.addEventListener('canplay', () => {
                setAudioIsLoading(false);
            });

            audio.addEventListener('playing', () => {
                setAudioIsPlaying(true);
                setAudioIsLoading(false);
            });

            audio.addEventListener('pause', () => {
                setAudioIsPlaying(false);
            });

            audio.addEventListener('ended', () => {
                setAudioIsPlaying(false);
                setAudioIsLoading(false);
            });

            audio.addEventListener('error', () => {
                setAudioIsPlaying(false);
                setAudioIsLoading(false);
            });
        }

        return () => {
            if (audioElm.current) {
                const audio = audioElm.current;
                audio.removeEventListener('playing', () => setAudioIsPlaying(true));
                audio.removeEventListener('pause', () => setAudioIsPlaying(false));
                audio.removeEventListener('ended', () => setAudioIsPlaying(false));
                audio.removeEventListener('error', () => setAudioIsLoading(false));
            }
        };
    }, [audioElm]);

    useEffect(() => {
        if (audioElm.current) {
            const audio = audioElm.current;
            if (audioIsLoading) {
                audio.load();
            }
        }
    }, [audioIsLoading]);

    // Play audio when the audioIsPlaying state changes
    useEffect(() => {
        if (audioElm.current) {
            const audio = audioElm.current;
            if (audioIsPlaying) {
                audio.play().catch((error) => {
                    console.error("Error playing audio:", error);
                });
            } else {
                audio.pause();
            }
        }
    }, [audioIsPlaying]);

    useEffect(() => {
        if (audioElm.current) {
            const audio = audioElm.current;
            if (audioIsPlaying) {
                audio.play().catch((error) => {
                    console.error("Error playing audio:", error);
                });
            } else {
                audio.pause();
            }
        }
    }, [audioIsPlaying]);

    const streamVoiceAudio = async (character_id: string, text: string) => {
        if (activeWorld === null || activeGameState === null) {
            console.error("No active world or game state");
            return;
        }
        
        if (audioElm.current === null) {
            console.error('Audio element not found');
            return;
        }

        const audio = audioElm.current;

        if (audio === null) {
            console.error('Audio element not found');
            return;
        }

        if (audio.src) {
            URL.revokeObjectURL(audio.src);
        }

        audio.src = "";
        audio.srcObject = null;
        audio.pause();
        audio.currentTime = 0;
        setAudioIsLoading(true);
        setAudioIsPlaying(false);

        const mediaSource = new MediaSource();

        audio.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener('sourceopen', async () => {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            const res = await api<Response>(`/api/v1/worlds/${activeWorld.id}/speech`, {
                method: 'POST',
                body: JSON.stringify({ character_id, text }),
            // TODO: Fix raw boolean type in api
            // @ts-ignore
            }, true);

            if (!res.ok || !res.body) {
                console.error('Failed to fetch stream');
                mediaSource.endOfStream('network');
                return;
            }

            const reader = res.body.getReader();

            const pump = async () => {
                const { value, done } = await reader.read();
                if (done) {
                    mediaSource.endOfStream();
                    return;
                }

                // Wait if the buffer is updating
                if (sourceBuffer.updating) {
                    await new Promise(resolve => sourceBuffer.addEventListener('updateend', resolve, { once: true }));
                }

                sourceBuffer.appendBuffer(value);
                pump();
            };

            pump();
        });
    }

    useEffect(() => {
        if (activeCharacter) {
            setInput("");
            if (inputElm.current) {
                inputElm.current.focus();
            }

            if (activeGameState) {
                const previousMessages = activeGameState.payload.dialogueHistory[activeCharacter.id] ?? [];
                setMessages(previousMessages);
            }
        } else {
            setMessages([]);
        }
    }, [activeWorld, activeCharacter]);

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
                streamVoiceAudio(activeCharacter.id, data.response);
                setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
                updateActiveGameState(data.state);
            } catch (err) {
                setError("Failed to send message");
            } finally {
                setLoading(false);
                if (inputElm.current) {
                    inputElm.current.focus();
                }
            }
        }
    };

    return (
        <Page>
            <audio ref={audioElm} className="character-voice" autoPlay></audio>
            <div className="dialog">
                <div className="dialog-header">
                    <div className="character-info">
                        <h2>{activeCharacter ? activeCharacter.name : `Welcome, ${user?.first_name ? user?.first_name : 'Investigator'}`}</h2>
                        <div className="character-title">{activeCharacter?.description || ''}</div>
                    </div>
                    <div className="dialog-actions">
                        <button className="btn-primary">Journal</button>
                    </div>
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
                            ref={inputElm}
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