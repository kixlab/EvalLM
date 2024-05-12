import React from 'react';
import styled from 'styled-components';

import { Criterion, DataEntry } from '../types';

const isEqualCriterion = (prevCriterion: Criterion, criterion: Criterion) => {
    return prevCriterion.name === criterion.name &&
        prevCriterion.description === criterion.description;
}

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
    selectedPrompts: string[];
    criteria: Criterion[];
    dataTable: DataEntry[];
    type: string;
    openPanel?: string;
    setOpenPanel?: (panel: string) => void;
}

const StatsSection = ({
    selectedPrompts,
    criteria,
    dataTable,
    type,
    openPanel,
    setOpenPanel
}: Props) => {
    const createBarChartPortion = (label: string, percentage: number, color: string, index?: number) => {
        if(index === undefined) index = 0;
        if(color === "") {
            return (
                <div 
                    key={index} 
                    style={{width: (percentage*100)+'%', border: 'solid 2px #ccc', color: "#ccc"}}
                >
                    {label}
                </div>
            )
        } else {
            return (
                <div 
                    key={index} 
                    style={{width: (percentage*100)+'%', backgroundColor: color}}
                >
                    {label === "PERCENTAGE" ? Math.round(percentage*100)+'%' : label}
                </div>
            )
        }
    }

    const createEvaluationOverview = () => {
        const labelComponents = [];
        const statComponents = [];
        const statistics: {[key: string]: {'corrected': number[], 'current': number[], 'previous': number[], 'missing': number}} = {};

        for(let i = 0; i < criteria.length; i++) {
            const criterion = criteria[i];
            const { name, color } = criterion;
            labelComponents.push(
                <div key={i} style={{color: color}}>{name}</div>
            )
            statistics[criterion.id] = {'corrected': [0, 0, 0], 'current': [0, 0, 0], 'previous': [0, 0, 0], 'missing': 0};
        }
        for(let i = 0; i < dataTable.length; i++) {
            const dataEntry = dataTable[i];
            if (dataEntry.area === "test") continue;
            var isSelectedPrompts = true;
            var outputs = dataEntry.outputs;
            if(outputs.length > 0) {
                isSelectedPrompts = selectedPrompts.includes(outputs[0].prompt.id) && selectedPrompts.includes(outputs[1].prompt.id);
            }
            if(!isSelectedPrompts) continue;
            const { evaluations } = dataEntry;
            for(let j = 0; j < evaluations.length; j++) {
                const { criterion, overallWinner, winners } = evaluations[j];
                if(overallWinner === -1) {
                    statistics[criterion.id]['missing']++;
                    continue;
                }
                const originalOverallWinner = getOverallWinner(winners);
                const isCurrent = isEqualCriterion(criteria[j], criterion);
                if(overallWinner !== originalOverallWinner) {
                    statistics[criterion.id]['corrected'][overallWinner]++;
                } else if(isCurrent) {
                    statistics[criterion.id]['current'][overallWinner]++;
                } else {
                    statistics[criterion.id]['previous'][overallWinner]++;
                }
            }
        }
        for(let i = 0; i < criteria.length; i++) {
            const { id } = criteria[i];
            const { corrected, current, previous, missing } = statistics[id];
            const total = corrected.reduce((a, b) => a+b, 0) + current.reduce((a, b) => a+b, 0) + previous.reduce((a, b) => a+b, 0) + missing;
            if(total === 0) {
                statComponents.push(
                    <StatsRow key={i}>
                        {createBarChartPortion("No Data", 1, "")}
                    </StatsRow>
                )
            } else {
                const percentages = [
                    corrected[0]/total, current[0]/total, previous[0]/total, 
                    corrected[2]/total, current[2]/total, previous[2]/total, 
                    corrected[1]/total, current[1]/total, previous[1]/total, 
                    missing/total
                ];
                statComponents.push(
                    <StatsRow key={i}>
                        {percentages.map((percentage, index) => {
                            if(percentage === 0) return null;
                            var colorWheel = [
                                "#0088FF", "#0088FFcc", "#0088FF99", 
                                "#CCCCCC", "#CCCCCCcc", "#CCCCCC99", 
                                "#FDA946", "#FDA946aa", "#FDA94699"
                            ];
                            if(index !== 9) {
                                var color = colorWheel[index];
                                return createBarChartPortion("PERCENTAGE", percentage, color, index);
                            } else {
                                return createBarChartPortion("N/A", percentage, "", index);
                            }
                        })}
                    </StatsRow>
                )
            }
        }
        return (
            <Container>
                <OverviewContainer>
                    <LabelsContainer>{labelComponents}</LabelsContainer>
                    <StatsContainer>{statComponents}</StatsContainer>
                </OverviewContainer>
            </Container>
        )
    }

    const createValidationOverview = () => {
        const statistics: {[key: string]: {'current': number[], 'previous': number[], 'missing': number}} = {};
        const labelComponents = [];
        const statComponents = [];

        for(let i = 0; i < criteria.length; i++) {
            const criterion = criteria[i];
            const { name, color } = criterion;
            labelComponents.push(
                <div key={i} style={{color: color}}>{name}</div>
            )
            statistics[criterion.id] = {'current': [0, 0], 'previous': [0, 0], 'missing': 0};
        }
        
        for(let i = 0; i < dataTable.length; i++) {
            const dataEntry = dataTable[i];
            if (dataEntry.area !== "test") continue;
            const { evaluations } = dataEntry;
            for(let j = 0; j < evaluations.length; j++) {
                const { testOverallWinner, criterion, testWinners } = evaluations[j];
                if(testWinners[0] === -1) {
                    statistics[criterion.id]['missing']++;
                    continue;
                }
                const correct = getOverallWinner(testWinners) === testOverallWinner;
                const isUpdated = isEqualCriterion(criteria[j], criterion);
                if(isUpdated) {
                    statistics[criterion.id]['current'][correct ? 0 : 1]++;
                } else {
                    statistics[criterion.id]['previous'][correct ? 0 : 1]++;
                }
            }
        }

        for(let i = 0; i < criteria.length; i++) {
            const { id } = criteria[i];
            const { current, previous, missing } = statistics[id];
            const total = current[0] + current[1] + previous[0] + previous[1] + missing;
            if(total === 0) {
                statComponents.push(
                    <StatsRow key={i}>
                        {createBarChartPortion("No Data", 1, "")}
                    </StatsRow>
                )
            } else {
                const percentages = [current[0]/total, previous[0]/total, current[1]/total, previous[1]/total, missing/total];
                console.log(percentages )
                statComponents.push(
                    <StatsRow key={i}>
                        {percentages.map((percentage, index) => {
                            if(percentage === 0) return null;
                            var colorWheel = ["#59B668", "#59B668aa", "#dddddd", "#ddddddaa"];
                            if(index !== 4) {
                                var color = colorWheel[index];
                                return createBarChartPortion("PERCENTAGE", percentage, color, index);
                            } else {
                                return createBarChartPortion("N/A", percentage, "", index);
                            }
                        })}
                    </StatsRow>
                )
            }
        }

        return (
            <Container>
                <OverviewContainer>
                    <LabelsContainer>
                        {labelComponents}
                    </LabelsContainer>
                    <StatsContainer>
                        {statComponents}
                    </StatsContainer>
                </OverviewContainer>
            </Container>
        )
    }

    return <>{type !== "test" ? createEvaluationOverview() : createValidationOverview()}</>;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
`;

const OverviewContainer = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 12px;
`;

const LabelsContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 0;
    gap: 8px;

    & > div {
        height: 32px;
        font-size: 14px;
        display: inline-block;
        line-height: 32px;
        width: 120px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const StatsContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 8px;
`;

const StatsRow = styled.div`
    width: 100%;
    height: 32px;
    font-size: 14px;
    align-items: center;
    display: flex;
    flex-direction: row;
    color: #ffffff;

    & > div {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    & > div:first-child {
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
    }
    & > div:last-child {
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
    }
`;

export default StatsSection;