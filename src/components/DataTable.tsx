import React, { useState, useRef } from 'react';
import styled from 'styled-components';

import { Prompt, Criterion, DataEntry, EvaluationData, OutputData } from '../types';
import { STATUS } from './constants';

const getOverallWinner = (winners: number[]) => {
    if(winners[0] === -1) return -1;

    const counts = [0, 0, 0];
    for(let i = 0; i < winners.length; i++) {
        counts[winners[i]]++;
    }
    const maxCount = Math.max(...counts);
    const maxIndices = [];
    for(let i = 0; i < counts.length; i++) {
        if(counts[i] === maxCount) {
            maxIndices.push(i);
        }
    }
    if(maxIndices.length === 1) {
        return maxIndices[0];
    } else if(maxIndices.length === 2 && maxIndices.includes(2)) {
        return maxIndices[0] === 2 ? maxIndices[1] : maxIndices[0];
    } else {
        return 2;
    }
}

interface Props {
    dataTable: DataEntry[];
    prompts: Prompt[];
    selectedPrompts: string[];
    criteria: Criterion[];
    updateDataEntry: (dataEntryId: string, updatedProps: any) => void;
    deleteDataEntry: (dataEntryId: string) => void;
    changeWinner: (dataEntryId: string, criterionId: string, winner: number, isTest?: boolean) => void;
    changeSelectedEval: (dataEntryId: string, criterionId: string, selected: number) => void;
    addCriterion: (name: string, description: string) => void;
    updateCriterion: (criterionId: string, updatedProps: any) => void;
    resetSample: (id: string) => void;
    generateSample: (id: string) => void;
    evaluateSample: (id: string) => void;
}

