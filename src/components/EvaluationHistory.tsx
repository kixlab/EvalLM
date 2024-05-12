import React, { useState } from 'react';
import styled from 'styled-components';

import { DataEntry, Prompt, Criterion } from '../types';

interface Props {
    history: DataEntry[];
}

const colorKey = ["#0088FF", "#FDA946", "#CCCCCC"];

const checkEqualObj = (data1: any, data2: any) => {
    const keys = Object.keys(data1);
    const isPrompt = data1[keys[0]].includes('p');

    for(var i = 0; i < keys.length; i++) {
        if(isPrompt && keys[i] === 'name') continue;
        if(data1[keys[i]] !== data2[keys[i]]) {
            return false;
        }
    }
    return true;
}

const checkEqualList = (data1: any[], data2: any[]) => {
    if(data1.length !== data2.length) {
        return false;
    }
    // use checkEqualObj
    for(var i = 0; i < data1.length; i++) {
        if(!checkEqualObj(data1[i], data2[i])) {
            return false;
        }
    }
    return true;
}

const summarizeHistory = (history: DataEntry[]) => {
    // group by prompt
    const results : {
        'section': string,
        'area': string,
        'prompts': Prompt[],
        'criteria': Criterion[],
        'evaluations': {[key: string]: number[]}
    }[] = [];
    history.forEach((entry) => {
        const section = entry.isDeploy ? 'deploy' : 'develop';
        const area = entry.area;
        const prompts = entry.outputs.map((o) => o.prompt);
        const criteria = entry.evaluations.map((e) => e.criterion);

        if(section === "develop" && area === "test") return;

        var closestSectionIdxRev = results.reverse().findIndex((r) => r.section === section);
        var closestSectionIdx = closestSectionIdxRev === -1 ? -1 : results.length - closestSectionIdxRev - 1;
    
        if(
            closestSectionIdx === -1 || 
            !checkEqualList(results[closestSectionIdx].prompts, prompts) ||
            !checkEqualList(results[closestSectionIdx].criteria, criteria)
        ) {
            var evaluations: {[key: string]: number[]} = {};
            criteria.forEach((c) => {
                evaluations[c.id] = [0, 0, 0];
            });
            results.push({
                section: section,
                area: area,
                prompts: prompts,
                criteria: criteria,
                evaluations: evaluations
            })
            closestSectionIdx = results.length - 1;
        }
        
        for(var i = 0; i < entry.evaluations.length; i++) {
            const e = entry.evaluations[i];
            const c = e.criterion;
            const idx = e.overallWinner;
            results[closestSectionIdx].evaluations[c.id][idx] += 1;
        }
    });
    return results;
}


