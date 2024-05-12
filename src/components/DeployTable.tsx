import React, { useState, useEffect, useRef } from 'react';
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
    changeSelectedEval: (dataEntryId: string, criterionId: string, selected: number) => void;
    sendToDevelop: (dataEntry: DataEntry) => void;
    developEntryIds: string[];
    deployFilter: {type: string, criteriaId: string, section: string} | null;
}

const DeployTable = ({
    dataTable,
    prompts,
    selectedPrompts,
    criteria,
    updateDataEntry,
    changeSelectedEval,
    sendToDevelop,
    developEntryIds,
    deployFilter
}: Props) => {
    const outerRef = useRef<HTMLDivElement>(null);
    const [hasScrolled, setHasScrolled] = useState<boolean>(false);
    const [currArea, setCurrArea] = useState<string>("all");

    useEffect(() => {
        if(deployFilter) {
            setCurrArea("filter");
        } else {
            setCurrArea("all");
        }
    }, [deployFilter]);

    const highlightText = (text: string, evidence: string[], color: string) => {
        var highlightedText = text;
        var currIdx = 0;
        evidence.forEach((evidenceText) => {
            const startIdx = highlightedText.toLowerCase().indexOf(evidenceText.toLowerCase(), currIdx);
            const endIdx = startIdx + evidenceText.length;
            if(startIdx !== -1) {
                highlightedText = highlightedText.substring(0, startIdx) +
                    `<span style="background-color: ${color}4d; border-radius: 4px">` +
                    highlightedText.substring(startIdx, endIdx) +
                    "</span>" +
                    highlightedText.substring(endIdx);
                currIdx = endIdx + 69;
            }
        });
        if(!evidence.includes("{{WHOLE}}")) {
            return <span dangerouslySetInnerHTML={{__html: highlightedText}}></span>
        } else {
            return <span style={{backgroundColor: color + "4d"}}>
                <span dangerouslySetInnerHTML={{__html: highlightedText}}></span>
            </span>
        }
    }

    const createOutputComponents = (output: OutputData | null, idx: number, evidence: string[], color: string) => {
        if(!output) {
            return (
                <DoubleInnerText key={idx}>
                    <TextHeader>Prompt...</TextHeader>
                    <TextContent style={{color: "#999"}}>No outputs generated...</TextContent>
                </DoubleInnerText>
            )
        }
        const { prompt, text } = output;
        const promptName = prompts.find((p) => p.id === prompt.id)?.name;
        return (
            <DoubleInnerText key={idx}>
                <TextHeader style={{color: idx === 0 ? "#0088FF" : "#FDA946"}}>{promptName}</TextHeader>
                <TextContent>{highlightText(text, evidence, color)}</TextContent>
            </DoubleInnerText>
        )
    }

    const createEvaluationRow = (dataId: string, evaluation: EvaluationData, idx: number, isSelected: boolean, isTest: boolean, pastCriteria: Criterion[]) => {
        var { criterion, overallWinner, winners, scores, agreement, testOverallWinner, similarCriteria } = evaluation;
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
        return ([
            <ScoreRow 
                key={idx} 
                criterionColor={criterion.color}
                isSelected={isSelected}
                style={{height: "auto", borderRadius: idx === 0 ? "8px 8px 0 0" : "0px"}}
            >
                <CriteriaLabel onClick={() => {toggleCriterion(dataId, criterion.id)}}>
                    {criterion.name}
                    {isCriterionChanged ? <Dot></Dot> :""}
                </CriteriaLabel>
                {createWinnerLabels(
                    dataId,
                    criterion.id, 
                    overallWinner, 
                    winners,
                    testOverallWinner,
                    isNotAgreement,
                    similarColor
                )}
            </ScoreRow>,
            <RowDivider key={idx+"-divider"}></RowDivider>
        ])
    }

    const createWinnerLabels = (dataEntryId: string, criterionId: string, overallWinner: number, winners: number[], testOverallWinner: number, isNotAgreement: boolean, similarColor?: string) => {
        var calculatedWinner = -1;
        if(winners) {
            calculatedWinner = getOverallWinner(winners);
        }
        const colors = ["#0088FF", "#FDA946", "#cccccc"];
        if(overallWinner === -1) {
            return (
                <Scores>
                    <div style={{border: "none"}}></div>
                    <Question style={{border: "none"}}>?</Question>
                    <div style={{border: "none"}}></div>
                </Scores>
            );
        } else {
            return (
                <Scores>
                    {[0, 2, 1].map((idx) => {
                        var innerElements = [];
                        if(testOverallWinner === idx) {
                            innerElements.push(<i key={0} className="fa-solid fa-circle"></i>)
                        }

                        if(calculatedWinner === idx && isNotAgreement) {
                            innerElements.push(<Question key={1} style={{color: "#fff"}}>?</Question>)
                        }
                        return (
                            <div key={idx}>
                                <Circle color={colors[idx]} type={overallWinner === idx ? 1 : 0} similarColor={similarColor}>
                                    {innerElements}
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

    const createExplanationComponents = (explanation: string) => {
        return (
            <DoubleInnerText style={{paddingTop: "8px"}}>
                {explanation === "" ? 
                    <TextContent style={{color: "#999"}}>Not evaluated...</TextContent>:
                    <TextContent>
                        {explanation.replaceAll('assistant', 'prompt').replaceAll('Assistant', 'Prompt')}
                    </TextContent>
                }
            </DoubleInnerText>
        );
    }

    const createEvaluationExplanations = (selectedEvaluation: EvaluationData, id: string, isTest: boolean, pastCriteria: Criterion[]) => {
        var { criterion, overallWinner, winners, scores, explanations, selected, similarCriteria } = selectedEvaluation;
        var color = criterion.color;
        var isEvaluated = overallWinner !== -1;
    
        if(isTest) {
            winners = selectedEvaluation.testWinners;
            overallWinner = selectedEvaluation.testOverallWinner;
            scores = selectedEvaluation.testScores;
            explanations = selectedEvaluation.testExplanations;
            isEvaluated = winners[0] !== -1;
        }

        var selectedScores = scores[selected];
        var selectedExplanation = explanations[selected];

        var evaluationContainers = document.getElementsByClassName("data-entry-evaluations");
        var evaluationContainerWidth = 0;
        if(evaluationContainers.length > 0) {
            evaluationContainerWidth = evaluationContainers[0].clientWidth;
        }

        var innerComponents = (<>
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
                {createExplanationComponents(selectedExplanation)}
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
            updateDataEntry(dataEntryId, {area: currArea === "test" ? "bank" : "test"});
        } else {
            updateDataEntry(dataEntryId, {area: currArea === "stage" ? "bank" : "stage"});
        }
    }

    const createDataRow = (dataEntry: DataEntry) => {
        const { id, input, outputs, evaluations, status, selectedCriterionId, area } = dataEntry;
        var isSelectedPrompts = true;
        if(outputs.length > 0) {
            isSelectedPrompts = selectedPrompts.includes(outputs[0].prompt.id) && selectedPrompts.includes(outputs[1].prompt.id);
        }
        var outputList = outputs.length > 0 ? outputs : [null, null];
        var selectedEvaluation = evaluations.find((evaluation) => evaluation.criterion.id === selectedCriterionId);
        var isTest = area === "test";
        var pastCriteria = evaluations.map((evaluation) => evaluation.criterion);

        var evaluationComponents = <></>;
        if(selectedEvaluation) {
            evaluationComponents = createEvaluationExplanations(selectedEvaluation, id, dataEntry.area === "test", pastCriteria);
        }

        const isEvaluated = evaluations.some((evaluation) => evaluation.overallWinner !== -1);

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
                                return createOutputComponents(output, idx, evidence, color);
                            } else {
                                return createOutputComponents(output, idx, [], "");
                            }
                        })}
                    </DoubleContainer>
                    <EvaluationContainer className="data-entry-evaluations">
                        <CriteriaScoreList isEvaluating={status === STATUS.EVALUATING} isTesting={status === STATUS.TESTING}>
                            {evaluations.map((evaluation, idx) => {
                                return createEvaluationRow(id, evaluation, idx, evaluation.criterion.id === selectedCriterionId, dataEntry.area === "test", pastCriteria);
                            })}
                        </CriteriaScoreList>
                    </EvaluationContainer>
                    <OptionsContainer>
                        {outputs.length > 0 && isEvaluated && (
                            <OptionsButton onClick={() => changeDataArea(id, area, false)}>
                                <i 
                                    className={"fa-solid fa-thumbtack"} 
                                    style={{color: dataEntry.area === "stage"  ? "#0088ff" : ""}}
                                    data-tooltip-id="tooltip"
                                    data-tooltip-content={dataEntry.area === "stage" ?
                                        "Remove sample from important set." :
                                        "Add sample to important set."
                                    }
                                ></i>
                            </OptionsButton>
                        )}
                        {outputs.length > 0 && isEvaluated && (
                            <OptionsButton 
                                onClick={() => !developEntryIds.includes(dataEntry.id) && sendToDevelop(dataEntry)}
                                style={developEntryIds.includes(dataEntry.id) ? {cursor: "default"} : {}}
                            >
                                <i 
                                    className={"fa-solid fa-download"} 
                                    style={developEntryIds.includes(dataEntry.id) ? {color: "#0088ff"} : {}}
                                    data-tooltip-id="tooltip"
                                    data-tooltip-content={developEntryIds.includes(dataEntry.id) ?
                                        "Sample is already in development." :
                                        "Copy sample to development."
                                    }
                                ></i>
                            </OptionsButton>
                        )}
                        {(!isEvaluated || outputs.length === 0) && <div>&nbsp;</div>}
                    </OptionsContainer>
                </DataContainer>
                {evaluationComponents}
            </EntryContainer>
        )
    }

    const importantData = dataTable.filter((dataEntry) => dataEntry.area === "stage");
    const allData = dataTable.filter((dataEntry) => {
        return dataEntry.evaluations.every((evaluation) => evaluation.overallWinner !== -1)
    });
    const loadingData = dataTable.filter((dataEntry) => {
        return dataEntry.evaluations.some((evaluation) => evaluation.overallWinner === -1);
    });

    var filteredData: DataEntry[] = [];
    if(deployFilter) {
        if(deployFilter.type === "evaluation") {
            filteredData = dataTable.filter((dataEntry) => {
                return dataEntry.evaluations.some((evaluation) => {
                    var isCriteria = evaluation.criterion.id === deployFilter.criteriaId;
                    var isWinner = evaluation.overallWinner === (deployFilter.section === "prompt1" ? 0 : (deployFilter.section === "prompt2" ? 1 : 2));
                    return isCriteria && isWinner;
                });
            });
        } else if(deployFilter.type === "testretest") {
            filteredData = dataTable.filter((dataEntry) => {
                return dataEntry.evaluations.some((evaluation) => {
                    var isCriteria = evaluation.criterion.id === deployFilter.criteriaId;
                    var isSection = false;
                    if(deployFilter.section === "agree") {
                        isSection = evaluation.agreement === 1;
                    } else if(deployFilter.section === "majority") {
                        isSection = evaluation.agreement < 1 && evaluation.agreement >= 0.5;
                    } else if(deployFilter.section === "disagree") {
                        isSection = evaluation.agreement < 0.5;
                    }
                    return isCriteria && isSection;
                });
            });
        } else if(deployFilter.type === "irr") {
            filteredData = dataTable.filter((dataEntry) => {
                return dataEntry.evaluations.some((evaluation) => {
                    var isCriteria = evaluation.criterion.id === deployFilter.criteriaId;
                    var isSection = false;
                    if(deployFilter.section === "agree") {
                        isSection = evaluation.overallWinner === evaluation.testOverallWinner;
                    } else if(deployFilter.section === "disagree") {
                        isSection = evaluation.overallWinner !== evaluation.testOverallWinner;
                    }
                    return isCriteria && isSection;
                });
            });
        }
    }

    // Create the data table
    return (
        <Outer ref={outerRef} onScroll={(e) => setHasScrolled(e.currentTarget.scrollTop > 0)}>
            <NavigationBar style={{opacity: hasScrolled ? 0.2 : 1}}>
                {deployFilter !== null && (
                    <ReverseButton isActive={currArea !== "filter"} onClick={() => setCurrArea("filter")}>
                        Filtered ({filteredData.length}) <i className="fa-solid fa-filter"></i>
                    </ReverseButton>
                )}
                <ReverseButton isActive={currArea !== "important"} onClick={() => setCurrArea("important")}>
                    Important ({importantData.length}) <i className="fa-solid fa-thumbtack"></i>
                </ReverseButton>
                <ReverseButton isActive={currArea !== "all"} onClick={() => setCurrArea("all")}>
                    All Data ({allData.length})
                </ReverseButton>
                <ReverseButton isActive={currArea !== "loading"} onClick={() => setCurrArea("loading")}>
                    Loading ({loadingData.length}) <i className="fa-solid fa-hourglass-half"></i>
                </ReverseButton>
            </NavigationBar>
            {currArea === "important" && (
                <Container type={1} style={{paddingTop: "64px", flex: 1}}>
                    {importantData.length > 0 ? 
                        importantData.map((dataEntry) => createDataRow(dataEntry)) : 
                        "No important data..."
                    }
                </Container>
            )}
            {currArea === "all" && (
                <Container type={1} style={{paddingTop: "64px", flex: 1}}>
                    {allData.length > 0 ?
                        allData.map((dataEntry) => createDataRow(dataEntry)) :
                        "No evaluated data..."
                    }
                </Container>
            )}
            {currArea === "loading" && (
                <Container type={0} style={{paddingTop: "64px", flex: 1}}>
                    {loadingData.length > 0 ?
                        loadingData.map((dataEntry) => createDataRow(dataEntry)) :
                        "All data has been loaded..."
                    }
                </Container>
            )}
            {currArea === "filter" && (
                <Container type={1} style={{paddingTop: "64px", flex: 1}}>
                    {filteredData.length > 0 ?
                        filteredData.map((dataEntry) => createDataRow(dataEntry)) :
                        "No data matches the filter..."
                    }
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
    font-weight: ${(props) => props.isActive ? "normal" : "bold"};
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
        #0088FF99 0deg 120deg,
        #FFFFFF 120deg 180deg,
        #0088FF99 180deg 300deg,
        #FFFFFF 300deg 360deg
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

    ${props => props.isGenerating ? animationCSS : 'border: solid 2px transparent'}
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

const ScoreRow = styled.div<{criterionColor?: string, isSelected?: boolean}>`
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 40px;
    background-color: #fff;
    color: ${props => props.criterionColor};
    opacity: ${props => props.isSelected ? 1 : 0.8};
    box-shadow: ${props => props.isSelected ? "0 2px 4px 2px rgba(0, 0, 0, 0.2)" : "none"};
    z-index: ${props => props.isSelected ? 2 : 1};
    outline: solid 2px ${props => props.isSelected ? props.criterionColor + "82" : "transparent"};
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
`;

const CriteriaScoreList = styled.div<{isEvaluating?: boolean, isTesting?: boolean}>`
    display: flex;
    flex-direction: column;
    flex: 1;
    border-radius: 8px;
    box-shadow: 0 4px 4px rgba(0,0,0,0.1);
    z-index: 1;
    background-color: #F5F7FA;
    ${props => props.isEvaluating ? animationCSS.replaceAll("rgb(255 255 255 / 1)", "rgb(245 247 245 / 1)").replaceAll("#fff", "#F5F7FA"): 'border: solid 2px transparent;'}
    ${props => props.isTesting ? animationCSS.replaceAll("rgb(255 255 255 / 1)", "rgb(245 247 245 / 1)").replaceAll("0088FF99", "0088ff33").replaceAll("#fff", "#F5F7FA") : ''}
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
    opacity: 1;
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

const ExplanationSubheader = styled(ExplanationHeader)`
    font-size: 14px;
    justify-content: center;
    gap: 8px;
    padding: 0px 4px 8px 4px;
    font-weight: normal;

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

export default DeployTable;