const DataTable = ({
    dataTable,
    prompts,
    selectedPrompts,
    criteria,
    updateDataEntry,
    deleteDataEntry,
    changeWinner,
    changeSelectedEval,
    addCriterion,
    updateCriterion,
    resetSample,
    generateSample,
    evaluateSample
}: Props) => {
    const outerRef = useRef<HTMLDivElement>(null);
    const [hasScrolled, setHasScrolled] = useState<boolean>(false);
    const [currArea, setCurrArea] = useState<string>("stage");
    const [hoveredEvidence, ] = useState<{dataId: string, outputIdx: number, evidenceIdx: number} | null>(null);

    const highlightText = (dataId: string, outputIdx: number, text: string, evidence: string[], color: string) => {
        var currIdx = 0;
        var spans = [];
        var key = 0;

        var mapped = evidence.map((evidenceText, evidenceIdx) => {
            return { index: evidenceIdx, value: evidenceText };
        });

        // sort in order evidence appears in text
        mapped.sort((a, b) => {
            return text.toLowerCase().indexOf(a.value.toLowerCase()) - text.toLowerCase().indexOf(b.value.toLowerCase());
        });

        mapped.forEach(({index, value}) => {
            const startIdx = text.toLowerCase().indexOf(value.toLowerCase(), currIdx);
            const endIdx = startIdx + value.length;
            if(startIdx !== -1) {
                spans.push(<span key={key}>{text.substring(currIdx, startIdx)}</span>)
                var isHovered = hoveredEvidence !== null && 
                                hoveredEvidence.dataId === dataId && 
                                hoveredEvidence.outputIdx === outputIdx && 
                                hoveredEvidence.evidenceIdx === index;
                spans.push(
                    <span 
                        key={key+1} 
                        style={{backgroundColor: color + (isHovered ? "aa" : "4d"), borderRadius: "4px"}}
                    >
                        {text.substring(startIdx, endIdx)}
                    </span>
                )
                currIdx = endIdx;
                key += 2;
            }
        });
        spans.push(<span>{text.substring(currIdx, text.length)}</span>)
        if(!evidence.includes("{{WHOLE}}")) {
            return <span>{spans}</span>
        } else {
            return <span style={{backgroundColor: color + "4d"}}>
                {spans}
            </span>
        }
    }

    const createOutputComponents = (dataId: string, output: OutputData | null, idx: number, evidence: string[], color: string) => {
        if(!output) {
            return (
                <DoubleInnerText key={idx}>
                    <TextHeader>Prompt...</TextHeader>
                    <TextContent style={{color: "#999"}}>No outputs generated...</TextContent>
                </DoubleInnerText>
            )
        }
        const { prompt, text } = output;
        const currentPrompt = prompts.find((p) => p.id === prompt.id);
        const isPromptChanged = currentPrompt?.userPrompt !== prompt.userPrompt || currentPrompt?.systemPrompt !== prompt.systemPrompt;
        const promptName = currentPrompt?.name;

        return (
            <DoubleInnerText key={idx}>
                <TextHeader style={{color: idx === 0 ? "#0088FF" : "#FDA946"}}>
                    <span>{promptName}</span>
                    {isPromptChanged ? <Dot style={{display: "inline-block", position: "relative", top: "auto", right: "auto", marginLeft: "4px"}}></Dot> : null}
                </TextHeader>
                <TextContent style={{opacity: isPromptChanged ? 0.7 : 1}}>
                    {highlightText(dataId, idx, text, evidence, color)}
                </TextContent>
            </DoubleInnerText>
        )
    }

    const createEvaluationRow = (dataId: string, evaluation: EvaluationData, idx: number, isSelected: boolean, isTest: boolean, pastCriteria: Criterion[]) => {
        const dataEntry = (dataTable.find((entry) => entry.id === dataId) as DataEntry);

        var { criterion, overallWinner, winners, scores, agreement, testOverallWinner, testWinners, similarCriteria } = evaluation;
        var isCriterionChanged = false;
        var currCriterion = criteria.find((temp) => criterion.id === temp.id);
        if(currCriterion) {
            if(overallWinner === -1) {
                criterion = currCriterion;
            } else {
                isCriterionChanged = criterion.name !== currCriterion.name || criterion.description !== currCriterion.description;
            }
        }
        var isNotAgreement = agreement < 0.75;
        if(winners.length === 1) {
            isNotAgreement = Math.abs(scores[0][0] - scores[0][1]) === 1;
        }

        var similarColor = "";
        if(similarCriteria.length > 0) {
            var similarCriterion = pastCriteria.find((temp) => temp.name === similarCriteria[0]);
            if(similarCriterion) {
                similarColor = similarCriterion.color;
            } else {
                similarColor = "#fff";
            }
        }
        const isProcessing = dataEntry.status === STATUS.REFINING || dataEntry.status === STATUS.SUGGESTING;
        return ([
            <ScoreRow 
                key={idx} 
                criterionColor={criterion.color}
                isSelected={isSelected}
                isProcessing={isProcessing && isSelected}
                style={{height: "auto", borderRadius: idx === 0 ? "8px 8px 0 0" : "0px", }}
            >
                <CriteriaLabel onClick={() => !isProcessing && toggleCriterion(dataId, criterion.id)}>
                    {criterion.name}
                    {isCriterionChanged ? 
                        <Dot data-tooltip-id="tooltip" data-tooltip-content="Criterion has been updated since last evaluation."></Dot> :
                        ""
                    }
                </CriteriaLabel>
                {createWinnerLabels(
                    dataId,
                    criterion.id, 
                    !isTest ? overallWinner : testOverallWinner, 
                    !isTest ? winners : testWinners, 
                    isCriterionChanged, 
                    isTest, 
                    isNotAgreement,
                    similarColor
                )}
            </ScoreRow>,
            <RowDivider key={idx+"-divider"}></RowDivider>
        ])
    }

    const handleChangeWinner = (dataId: string, criterionId: string, prevWinner: number, winner: number, isTest?: boolean) => {
        if(prevWinner === winner) return;
        changeWinner(dataId, criterionId, winner, isTest);
    }

    const createWinnerLabels = (dataEntryId: string, criterionId: string, overallWinner: number, winners: number[], isCriterionChanged: boolean, isTest: boolean, isNotAgreement: boolean, similarColor?: string) => {
        var calculatedWinner = -1;
        if(winners) {
            calculatedWinner = getOverallWinner(winners);
        }
        const colors = ["#0088FF", "#FDA946", "#cccccc"];
        if(overallWinner === -1 && !isTest) {
            return (
                <Scores>
                    <div style={{border: "none"}}></div>
                    <Question 
                        style={{border: "none"}} 
                        data-tooltip-id="tooltip" 
                        data-tooltip-content=""
                    >?</Question>
                    <div style={{border: "none"}}></div>
                </Scores>
            );
        } else {
            return (
                <Scores style={{opacity: isCriterionChanged ? 0.7 : 1}}>
                    {[0, 2, 1].map((idx) => {
                        var innerElement = <></>;
                        if(calculatedWinner === idx) {
                            if(!isTest) {
                                if(calculatedWinner !== overallWinner) {
                                    innerElement = <i className="fa-solid fa-xmark" style={{fontSize: "18px", fontWeight: "bold", color: "#F98181"}}></i>
                                } else if(isNotAgreement) {
                                    innerElement = <Question style={{color: "#fff"}}>?</Question>
                                }
                            } else {
                                innerElement = <i className="fa-solid fa-circle"></i>
                            }
                        }
                        return (
                            <div 
                                key={idx} 
                                onClick={() => {handleChangeWinner(dataEntryId, criterionId, overallWinner, idx, isTest)}}
                                data-tooltip-id="tooltip"
                                data-tooltip-content={
                                    (idx === 0 ? "First prompt is " : idx === 2 ? "Prompts are " : "Second prompt is ") +
                                    (overallWinner === idx ? (idx !== 2 ? "the winner" : "tied") : (idx !== 2 ? "not the winner" : "not tied"))
                                }
                            >
                                <Circle color={colors[idx]} type={overallWinner === idx ? 1 : 0} similarColor={!isTest ? similarColor: ""}>
                                    {innerElement}
                                </Circle>
                            </div>
                        );
                    })}
                </Scores>
            )
        }
    }

    const toggleCriterion = (dataId: string, criterionId: string) => {
        const dataEntry = dataTable.find((dataEntry) => dataEntry.id === dataId);
        if(!dataEntry) return;
        var selectedCriterionId: string | null = criterionId;
        if(dataEntry.selectedCriterionId === criterionId) {
            selectedCriterionId = null;
        }
        updateDataEntry(dataEntry.id, {selectedCriterionId});
    }

    const createExplanationComponents = (dataId: string, explanation: string, color: string, isTest: boolean) => {
        return(
            <DoubleInnerText style={{paddingTop: "8px"}}>
                {explanation === "" ? 
                    <TextContent style={{color: "#999"}}>
                        {!isTest ? "Not evaluated yet..." : "Not validated yet..."}
                    </TextContent> :
                    <TextContent>
                        {
                            explanation.replaceAll('assistant', 'prompt').replaceAll('Assistant', 'Prompt')
                            //processReferences(explanation, dataId, i, color)
                        }
                    </TextContent>
                }
            </DoubleInnerText>
        );
    }

    const createEvaluationExplanations = (selectedEvaluation: EvaluationData, id: string, isTest: boolean, pastCriteria: Criterion[]) => {
        var { criterion, overallWinner, winners, scores, explanations, selected, similarCriteria } = selectedEvaluation;

        const currCriterion = (criteria.find((criterion) => criterion.id === selectedEvaluation.criterion.id) as Criterion);

        var color = criterion.color;
        var originalWinner = getOverallWinner(winners);
        var isEvaluated = overallWinner !== -1;
        var isCorrected = originalWinner !== overallWinner;
    
        if(isTest) {
            winners = selectedEvaluation.testWinners;
            overallWinner = selectedEvaluation.testOverallWinner;
            scores = selectedEvaluation.testScores;
            explanations = selectedEvaluation.testExplanations;
            originalWinner = getOverallWinner(winners);
            isEvaluated = winners[0] !== -1;
            isCorrected = isEvaluated && (originalWinner !== overallWinner);
        }

        var selectedScores = scores[selected];
        var selectedExplanation = explanations[selected];

        var evaluationContainers = document.getElementsByClassName("data-entry-evaluations");
        var evaluationContainerWidth = 0;
        if(evaluationContainers.length > 0) {
            evaluationContainerWidth = evaluationContainers[0].clientWidth;
        }

        var innerComponents = <></>;

        if(isTest || !isCorrected) {
            innerComponents = (<>
                {isEvaluated && (
                    <ExplanationSubheader>
                        <div>
                            <Circle color="#0088FF" type={winners[selected] === 0 ? 1 : 0} style={{color: winners[selected] === 0 ? "#fff" : "#0088FF", fontSize: "16px"}}>
                                {selectedScores[0]}
                            </Circle>
                        </div>
                        <div>
                            {winners[selected] === 0 ? "> Ratings >" : (winners[selected] === 1 ? "< Ratings <" : "= Ratings =")}
                        </div>
                        <div>
                            <Circle color="#FDA946" type={winners[selected] === 1 ? 1 : 0} style={{color: winners[selected] === 1 ? "#fff" : "#FDA946", fontSize: "16px"}}>
                                {selectedScores[1]}
                            </Circle>
                        </div>
                    </ExplanationSubheader>
                )}
                <DoubleExplainContainer>
                    {createExplanationComponents(id, selectedExplanation, color, isTest)}
                </DoubleExplainContainer>
                {!isTest && selected === 0 && similarCriteria.length > 0 && (
                    <div style={{display: "flex", justifyContent: "center", paddingTop: "8px", flexDirection: "row", gap: "8px", fontSize: "14px", color: "#999"}}>
                        Potential Overlap with: {similarCriteria.map((name, idx) => {
                            const c = pastCriteria.find((c) => c.name === name);
                            if(c) {
                                return <span key={idx} style={{color: c.color, fontWeight: "bold"}}>{c.name}</span>;
                            } else {
                                return <span key={idx} style={{color: "#999", fontWeight: "bold"}}>{name}</span>;
                            }
                        })}
                    </div>
                )}
                <ConfidenceContainer>
                    {[0, 2, 1].map((w) => {
                        return winners.map((winner, idx) => {
                            return winner === w && 
                                <Circle 
                                    style={{height: "16px", width: "16px"}} color={w === 0 ? "#0088FF" : (w === 1 ? "#FDA946" : "#cccccc")}
                                    type={selected === idx ? 1 : 0}
                                    onClick={() => changeSelectedEval(id, criterion.id, idx)}
                                ></Circle>;
                        });
                    })}
                </ConfidenceContainer>
            </>);
        } else if(isCorrected) {
            innerComponents = (<>
                <ExplanationSubheader>
                    <div>{!isTest? "Revision Suggestions" : "Corrected Evaluation"}</div>
                    <div style={{display: "flex", flexDirection: "row", gap: "8px"}}>
                        <Circle color={originalWinner === 0 ? "#0088FF" : (originalWinner === 1 ? "#FDA946" : (originalWinner === 2 ? "#cccccc" : "#ddd"))} type={0}>
                            {originalWinner !== -1 ? <i className="fa-solid fa-xmark" style={{fontSize: "18px", fontWeight: "bold", color: "#F98181"}}></i> : ""}
                        </Circle>
                        →
                        <Circle color={overallWinner === 0 ? "#0088FF" : (overallWinner === 1 ? "#FDA946" : "#cccccc")} type={1}></Circle>
                    </div>
                </ExplanationSubheader>
                {!isTest && (<>
                    <div style={{color: "#999", display: "flex", justifyContent: "center", padding: "4px 8px", fontSize: "14px"}}>
                        Original Description
                    </div> 
                    <SuggestionsContainer>
                        <Suggestion 
                            selected={currCriterion.description === selectedEvaluation.suggestions?.find((s) => s.name === "<ORIGINAL>")?.description}
                            onClick={() => updateCriterion(criterion.id, {description: selectedEvaluation.suggestions?.find((s) => s.name === "<ORIGINAL>")?.description})}
                        >
                            <div>{selectedEvaluation.suggestions?.find((s) => s.name === "<ORIGINAL>")?.description}</div>
                            <div></div>
                        </Suggestion>
                    </SuggestionsContainer>
                    <div style={{color: "#999", display: "flex", justifyContent: "center", padding: "4px 8px", fontSize: "14px"}}>
                        Suggestions
                    </div> 
                    {selectedEvaluation.suggestions && selectedEvaluation.suggestions.length > 1 ? (
                        <SuggestionsContainer>
                            {selectedEvaluation.suggestions.map((suggestion, idx) => {
                                if(suggestion.name === "<ORIGINAL>") return <></>;
                                return (
                                    <Suggestion 
                                        key={idx} 
                                        selected={currCriterion.description === suggestion.description}
                                        onClick={() => updateCriterion(criterion.id, {description: suggestion.description})}
                                    >
                                        <div>{suggestion.description}</div>
                                        <div>
                                            {[0, 2, 1].map((w) => {
                                                return suggestion.winners?.map((winner) => {
                                                    if(winner !== w) return <></>;
                                                    return (<Circle color={w === 0 ? "#0088FF" : (w === 1 ? "#FDA946" : "#cccccc")} type={1} style={{height: "16px", width: "16px"}}></Circle>);
                                                })
                                            })}
                                        </div>
                                    </Suggestion>
                                )
                            })}
                        </SuggestionsContainer>
                    ) : (
                        <div style={{color: "#ccc", display: "flex", justifyContent: "center", padding: "4px 8px 12px 8px", fontSize: "14px"}}>
                            Generating suggestions...
                        </div> 
                    )}
                </>)}
            </>)
        }

        return (
            <ExplainContainer>
                <OptionsContainer style={{width: "20px"}}></OptionsContainer>
                <TextContainer style={{opacity: 0, pointerEvents: "none"}}></TextContainer>
                <DoubleContainerOuter style={{outline: "solid 2px " + color}}>
                    <ExplanationHeader>
                        <div style={{color: color, flex: 1}}>
                            {criterion.name}
                        </div>
                    </ExplanationHeader>
                    {innerComponents}
                </DoubleContainerOuter>
                <EvaluationContainer style={{opacity: 0, pointerEvents: "none"}}>
                    <CriteriaScoreList style={{height: "0px", width: evaluationContainerWidth}}></CriteriaScoreList>
                </EvaluationContainer>
                <OptionsContainer style={{width: "20px"}}></OptionsContainer>
            </ExplainContainer>   
        )
    }

    const changeDataArea = (dataEntryId: string, currArea: string, isTest: boolean) => {
        if(isTest) {
            updateDataEntry(dataEntryId, {area: currArea === "test" ? "stage" : "test"});
        } else {
            updateDataEntry(dataEntryId, {area: currArea === "stage" ? "bank" : "stage"});
        }
    }

    const createDataRow = (dataEntry: DataEntry, isSelectedPrompts: boolean) => {
        const { id, input, outputs, evaluations, status, selectedCriterionId, area } = dataEntry;
        var outputList = outputs.length > 0 ? outputs : [null, null];
        var selectedEvaluation = evaluations.find((evaluation) => evaluation.criterion.id === selectedCriterionId);
        var isTest = area === "test";
        var pastCriteria = evaluations.map((evaluation) => evaluation.criterion);

        var evaluationComponents = <></>;
        if(selectedEvaluation) {
            evaluationComponents = createEvaluationExplanations(selectedEvaluation, id, dataEntry.area === "test", pastCriteria);
        }

        return (
            <EntryContainer key={id} style={{opacity: isSelectedPrompts ? 1 : 0.7}}>
                <DataContainer>
                    <OptionsContainer style={{fontWeight: "bold", width: "20px"}}>
                        {parseInt(id.split("-")[1]) + 1}
                    </OptionsContainer>
                    <TextContainer>
                        <TextHeader>Input</TextHeader>
                        <TextContent>{input.text}</TextContent>
                    </TextContainer>
                    <DoubleContainer isGenerating={status === STATUS.GENERATING}>
                        {outputList.map((output, idx) => {
                            if(selectedEvaluation) {
                                var selectedEvidence = !isTest ? selectedEvaluation.evidence[selectedEvaluation.selected] : selectedEvaluation.testEvidence[selectedEvaluation.selected];
                                var evidence = selectedEvidence[idx];
                                var color = selectedEvaluation.criterion.color;
                                return createOutputComponents(id, output, idx, evidence, color);
                            } else {
                                return createOutputComponents(id, output, idx, [], "");
                            }
                        })}
                    </DoubleContainer>
                    <EvaluationContainer className="data-entry-evaluations">
                        <CriteriaScoreList isEvaluating={status === STATUS.EVALUATING || status === STATUS.TESTING}>
                            {evaluations.map((evaluation, idx) => {
                                return createEvaluationRow(id, evaluation, idx, evaluation.criterion.id === selectedCriterionId, dataEntry.area === "test", pastCriteria);
                            })}
                        </CriteriaScoreList>
                    </EvaluationContainer>
                    <OptionsContainer>
                        <OptionsButton onClick={() => generateSample(id)}>
                            <i 
                                className={"fa-solid fa-play"} 
                                data-tooltip-id="tooltip"
                                data-tooltip-content={"Generate new outputs for this sample."}
                            ></i>
                        </OptionsButton>
                        {outputs.length > 0 && (
                            <OptionsButton onClick={() => evaluateSample(id)}>
                                <i 
                                    className={"fa-solid fa-flask"} 
                                    data-tooltip-id="tooltip"
                                    data-tooltip-content={"Evaluate outputs for this sample."}
                                ></i>
                            </OptionsButton>
                        )}
                        {outputs.length > 0 && (
                            <OptionsButton onClick={() => changeDataArea(id, area, true)}>
                                <i 
                                    className={"fa-solid fa-bookmark"} 
                                    style={{color: area === "test" ? "#0088FF" : ""}}
                                    data-tooltip-id="tooltip"
                                    data-tooltip-content={area === "test" ? "Remove sample from validation set." : "Add sample to validation set." }
                                ></i>
                            </OptionsButton>
                        )}
                        {!isSelectedPrompts && (
                            <OptionsButton onClick={() => resetSample(id)}>
                                <i 
                                    className={"fa-solid fa-rotate-right"}
                                    data-tooltip-id="tooltip"
                                    data-tooltip-content="Reset sample outputs and evaluation."
                                ></i>
                            </OptionsButton>
                        )}
                        <OptionsButton onClick={() => deleteDataEntry(id)}>
                            <i 
                                className="fa-solid fa-trash" 
                                data-tooltip-id="tooltip"
                                data-tooltip-content="Delete sample."
                            ></i>
                        </OptionsButton>
                    </OptionsContainer>
                </DataContainer>
                {evaluationComponents}
            </EntryContainer>
        )
    }

    const createAllDataComponents = (data: DataEntry[]) => {
        return data.map((dataEntry) => {
            var isSelectedPrompts = true;
            var outputs = dataEntry.outputs;
            if(outputs.length > 0) {
                isSelectedPrompts = selectedPrompts.includes(outputs[0].prompt.id) && selectedPrompts.includes(outputs[1].prompt.id);
            }
            return createDataRow(dataEntry, isSelectedPrompts);
        })
    }

    // Create the data table
    const stageData = [];
    const bankData = [];
    const testData = [];
    const previousData = [];
    for(var i = 0; i < dataTable.length; i++) {
        var dataEntry = dataTable[i];
        var isSelectedPrompts = true;
        var outputs = dataEntry.outputs;
        if(outputs.length > 0) {
            isSelectedPrompts = selectedPrompts.includes(outputs[0].prompt.id) && selectedPrompts.includes(outputs[1].prompt.id);
        }

        if(dataEntry.area === "test") {
            testData.push(dataEntry);
        } else if(isSelectedPrompts) {
            stageData.push(dataEntry);
        } else {
            previousData.push(dataEntry);
        }
    }

    return (
        <Outer ref={outerRef} onScroll={(e) => setHasScrolled(e.currentTarget.scrollTop > 0)}>
            <NavigationBar style={{opacity: hasScrolled ? 0.2 : 1}}>
                <ReverseButton isActive={currArea !== "stage"} onClick={() => setCurrArea("stage")}>
                    Current Data ({stageData.length + bankData.length}) <i className="fa-solid fa-play"></i>
                </ReverseButton>
                <ReverseButton isActive={currArea !== "test"} onClick={() => setCurrArea("test")}>
                    Validation Data ({testData.length}) <i className="fa-solid fa-bookmark"></i>
                </ReverseButton>
                <ReverseButton isActive={currArea !== "previous"} onClick={() => setCurrArea("previous")}>
                    Previous Data ({previousData.length}) <i className="fa-solid fa-clock-rotate-left"></i>
                </ReverseButton>
            </NavigationBar>
            {currArea === "stage" && (
                <Container type={1} style={{paddingTop: "64px"}}>
                    {stageData.length > 0 ? createAllDataComponents(stageData) : "No data..."}
                </Container>
            )}
            {currArea === "test" && (
                <Container type={1} style={{paddingTop: "64px"}}>
                    {testData.length > 0 ? createAllDataComponents(testData) : "No validation data added..."}
                </Container>
            )}
            {currArea === "previous" && (
                <Container type={0} style={{flex: 1, paddingTop: "64px"}}>
                    {previousData.length > 0 ? createAllDataComponents(previousData) : "No previous data..."}
                </Container>
            )}
            {hasScrolled && (
                <ScrollTop onClick={() => outerRef.current?.scrollTo({top: 0, behavior: "smooth"})}>
                    <i className="fa-solid fa-arrow-up"></i>
                </ScrollTop>
            )}
        </Outer>
    );
}

