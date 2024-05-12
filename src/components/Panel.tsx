
import React, { useEffect } from 'react';
import styled from 'styled-components';

import { PREDEFINED_CRITERIA } from './constants';
import { DataEntry, Prompt, InputData, Criterion } from '../types';

import EvaluationHistory from './EvaluationHistory';

interface Props {
    direction: string;
    openPanel: string;
    setOpenPanel: (panel: string) => void;
    panelData: any;
    prompts: Prompt[];
    selectedPrompts: string[];
    changeSelectedPrompt: (promptIdx: number, promptId: string) => void;
    inputSet: InputData[];
    sampledInputs: string[];
    addInputSamples: (sampledInputs: InputData[]) => void;
    criteria: Criterion[];
    createCriterion: (name: string, description: string) => void;
    history: DataEntry[]
}

const Panel = ({
    direction,
    openPanel,
    setOpenPanel,
    panelData,
    prompts,
    selectedPrompts,
    changeSelectedPrompt,
    inputSet,
    sampledInputs,
    addInputSamples,
    criteria,
    createCriterion,
    history
}: Props) => {
    useEffect(() => {
        if(direction === "left") {
            if(openPanel === "prompt" || openPanel === "sampling") {
                const panel = document.getElementById('panel-left');
                if(!panel) return;
                // move panel to right of the input container
                const inputContainer = document.getElementById('input-container');
                if(!inputContainer) return;

                const inputContainerRect = inputContainer.getBoundingClientRect();
                panel.style.left = inputContainerRect.right + 'px';
            } else {
                const panel = document.getElementById('panel-left');
                if(!panel) return;
                panel.style.left = "-400px";
            }
        } else {
            if(openPanel === "criteria" || openPanel === "history") {
                const panel = document.getElementById('panel-right');
                if(!panel) return;
                // move panel to right of the input container
                const evalContainer = document.getElementById('eval-container');
                if(!evalContainer) return;

                const evalContainerRect = evalContainer.getBoundingClientRect();
                panel.style.right = evalContainerRect.width + 'px';
            } else {
                const panel = document.getElementById('panel-right');
                if(!panel) return;
                panel.style.right = "-400px";
            }
        }
    }, [openPanel, direction]);

    const leftPanelConstructor = () => {
        var panel = <><PanelTitle></PanelTitle><PanelContent></PanelContent></>;
        if(openPanel === "prompt") {
            panel = (<>
                <PanelTitle>
                    Select 
                    <span style={{backgroundColor: panelData.promptIdx === 0 ? "#0088FF" : "#FDA946"}}>{panelData.promptIdx === 0 ? "First" : "Second"}</span> 
                    Prompt
                </PanelTitle>
                <PanelContent>
                    {prompts.map((prompt) => {
                        var idxInSelected = selectedPrompts.indexOf(prompt.id);
                        if(idxInSelected !== -1) {
                            return (
                                <PromptPanelItem
                                    key={prompt.id}
                                    disabled={true}
                                    color={idxInSelected === 0 ? "#0088FF" : "#FDA946"}
                                >
                                    <div>{prompt.name}</div>
                                    <div>{prompt.systemPrompt}</div>
                                    <div>{prompt.userPrompt}</div>
                                </PromptPanelItem>
                            )
                        } else {
                            return (
                                <PromptPanelItem
                                    key={prompt.id}
                                    onClick={() => {
                                        changeSelectedPrompt(panelData.promptIdx, prompt.id);
                                        setOpenPanel("");
                                    }}
                                    color={"#ddd"}
                                >
                                    <div>{prompt.name}</div>
                                    <div>{prompt.systemPrompt}</div>
                                    <div>{prompt.userPrompt}</div>
                                </PromptPanelItem>
                            )
                        }
                    })}
                </PanelContent>
            </>);
        } else if(openPanel === "sampling") {
            panel = (<>
                <PanelTitle> Input Samples </PanelTitle>
                <PanelContent>
                    {inputSet.map((input) => {
                        var isUsed = sampledInputs.includes(input.id);
                        return (
                            <InputPanelItem key={input.id} used={isUsed} onClick={() => !isUsed && addInputSamples([input])}>
                                {input.text}
                            </InputPanelItem>
                        );
                    })}
                </PanelContent>
            </>);
        }
        return panel;
    }

    const rightPanelConstructor = () => {
        var panel = <><PanelTitle></PanelTitle><PanelContent></PanelContent></>;
        if(openPanel === "criteria") {
            panel = (<>
                <PanelTitle> Pre-Defined Criteria </PanelTitle>
                <PanelContent>
                    {PREDEFINED_CRITERIA.map((criterion) => {
                        const isUsed = criteria.some((c) => c.name === criterion.name && c.description === criterion.description);
                        if(!isUsed) {
                            return (
                                <CriterionPanelItem key={criterion.name} onClick={() => createCriterion(criterion.name, criterion.description)}>
                                    <div>{criterion.name}</div>
                                    <div>{criterion.description}</div>
                                    <div>
                                        From&nbsp; 
                                        <a href={criterion.reference} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                            "{criterion.paper}"
                                        </a>
                                    </div>
                                </CriterionPanelItem>
                            )
                        } else {
                            return (
                                <CriterionPanelItem key={criterion.name} used={true}>
                                    <div>{criterion.name}</div>
                                    <div>{criterion.description}</div>
                                    <div>
                                        From&nbsp;
                                        <a href={criterion.reference} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                            "{criterion.paper}"
                                        </a>
                                    </div>
                                </CriterionPanelItem>
                            )
                        }
                    })}
                </PanelContent>
            </>)
        } else if(openPanel === "history") {
            panel = (<>
                <PanelTitle>Evaluation History</PanelTitle>
                <PanelContent>
                    <EvaluationHistory history={history}/>
                </PanelContent>
            </>)
        }

        return panel;
    }

    return (
        <PanelContainer 
            id={'panel-' + direction}
            style={direction === "left" ? 
                {left: "-400px", boxShadow: "2px 2px 4px 0 rgba(0,0,0,0.1)"} : 
                {right: "400px", boxShadow: "-2px 2px 4px 0 rgba(0,0,0,0.1)"}
            }
            onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => e.stopPropagation()}
        >
            {direction === "left" ? leftPanelConstructor() : rightPanelConstructor()}
        </PanelContainer>
    )
}

