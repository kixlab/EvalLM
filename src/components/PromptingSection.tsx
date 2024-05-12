import React from 'react';
import styled from 'styled-components';

import { Prompt } from '../types';

interface Props {
    prompts: Prompt[];
    selectedPrompts: string[];
    createPrompt: (idx: number) => void;
    updatePrompt: (prompt: Prompt) => void;
    openPanel: string;
    setOpenPanel: (panel: string) => void;
    panelData: any;
    setPanelData: (data: any) => void;
    section: string;
    disabled?: boolean;
}

const PromptingSection = ({
    prompts,
    selectedPrompts,
    createPrompt,
    updatePrompt,
    openPanel,
    setOpenPanel,
    panelData,
    setPanelData,
    section,
    disabled
}: Props) => {
    const togglePanel = (e: React.MouseEvent<HTMLElement, MouseEvent>, idx: number) => {
        e.stopPropagation();
        if(openPanel === "prompt" && idx === panelData.promptIdx) {
            setOpenPanel("");
            setPanelData({});
        } else if(openPanel === "prompt") {
            setPanelData({promptIdx: idx});
        } else {
            setOpenPanel("prompt");
            setPanelData({promptIdx: idx});
        }
    }

    return (
        <Container>
            <Title>Prompts</Title>
            {selectedPrompts.map((promptId, idx) => {
                const prompt = prompts.find((prompt) => prompt.id === promptId);
                if(!prompt) return null;

                var style = {};
                if(openPanel === "prompt"){
                    style = idx === panelData.promptIdx ? {} : {opacity: 0.5};
                }

                return (
                    <PromptContainer key={promptId} style={style}>
                        <PromptName idx={idx}>
                            <div>{idx + 1}</div>
                            <input
                                type="text"
                                value={prompt.name}
                                onChange={(e) => {
                                    const newPrompt = {...prompt};
                                    newPrompt.name = e.target.value;
                                    updatePrompt(newPrompt);
                                }}
                                style={disabled || promptId.includes("<PREDEFINED_PROMPT_") ? {color: "#777"} : {}}
                                disabled={disabled || promptId.includes("<PREDEFINED_PROMPT_")}
                            />
                            <ButtonContainer idx={idx}>
                                {section === "develop" && (
                                    <div>
                                        <i 
                                            className="fa-solid fa-plus"
                                            onClick={() =>  createPrompt(idx)}
                                            data-tooltip-id="tooltip"
                                            data-tooltip-content="Create a new prompt template."
                                        ></i>
                                    </div>
                                )}
                                {!disabled && (
                                    <div>
                                        <i 
                                            className="fa-solid fa-chevron-right"
                                            onClick={(e) => togglePanel(e, idx)}
                                            data-tooltip-id="tooltip"
                                            data-tooltip-content="Browse through previous prompt templates."
                                        ></i>
                                    </div>
                                )}
                            </ButtonContainer>
                        </PromptName>
                        <PromptContentContainer>
                            <PromptText
                                value={prompt.systemPrompt}
                                onChange={(e) => {
                                    if(disabled || promptId.includes("<PREDEFINED_PROMPT_")) return;
                                    const newPrompt = {...prompt};
                                    newPrompt.systemPrompt = e.target.value;
                                    updatePrompt(newPrompt);
                                }}
                                placeholder="Enter system prompt here..."
                                style={disabled || promptId.includes("<PREDEFINED_PROMPT_") ? {color: "#777"} : {}}
                                disabled={disabled || promptId.includes("<PREDEFINED_PROMPT_")}
                            />
                            <PromptText
                                value={prompt.userPrompt}
                                onChange={(e) => {
                                    if(disabled || promptId.includes("<PREDEFINED_PROMPT_")) return;
                                    const newPrompt = {...prompt};
                                    newPrompt.userPrompt = e.target.value;
                                    updatePrompt(newPrompt);
                                }}
                                placeholder="Enter user prompt here..."
                                style={disabled || promptId.includes("<PREDEFINED_PROMPT_") ? {color: "#777"} : {}}
                                disabled={disabled || promptId.includes("<PREDEFINED_PROMPT_")}
                            />
                        </PromptContentContainer>
                    </PromptContainer>
                )
            })}
        </Container>
    )
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
`;

const Title = styled.div`
    font-size: 16px;
`;

const PromptContainer = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    border-radius: 8px;
`;

const PromptName = styled.div<{idx: number}>`
    display: flex;
    flex-direction: row;
    font-size: 14px;
    font-weight: bold;
    width: 100%;
    background-color: #F5F7FA;

    &:focus-within {
        background-color: #ebeff5
    }

    & > div:nth-child(1) {
        background-color: ${props => props.idx === 0 ? "#0088FF" : "#FDA946"};
        border: solid 1px ${props => props.idx === 0 ? "#0088FF" : "#FDA946"};
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px 0 0 8px;
    }
    & > input {
        flex: 1;
        min-width: 0px;
        background-color: transparent;
        border: solid 1px ${props => props.idx === 0 ? "#0088FF" : "#FDA946"};
        border-right: none;
        color: #333;
        padding: 8px 8px 8px 12px;
        outline: none;
    }
`;

const ButtonContainer = styled.div<{idx: number}>`
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ccc;
    font-size: 20px;
    gap: 4px;
    background-color: transparent;
    border: solid 1px ${props => props.idx === 0 ? "#0088FF" : "#FDA946"};
    border-left: none;
    border-radius: 0 8px 8px 0;
    padding: 0 4px 0 4px;

    & div {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        cursor: pointer;
        &:hover {
            color: #0088FF;
        }
    }
`;

const PromptContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0px;
    width: 100%;
    border-radius: 8px;

    & > textarea:nth-child(1) {
        border-radius: 8px 8px 0 0;
        border-bottom: solid 1px #ddd;
        height: 40px;
    }
    & > textarea:nth-child(2) {
        border-radius: 0 0 8px 8px;
    }
`;

const PromptText = styled.textarea`
    font-size: 14px;
    padding: 8px 12px;
    background-color: #F5F7FA;
    height: 120px;
    color: #333;
    outline: none;

    &:focus {
        background-color: #ebeff5;
    }

    &::-webkit-scrollbar {
        width: 8px;
    }
    &::-webkit-scrollbar-thumb {
        border-radius: 4px;
        background: #ddd;
    }
    &::-webkit-scrollbar-track {
        background: none;
    }
`;


export default PromptingSection;