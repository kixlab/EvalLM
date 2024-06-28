import React, { useState, useRef } from 'react';
import styled from 'styled-components';

import { InputData, Prompt } from '../types';

interface Props {
    inputSet: InputData[];
    setInputSet: (inputSet: InputData[]) => void;
    inputClusters: string[][];
    setInputClusters: (inputClusters: string[][]) => void;
    sampledInputIds: string[];
    testInputIds: string[];
    addInputSamples: (sampledInputs: InputData[]) => void;
    openPanel: string;
    setOpenPanel: (panel: string) => void;
    prompts: Prompt[];
    setPrompts: (prompts: Prompt[]) => void;
}

const SamplingSection = ({
    inputSet,
    setInputSet,
    inputClusters,
    setInputClusters,
    sampledInputIds,
    testInputIds,
    addInputSamples,
    openPanel,
    setOpenPanel,
    prompts,
    setPrompts
}: Props) => {
    const [numSamples, setNumSamples] = useState<number>(3);
    const fileUploadRef = useRef<HTMLInputElement>(null);
    const [filename, setFilename] = useState<string>("");

    const sampleDiversely = () => {
        if (inputClusters.length >= numSamples) {
            var availableClusters = inputClusters.map((cluster) => cluster.filter((inputId) => !sampledInputIds.includes(inputId)));
            var totalN = availableClusters.reduce((acc, cluster) => acc + cluster.length, 0);
            var probabilities: number[] = availableClusters.map((cluster) => cluster.length / totalN);
            var cumProbabilities: number[] = [];
            probabilities.forEach((prob, idx) => {
                cumProbabilities.push(prob);
                if(idx !== 0) {
                    cumProbabilities[idx] += cumProbabilities[idx - 1];
                }
            })
    
            var sampledInputs: InputData[] = [];
            while(true) {
                // choose a random cluster
                const randomNum = Math.random();
                const clusterIdx = cumProbabilities.findIndex((cumProb) => cumProb > randomNum);
                const cluster = availableClusters[clusterIdx];
                if(cluster.length === 0) continue;
                // choose a random input from the cluster that is not in used
                const inputIdx = Math.floor(Math.random() * cluster.length);
                const inputId = cluster[inputIdx];
                if(sampledInputs.some((data) => data.id === inputId)) continue;
                sampledInputs.push(inputSet.find((inputData) => inputData.id === inputId)!);
                // remove the input from the available clusters
                availableClusters[clusterIdx].splice(inputIdx, 1);
    
                if(sampledInputs.length === numSamples) break;
            }
            addInputSamples(sampledInputs);
        }
    }

    const openSamplingPanel = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if(inputSet.length === 0) return;
        e.stopPropagation();
        if(openPanel === "sampling") {
            setOpenPanel("");
        } else {
            setOpenPanel("sampling");
        }
    }

    const handleFileUpload = () => {
        fileUploadRef.current?.click();
    }
    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if(!file) return;
        // if not json, reject
        if(file.type !== "application/json") {
            alert("Please upload a JSON file of format: [{\"input\": text, \"outputs\": [text, text], (optional) \"cluster\": number}, ...]");
            return;
        }
        
        setFilename(file.name);
        
        // read data from json file
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target!.result as string);
                var newClusters: string[][] = [];
                const newInputSet = data.map((entry: any, idx: number) => {
                    var cluster = "cluster" in entry ? entry.cluster : idx;
                    if(newClusters.length < cluster + 1) {
                        for(var i = newClusters.length; i < cluster + 1; i++) {
                            newClusters.push([]);
                        }
                    }
                    newClusters[cluster].push(`sample-${idx}`);
                    if(!("input" in entry)) throw new Error("Input field is missing in the JSON file");
                    return {
                        id: `sample-${idx}`,
                        text: entry.input,
                        outputs: entry.outputs
                    }
                });
                // check if outputs exist
                if(newInputSet.some((input: InputData) => input.outputs !== undefined)) {
                    // add predefined prompts
                    setPrompts([...prompts, {
                        id: "<PREDEFINED_PROMPT_1>",
                        name: "Predefined Prompt 1",
                        systemPrompt: "",
                        userPrompt: "",
                    }, {
                        id: "<PREDEFINED_PROMPT_2>",
                        name: "Predefined Prompt 2",
                        systemPrompt: "",
                        userPrompt: ""
                    }])
                }

                setInputSet(newInputSet);
                setInputClusters(newClusters);
            } catch(e) {
                alert("Please upload a JSON file of format: [{\"input\": text, \"outputs\": [text, text], (optional) \"cluster\": number}, ...]");
                fileUploadRef.current!.value = "";
                setFilename("");
            }
        }
        reader.readAsText(file);
    }

    return (
        <Container>
            <Title>Input Samples</Title>
            <DiverseContainer>
                <Button onClick={sampleDiversely} color="#0088FF" isActive={inputSet.length > 0}>
                    <span></span>
                    <span>Sample Diversely</span>
                    <i className="fa-solid fa-shuffle"></i>
                </Button>
                <NumberInput
                    type="number"
                    min="1"
                    max="100"
                    value={numSamples}
                    onChange={(e) => setNumSamples(parseInt(e.target.value))}
                />
            </DiverseContainer>
            <Button 
                style={{"justifyContent": "space-between"}}
                onClick={openSamplingPanel}
                color="#999999"
                isActive={inputSet.length > 0}
                isPressed={openPanel === "sampling"}
            >
                <span></span>
                <span>
                    Sample Manually
                    &nbsp;&nbsp;
                    <i className="fa-solid fa-hand"></i>
                </span>
                <i className="fa-solid fa-chevron-right"></i>
            </Button>
            {inputSet.length === 0 && (
                <Button 
                    onClick={handleFileUpload} 
                    color={filename ? "#999999" : "#0088FF"}
                    isActive={true}
                > 
                    <span>Upload Samples</span>
                    <i className="fa-solid fa-arrow-up-from-bracket"></i>
                </Button>
            )}
            <input type="file" ref={fileUploadRef} style={{display: 'none'}} onChange={handleFileChange} />
            {filename && <div style={{flex: 1, textAlign: "center", color: "#999"}}>{filename}</div>}
            <InformationContainer>
                {sampledInputIds.length > 0 ? (
                    <div>
                        <div>
                            Sampled:&nbsp;
                            <b>{sampledInputIds.length}</b>&nbsp;
                            ({(sampledInputIds.length / inputSet.length * 100).toFixed(1)}%)
                        </div>
                        <div style={{color: "#ccc"}}>|</div>
                        <div>
                            In Validation:&nbsp;
                            <b>{testInputIds.length}</b>&nbsp;
                            ({(testInputIds.length / inputSet.length * 100).toFixed(1)}%)
                        </div>
                    </div>
                ) : (
                    <div>No samples uploaded...</div>
                )}
                <div>Total Input Data:&nbsp;<b>{inputSet.length}</b></div>
            </InformationContainer>
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

const Button = styled.button<{color: string, isActive?: boolean, isPressed?: boolean}>`
    height: 36px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: 6px;
    border: solid 2px #cccccc;
    background-color: #cccccc1A;
    color: #cccccc;
    font-size: 14px;
    font-weight: bold;
    cursor: default;

    ${(props) => props.isActive && (`
        border-color: ${props.color};
        background-color: ${props.color}1A;
        color: ${props.color};
        cursor: pointer;
        box-shadow: 0 4px 4px rgba(0,0,0,0.1);
        &:hover {
            background-color: ${props.color}33;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    `)}

    ${(props) => props.isPressed && (`
        background-color: ${props.color}33 !important;
        box-shadow: inset 0px 4px 4px rgba(0,0,0,0.1) !important;
    `)}
`;

const DiverseContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    width: 100%;
`;

const NumberInput = styled.input`
    width: 50px;
    height: 100%;
    border: solid 2px #ccc;
    border-radius: 8px;
    color: #555;
    font-size: 14px;
    text-align: center;

    &:focus {
        outline: none;
        background-color: rgba(0, 0, 0, 0.02)
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
`;

const InformationContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    font-size: 14px;

    & > div {
        display: flex;
        justify-content: center;
        gap: 4px;
    }
    & > div:first-child {
        color: #555;
    }
    & > div:last-child {
        color: #999;
    }   
`;

export default SamplingSection;