const PanelContainer = styled.div`
    position: absolute;
    display: flex;
    top: 0;
    width: 400px;
    height: 100%;
    z-index: 4;
    transition: 0.2s ease-in-out;
    height: 100%;
    flex-direction: column;
`;

const PanelTitle = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 16px;
    font-weight: 500;
    color: #555;
    padding: 12px;
    border-bottom: 1px solid #ddd;
    background-color: #ffffffee;

    & > span {
        display: inline-block;
        padding: 0 8px;
        height: 24px;
        color: #fff;
        border-radius: 8px;
    }
`;

const PanelContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    flex: 1;
    text-align: left;
    padding: 12px;
    background-color: #fefefeee;

    &::-webkit-scrollbar {
        width: 8px;
    }
    &::-webkit-scrollbar-thumb {
        border-radius: 4px;
        background: #ccc;
    }
    &::-webkit-scrollbar-track {
        background: none;
    }
`;

const PromptPanelItem = styled.div<{color: string, disabled?: boolean}>`
    display: flex;
    flex-direction: column;
    opacity: ${props => props.disabled ? 0.3 : 1};
    white-space: pre-wrap;

    & div:nth-child(1) {
        padding: 8px 12px;
        font-size: 12px;
        font-weight: bold;
        border-radius: 8px 8px 0 0;
        border: solid 1px ${props => props.color};
        cursor: ${props => props.disabled ? "default" : "pointer"};
        background-color: ${props => props.disabled ? props.color + "6a" : "#F5F7FA"};
    }
    & div:nth-child(2) {
        font-size: 12px;
        padding: 8px 12px;
        border: solid 1px ${props => props.color};
        border-top: none;
        cursor: ${props => props.disabled ? "default" : "pointer"};
        background-color: ${props => props.disabled ? props.color + "6a" : "#F5F7FA"};
    }
    & div:nth-child(3) {
        font-size: 12px;
        padding: 8px 12px;
        border-radius: 0 0 8px 8px;
        border: solid 1px ${props => props.color};
        border-top: none;
        cursor: ${props => props.disabled ? "default" : "pointer"};
        background-color: ${props => props.disabled ? props.color + "6a" : "#F5F7FA"};
    }

    &:hover {
        & div {
            background-color: ${props => props.disabled ? props.color + "6a" : "#0088FF1a"};
            border-color: ${props => props.disabled ?  props.color : "#0088FF"};
        }
    }
`;

const InputPanelItem = styled.div<{used: boolean}>`
    display: flex;
    opacity: ${props => props.used ? 0.3 : 1};
    padding: 8px 12px;
    font-size: 12px;
    border-radius: 8px;
    border: solid 1px #ddd;
    cursor: pointer;
    background-color: #F5F7FA;
    white-space: pre-wrap;

    &:hover {
        background-color: #0088FF1a;
        border-color: #0088FF;
    }
`;

const CriterionPanelItem = styled.div<{used?: boolean}>`
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    cursor: pointer;
    background-color: #F5F7FA;
    border: solid 1px #ddd;
    white-space: pre-wrap;

    ${props => props.used && `
        opacity: 0.3;
        cursor: default;
        &:hover {
            background-color: #F5F7FA;
            outline: none;
        }
    `}

    & > div:first-child {
        padding: 8px 12px;
        font-size: 12px;
        color: #333;
        font-weight: bold;
    }

    & > div:nth-child(2) {
        padding: 8px 12px;
        font-size: 12px;
        color: #555;
        border-top: solid 1px #E9E9E9;
    }

    & > div:nth-child(3) {
        padding: 0px 12px 8px 12px;
        font-size: 10px;
        color: #999;

        & > a {
            font-style: italic;
            &:hover {
                text-decoration: underline;
                color: #0088ff99;
            }
        }
    }

    &:hover {
        outline: solid 1px #0088ff99;
        background-color: #ebeff5;
    }
`;


export default Panel;