const Outer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;

    overflow-y: scroll;

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

const ScrollTop = styled.div`
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    border-radius: 20px;
    background: #aaa;
    opacity: 0.8;
    box-shadow: 0 2px 2px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    z-index: 4;

    &:hover {
        background-color: #777;
    }
`;

const NavigationBar = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding-top: 12px;
    position: absolute;
    z-index: 4;
    opacity: 0.2;
    transition: opacity 0.2s ease-in-out;
    &:hover {
        opacity: 1.0 !important;
    }
`;


const ReverseButton = styled.button<{isActive?: boolean}>`
    width: 180px;
    height: 32px;
    font-size: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    border-radius: 6px;
    background-color: ${(props) => props.isActive ? 'transparent' : "#dddddd"};
    color: ${(props) => props.isActive ? '#999999' : '#aaaaaa'};
    font-size: 14px;
    font-weight: ${(props) => props.isActive ? "normal" : "600"};
    cursor: ${(props) => props.isActive ? 'pointer' : 'default'};
    opacity: 1;
    outline: ${(props) => props.isActive ? 'none' : 'solid 2px #ffffff99'};

    ${(props) => props.isActive && (
        `&:hover {
            background-color: #ddd;
            outline: solid 2px #ffffff99;
        }`
    )}
`;

const Container = styled.div<{type: number}>`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 20px 8px 28px 8px;
    color: #cccccc;
    background: ${props => props.type === 1 ? "transparent" : "repeating-linear-gradient(45deg, rgb(240 242 245), rgb(240 242 245) 8px, transparent 8px, transparent 16px)"};
    border: ${props => props.type === 1 ? "none" : "4px solid #CCCCCC33"};
    border-left: none;
    border-right: none;
