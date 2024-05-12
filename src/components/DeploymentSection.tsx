import React, { useContext } from 'react';
import styled from 'styled-components';

import { GenerateContext } from '../api/GenerateContext';

import { DataEntry, InputData } from '../types';

interface Props {
    deploySampleSize: number;
    setDeploySampleSize: (sampleSize: number) => void;
    deployN: number;
    setDeployN: (n: number) => void;
    altEvaluator: string;
    setAltEvaluator: (evaluator: string) => void;
    deployTable: DataEntry[];
    inputSet: InputData[];
    disabled: boolean;
}

const DeploymentSection = ({
    deploySampleSize,
    setDeploySampleSize,
    deployN,
    setDeployN,
    altEvaluator,
    setAltEvaluator,
    deployTable,
    inputSet,
    disabled
}: Props) => {
    const { modelDictionary, apiKeys } = useContext(GenerateContext);

    const sampledInputIds = deployTable.map((entry) => entry.input.id);

    return (
        <Outer>
            <Title>Evaluation Settings</Title>
            <Container>
                <LabelContainer>
                    <div>Sample Size</div>
                    <div>Number of Trials</div>
                    <div>Alternative Evaluator</div>
                </LabelContainer>
                <InputContainer>
                    <NumberInput
                        type="number"
                        min="1"
                        max={inputSet.length}
                        value={deploySampleSize}
                        onChange={(e) => setDeploySampleSize(parseInt(e.target.value))}
                    />
                    <NumberInput
                        type="number"
                        min="1"
                        max={10}
                        value={deployN}
                        onChange={(e) => setDeployN(parseInt(e.target.value))}
                        style={disabled ? {color: "#777", backgroundColor: "#eee"} : {}}
                        disabled={disabled}
                    />
                    <ModelSelect
                        value={altEvaluator}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAltEvaluator(e.target.value)}
                        style={disabled ? {color: "#777", backgroundColor: "#eee"} : {}}
                        disabled={disabled}
                    >
                        <option value="none">None</option>
                        {apiKeys["openai"].length > 0 && modelDictionary["openai"].map((model) => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                        {apiKeys["anthropic"].length > 0 && modelDictionary["anthropic"].map((model) => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                        {apiKeys["google"].length > 0 && modelDictionary["google"].map((model) => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </ModelSelect>
                </InputContainer>
            </Container>
            <InformationContainer>
                <div>
                    Sampled Data:&nbsp;
                    <b>{sampledInputIds.length}</b>&nbsp;
                    ({(sampledInputIds.length / inputSet.length * 100).toFixed(1)}%)
                </div>
                <div>Total Input Data:&nbsp;<b>{inputSet.length}</b></div>
            </InformationContainer>
        </Outer>
    )
}

const Outer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%
`;

const Container = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 8px;
`;

const Title = styled.div`
    font-size: 16px;
`;

const LabelContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #999;

    & > div {
        display: flex;
        height: 36px;
        align-items: center;
    }
`;

const InputContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;

    & > input {
        height: 36px;
        width: 100%;
    }

    & > select {
        height: 36px;
        width: 100%;
    }
`;

const NumberInput = styled.input`
    background-color: #F5F7FA;
    height: 120px;
    color: #333;
    outline: none;
    border-radius: 8px;
    font-size: 14px;
    text-align: center;

    &:focus {
        outline: none;
        background-color: #ebeff5;
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
`;

const ModelSelect = styled.select`
    border-radius: 8px;
    font-size: 14px;
    text-align: center;
    opacity: 1 !important;
    background-color: #F5F7FA;
    color: #333;
    outline: none;
    border-radius: 8px;

    &:focus {
        outline: none;
        background-color: #ebeff5;
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
        flex: 1;
        justify-content: center;
        align-items: center;
    }

    & > div:first-child {
        color: #999;
    }
    & > div:last-child {
        color: #ccc;
    }   
`;

export default DeploymentSection;