const EvaluationHistory = ({
    history
}: Props) => {
    const [selectedInfo, setSelectedInfo] = useState<{idx: number, type: string, id: string}>({idx: -1, type: "", id: ""});

    const summary = summarizeHistory(history);

    const createEvaluationBlocks = (idx: number, count: number) => {
        const blocks = [];
        for(var i = 0; i < count; i++) {
            blocks.push(
                <div key={'e-' + idx + '-' + i} style={{backgroundColor: colorKey[idx]}}></div>
            )
        }
        return blocks;
    }

    const handleSelectInfo = (e: any, idx: number, type: string, id: string) => {
        e.stopPropagation();
        if(selectedInfo.idx === idx && selectedInfo.type === type && selectedInfo.id === id) {
            setSelectedInfo({idx: -1, type: "", id: ""});
            return;
        }
        setSelectedInfo({idx: idx, type: type, id: id});
    }
    
    return (
        <Container onClick={() => setSelectedInfo({idx: -1, type: "", id: ""})}>
            {summary.map((data, i) => {
                const prompts = data.prompts;
                const criteria = data.criteria;
                const evaluations = data.evaluations;

                const criteriaComponents = criteria.map((c, j) => {
                    return [
                        j > 0 && (
                            <ConnectorRow key={'lc-'+i+'-'+j} style={{height: "2px"}} firstConnect={true} secondConnect={true}>
                            </ConnectorRow>
                        ),
                        <CriteriaRow key={'c-' + i + '-' + j}>
                            <CriteriaLabel 
                                color={c.color}
                                onClick={(e) => handleSelectInfo(e, i, "criteria", c.id)}
                            >
                                <div>{c.name}</div>
                                <div></div>
                                <div></div>
                            </CriteriaLabel>
                            <EvaluationContainer>
                                <div className="line" style={{backgroundColor: c.color + "80"}}/>
                                {[0, 2, 1].map((idx) => {
                                    return createEvaluationBlocks(idx, evaluations[c.id][idx]);
                                })}
                            </EvaluationContainer>
                            <div></div>
                        </CriteriaRow>,
                        selectedInfo.idx === i && selectedInfo.type === "criteria" && selectedInfo.id === c.id && (
                            <AdditionalInfo onClick={(e) => e.stopPropagation()}>
                                <InfoHeader>
                                    Criteria:&nbsp; 
                                    <span style={{fontWeight: 500, color: c.color}}>{c.name}</span>
                                </InfoHeader>
                                <InfoContent>
                                    {c.description}
                                </InfoContent>
                            </AdditionalInfo>
                        )
                    ];
                });

                const section = data.section === "deploy" ? "Deployment" : "Development";
                const changedSection = i === 0 || (summary[i-1].section === "deploy" ? "Deployment" : (summary[i-1].area === "test" ? "Validation" : "Development")) !== section;

                const isSamePrompt1 = i > 0 && checkEqualObj(prompts[0], summary[i-1].prompts[0]);
                const isSamePrompt2 = i > 0 && checkEqualObj(prompts[1], summary[i-1].prompts[1]);

                return [
                    changedSection && (
                        <SectionSeparator style={i === 0 ? {marginTop: "0px"} : {}}>
                            {section}
                            <div></div>
                        </SectionSeparator>
                    ),
                    i > 0 && !changedSection && (
                        <ConnectorRow 
                            key={'lp-'+i} 
                            style={{height: "8px"}} 
                            firstConnect={!changedSection && isSamePrompt1} 
                            secondConnect={!changedSection && isSamePrompt2}
                        ></ConnectorRow>
                    ),
                    <PromptRow key={'p-' + i}>
                        <div>
                            {changedSection || !isSamePrompt1 ? 
                                <Circle color="#0088ff"></Circle> :
                                <Line color="#0088ff"></Line>
                            }
                            {changedSection || !isSamePrompt1 ?
                                <PromptLabel 
                                    onClick={(e) => handleSelectInfo(e, i, "prompt", prompts[0].id)}
                                >
                                    {prompts[0].name}
                                </PromptLabel> :
                                <div></div>
                            }
                        </div>
                        <div>
                            {changedSection || !isSamePrompt2 ?
                                <PromptLabel 
                                    onClick={(e) => handleSelectInfo(e, i, "prompt", prompts[1].id)}
                                >
                                    {prompts[1].name}
                                </PromptLabel> :
                                <div></div>
                            }
                            {changedSection || !isSamePrompt2 ? 
                                <Circle color="#FDA946"></Circle> :
                                <Line color="#FDA946"/>
                            }
                        </div>
                    </PromptRow>,
                    selectedInfo.idx === i && selectedInfo.type === "prompt" && selectedInfo.id === prompts[0].id && (
                        <AdditionalInfo onClick={(e) => e.stopPropagation()}>
                            <InfoHeader>
                                Prompt:&nbsp;
                                <span style={{fontWeight: 500, color: "#0088ff"}}>{prompts[0].name}</span>
                            </InfoHeader>
                            <InfoContent>
                                {prompts[0].systemPrompt}<hr/>
                                {prompts[0].userPrompt}
                            </InfoContent>
                        </AdditionalInfo>
                    ),
                    selectedInfo.idx === i && selectedInfo.type === "prompt" && selectedInfo.id === prompts[1].id && (
                        <AdditionalInfo onClick={(e) => e.stopPropagation()}>
                            <InfoHeader>
                                Prompt:&nbsp;
                                <span style={{fontWeight: 500, color: "#FDA946"}}>{prompts[1].name}</span>
                            </InfoHeader>
                            <InfoContent>
                                {prompts[1].systemPrompt}<hr/>
                                {prompts[1].userPrompt}
                            </InfoContent>
                        </AdditionalInfo>
                    ),
                    <ConnectorRow key={'l-'+i} style={{height: "8px"}} firstConnect={true} secondConnect={true}>
                    </ConnectorRow>,
                    ...criteriaComponents
                ];
            })}

        </Container>
    )
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    font-size: 12px;
`;

const PromptRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 8px 0 92px;

    & > div {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 4px;
        color: #555;
    }
`;

const ConnectorRow = styled.div<{firstConnect: boolean, secondConnect: boolean}>`
    display: flex;
    flex-direction: row;
    align-items: center;
    width: calc(100% - 100px - 16px);
    margin: 0 16px 0 100px;

    border-left: solid 2px ${props => props.firstConnect ? '#0088ff80' : 'transparent'};
    border-right: solid 2px ${props => props.secondConnect ? '#FDA94680' : 'transparent'};
`;

const Circle = styled.div<{color: string}>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: ${props => props.color};
`;

const Line = styled.div<{color: string}>`
    height: 18px;
    width: 2px;
    margin: 0 8px;
    background-color: ${props => props.color}80;
`;

const CriteriaRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: #f0f0f0;
    border-radius: 2px;

    & > div:last-child {
        height: 100%;
        width: 18px;
        border-left: solid 2px #FDA94680;
    }
`;

const CriteriaLabel = styled.div<{color: string}>`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    color: #555;
    width: 102px;
    height: 100%;

    border-right: solid 2px #0088ff80;

    cursor: pointer;
    &:hover {
        font-weight: 500;
    }

    & > div:first-child {
        flex: 1;
        text-align: right;
        padding-right: 4px;
    }
    & > div:nth-child(2) {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        background-color: ${props => props.color};
    }
    & > div:last-child {
        height: 2px;
        width: 8px;
        background-color: ${props => props.color}80;
    }
`;

const EvaluationContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex: 1;
    position: relative;

    & > div {
        height: 40px;
        width: 12px;
        border-radius: 2px;
        border: solid 1px #ffffff99;
        z-index: 1;
    }
    & > .line {
        position: absolute;
        top: 19px;
        left: 0;
        width: 100%;
        height: 2px;
        border: none;
        border-radius: 0px;
    }
`;

const PromptLabel = styled.div`
    cursor: pointer;
    &:hover {
        font-weight: 500;
    }
`;

const AdditionalInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
    box-shadow: 0 4px 4px rgba(0, 0, 0, 0.1);
    gap: 4px;
    border-radius: 4px;
    border: solid 1px #ddd;
    white-space: pre-wrap;
`;

const InfoHeader = styled.div`
    font-size: 14px;
`;

const InfoContent = styled.div`
    font-size: 12px;
    color: #555;
`;

const SectionSeparator = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    font-weight: 600; 
    color: #999; 
    margin-top: 12px;
    gap: 4px;
    margin-bottom: 4px;

    & > div:last-child {
        flex: 1;
        height: 1px;
        background-color: #ccc;
    }
`;

export default EvaluationHistory;