`;

const EntryContainer = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const DataContainer = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    text-align: left;
    gap: 8px;
    max-height: 400px;
    z-index: 2;
`;

const ExplainContainer = styled(DataContainer)`
    z-index: 1;
    max-height: none;
`;

const TextContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 4px 12px 8px 12px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 4px rgba(0,0,0,0.1);
    overflow: auto;

    &::-webkit-scrollbar {
        width: 4px;
    }
    &::-webkit-scrollbar-thumb {
        border-radius: 2px;
        background: #ddd;
    }
    &::-webkit-scrollbar-track {
        background: none;
    }
`;

const TextHeader = styled.div`
    font-size: 12px;
    color: #cccccc;
`;

const TextContent = styled.div`
    color: #333;
    font-size: 14px;
    white-space: pre-line;
`;

const DoubleContainerOuter = styled.div`
    flex: 3;
    display: flex;
    flex-direction: column;
    background-color: #f9f9f9;
    border-radius: 8px;
    border: solid 2px transparent;
    box-shadow: 0 4px 4px rgba(0,0,0,0.1);

    & > div:last-child {
        flex: 1;
    }
`;

const ExplanationHeader = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    text-align: center;

    & > div {
        flex: 1;
    }
`;

const animationCSS = `
    border: 2px dotted transparent;
    background-image: linear-gradient(
        to right,
        rgb(255 255 255 / 1),
        rgb(255 255 255 / 1)
    ),
    conic-gradient(
        from var(--angle),
        #0088FF99 0deg 90deg,
        #fff 90deg 180deg,
        #0088FF99 180deg 270deg,
        #fff 270deg 360deg
    );
    background-origin: border-box;
    background-clip: padding-box, border-box;

    animation: rotate 4s linear infinite;

    @property --angle {
        syntax: "<angle>";
        initial-value: 0deg;
        inherits: false;
    }
    
    @keyframes rotate {
        to {
            --angle: 360deg;
        }
    }
`;

