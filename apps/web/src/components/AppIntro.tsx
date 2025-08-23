import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import "../styles/AppIntro.scss";
import Page from "./Page";
import Logo from '/icon.png';

export default function AppIntro() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [prevSlide, setPrevSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    // This effect ensures the container height adjusts to the content during animations
    useEffect(() => {
        const updateHeight = () => {
            if (contentRef.current === null || contentRef.current === undefined) {
                return;
            }
            const currentContent = contentRef.current.querySelector('.slide-content:not(.slide-exit)');
            if (currentContent !== null && currentContent !== undefined) {
                contentRef.current.style.height = `${currentContent.clientHeight}px`;
            }
        };
        
        updateHeight();
        // Add a small delay to ensure content has rendered
        const timeoutId = setTimeout(updateHeight, 50);
        
        return () => clearTimeout(timeoutId);
    }, [currentSlide, isAnimating]);

    const slides = [
        {
            title: "Welcome to Mystwright",
            subtitle: "An AI-powered text adventure where you'll solve mysteries, uncover secrets, and explore intriguing narratives.",
        },
        {
            title: "How to Play",
            subtitle: "Type commands to interact with the world. Examine objects, talk to characters, and draw conclusions in an attempt to solve the mystery.",
        },
        {
            title: "Make Your First Mystery",
            subtitle: "Create a new world and start your adventure. Choose a setting, characters, or nothing! The choice is yours.",
            cta: "Create a World",
        }
    ]

    const handleNextSlide = () => {
        if (isAnimating) return;
        
        if (currentSlide < slides.length - 1) {
            setPrevSlide(currentSlide);
            setIsAnimating(true);
            setCurrentSlide(currentSlide + 1);
            
            // Reset animation state after animation completes
            setTimeout(() => {
                setIsAnimating(false);
            }, 400); // Match animation duration
        } else {
            navigate('/app');
        }
    };

    return (
        <Page padding={20}>
            <div className="intro">
                <div className="intro-icon">
                    {/* <Sparkles height={36} width={36} /> */}
                    <img src={Logo} alt="Mystwright Logo" />
                </div>
                <div ref={contentRef} className={`intro-content ${isAnimating ? 'animating' : ''}`}>
                    {isAnimating && (
                        <div className="slide-exit slide-content">
                            <div className="intro-title">
                                {slides[prevSlide].title}
                            </div>
                            <div className="intro-subtitle">
                                {slides[prevSlide].subtitle}
                            </div>
                        </div>
                    )}
                    <div className={isAnimating ? "slide-enter slide-content" : "slide-content"}>
                        <div className="intro-title">
                            {slides[currentSlide].title}
                        </div>
                        <div className="intro-subtitle">
                            {slides[currentSlide].subtitle}
                        </div>
                    </div>
                </div>
                <div className="intro-dots">
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            className={`dot ${currentSlide === index ? "active" : ""}`}
                        ></div>
                    ))}
                </div>
                <div className="intro-cta">
                    <button onClick={handleNextSlide}>
                        {slides[currentSlide].cta || "Continue"}
                    </button>
                </div>
            </div>
        </Page>
    );
}