const DoubleContainer = styled.div<{isGenerating?: boolean}>`
    flex: 3;
    display: flex;
    flex-direction: row;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 4px rgba(0,0,0,0.1);
    & > div:nth-child(1) {
        border-right: solid 4px #f5f5f5;
    }

    ${props => props.isGenerating ? animationCSS : 'border: solid 2px transparent;'}
`;

const DoubleExplainContainer = styled(DoubleContainer)`
    border: none;
    max-height: 280px;
    flex: 0;

    & > div {
        border-right: solid 4px #f5f5f5;
    }
`;

const DoubleInnerText = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 4px 12px 8px 12px;
    overflow: auto;

    &::-webkit-scrollbar {
        width: 4px;
    }
    &::-webkit-scrollbar-thumb {
        border-radius: 2px;
        background: #ddd;
    }
    &::-webkit-scrollbar-track {
        background: none;
    }
`;

const EvaluationContainer = styled.div`
    display: flex;
    flex-direction: column;
    position: relative;
`;

const ScoreRow = styled.div<{criterionColor?: string, isProcessing?: boolean, isSelected?: boolean}>`
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 40px;
    background-color: #fff;
    color: ${props => props.criterionColor};
    opacity: ${props => props.isSelected ? 1 : 0.8};
    box-shadow: ${props => props.isSelected ? "0 2px 4px 2px rgba(0, 0, 0, 0.2)" : "none"};
    z-index: ${props => props.isSelected ? 2 : 1};
    outline: solid 2px ${props => (props.isSelected && props.criterionColor) ? props.criterionColor + "82" : "transparent"};
    cursor: pointer;

    & > div:first-child {
        ${props => props.isProcessing ? animationCSS : ""}
    }
`;

const CriteriaLabel = styled.div`
    display: inline-block;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    padding: 0 12px;
    height: 40px;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 112px;
    line-height: 40px;
    text-align: center;
`;

const Dot = styled.div`
    position: absolute;
    height: 8px;
    width: 8px;
    top: calc(50% - 4px);
    right: 6px;
    border-radius: 50%;
    background-color: #eed600;
    outline: solid 2px #FFFFFF99
`;

const Scores = styled.div`
    display: flex;
    flex-direction: row;
    background-color: #fcfcfc;
    border-radius: 0 8px 8px 0;
    border-left: solid 4px #f5f5f5;

    & > div {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 40px;
        width: 32px;
        border-right: solid 2px #f5f5f5;
    }
    & > div:last-child {
        border-right: none;
    }
    & > div {
        &:hover > div {
            opacity: 1;
            outline: solid 1px #ddd;
        }
    }
`;

const CriteriaScoreList = styled.div<{isEvaluating?: boolean}>`
    display: flex;
    flex-direction: column;
    flex: 1;
    border-radius: 8px;
    box-shadow: 0 4px 4px rgba(0,0,0,0.1);
    z-index: 1;
    background-color: #F5F7FA;
    ${props => props.isEvaluating ? animationCSS.replaceAll("rgb(255 255 255 / 1)", "rgb(245 247 250 / 1)").replaceAll("#fff", "#F5F7FA") : 'border: solid 2px transparent;'}

    & > div:first-child {
        & > div:first-child {
            border-radius: 8px 0 0 0;
        }
    }
`;

const Circle = styled.div<{color?: string, type: number, similarColor?: string}>`
    height: 24px;
    width: 24px;
    border-radius: 50%;
    border: solid 2px ${(props) => props.color || "#dddddd"};
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    color: ${(props) => props.color || "#dddddd"};
    position: relative;
    background: ${(props) => {
        if(props.type === 0) {
            return "transparent";
        } 
        var opacity = props.type === 1 ? "ff" : "66";
        if(!props.similarColor) {
            return props.color + opacity;
        } else {
            return `repeating-linear-gradient(
                180deg,
                ${props.similarColor + opacity},
                ${props.similarColor + opacity} 10px,
                ${props.color + opacity} 10px,
                ${props.color + opacity} 24px
            )`;
        }
    }};

    & > .fa-circle {
        font-size: 10px; 
        color: #F98181;
        position: absolute; 
        bottom: -4px; 
        right: -4px;
    }
`;

const Question = styled.div`
    font-size: 20px;
    color: #cccccc;
    font-weight: bold;
`;

const RowDivider = styled.hr`
    border: solid 1px #ddd;
`;

const OptionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
`;

const OptionsButton = styled.div`
    font-size: 20px;
    width: 100%;
    cursor: pointer;
    color: #cccccc;
    &:hover {
        color: #0088ffa4;
    }
`;

const SuggestionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 8px 8px 8px;
`;

const Suggestion = styled.div<{selected?: boolean}>`
    padding: 8px;
    background-color: #fff;
    border-radius: 8px;
    font-size: 14px;
    color: #333;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    cursor: pointer;
    display: flex;
    flex-direction: row;
    gap: 4px;

    ${props => props.selected ? "outline: solid 2px #0088ff99;" : ""}

    &:hover {
        outline: solid 2px #0088ffa4;
    }

    & > div:first-child {
        flex: 1;
    }
    & > div:last-child {
        flex: none;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        gap: 4px;
        height: 100%;
    }
`;

const ExplanationSubheader = styled(ExplanationHeader)`
    font-size: 14px;
    justify-content: center;
    gap: 8px;
    padding: 0px 4px 8px 4px;
    font-weight: normal;
    color: #777;

    & > div {
        flex: none;
    }
`;

const ConfidenceContainer = styled.div`
    display: flex;
    flex-direction: row;
    padding: 12px 12px 8px 12px;
    justify-content: center;
    flex: 1;
    gap: 8px;
    opacity: 0.7;

    & > div {
        cursor: pointer;
        &:hover {
            opacity: 1;
            border-width: 3px;
        }
    }
`;

export default DataTable;