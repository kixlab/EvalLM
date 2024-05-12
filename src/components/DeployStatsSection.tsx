import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

import { Criterion, DataEntry, EvaluationData } from '../types';

const preprocessTable = (dataTable: DataEntry[], option?: string) => {
    const result: {[key: string]: {
        id: string, 
        name: string, 
        description: string, 
        winners: number[][], 
        overallWinners: number[],
        missing: number
    }} = {};
    for(let i = 0; i < dataTable.length; i++) {
        const entry = dataTable[i];
        for(let j = 0; j < entry.evaluations.length; j++) {
            const data: EvaluationData = entry.evaluations[j];
            const criterion = data.criterion;
            if(!(criterion.id in result)) {
                result[criterion.id] = {
                    id: criterion.id,
                    name: criterion.name,
                    description: criterion.description,
                    winners: [],
                    overallWinners: [],
                    missing: 0
                };
            }
            if(option !== "test") {
                const winnerCounts = Array(data.winners.length).fill(0);
                for(let k = 0; k < data.winners.length; k++) {
                    if(data.winners[k] !== -1) {
                        winnerCounts[data.winners[k]]++;
                    } else {
                        result[criterion.id].missing++;
                    }
                }
                result[criterion.id].winners.push(winnerCounts);
                result[criterion.id].overallWinners.push(data.overallWinner);
            } else {
                const winnerCounts = Array(data.testWinners.length).fill(0);
                for(let k = 0; k < data.testWinners.length; k++) {
                    if(data.testWinners[k] !== -1) {
                        winnerCounts[data.testWinners[k]]++;
                    } else {
                        result[criterion.id].missing++;
                    }
                }
                result[criterion.id].winners.push(winnerCounts);
                result[criterion.id].overallWinners.push(data.testOverallWinner);
            }
        }
    }
    return result;
}

const calculateFleissKappa = (data: number[][], r: number) => {
    // data: list of lists of ratings 
    // (each row is a data point, each column is a category, each cell is number of raters who chose that category)
    // n: number of data points
    // r: number of raters
    // k: number of categories
    // returns fleiss kappa score
    const n = data.length;
    const k = 3; // two inners or tie
    const p_j = Array(k).fill(0);
    for(let j = 0; j < k; j++) {
        for(let i = 0; i < n; i++) {
            p_j[j] += data[i][j];
        }
        p_j[j] /= (n*r);
    }
    const P_i = Array(n).fill(0);
    for(let i = 0; i < n; i++) {
        for(let j = 0; j < k; j++) {
            P_i[i] += data[i][j] ** 2;
        }
        P_i[i] -= r;
        P_i[i] /= (r * (r-1));
    }
    const P_bar = P_i.reduce((a, b) => a + b, 0) / n;
    const P_e = p_j.reduce((a, b) => a + b ** 2, 0);
    if(P_e == 1 && P_bar == 1) {
        return 1;
    } else if(P_e == 1) {
        return 0;
    }
    return (P_bar - P_e) / (1 - P_e);
}

const translateFKappaValue = (kappa: number) => {
    if(kappa < 0.0) {
        return "Poor";
    } else if(kappa < 0.2) {
        return "Slight";
    } else if(kappa < 0.4) {
        return "Fair";
    } else if(kappa < 0.6) {
        return "Moderate";
    } else if(kappa < 0.8) {
        return "Substantial";
    } else {
        return "~ Perfect";
    }
}

const calculateCohenKappa = (data: number[][]) => {
    // data: list of list of winners
    // (each row is a data point, each column is a rater, each cell is the winner or tie chosen by that rater)

    const n = data.length;
    const k = 3; // two winners or tie

    var p_o = 0;
    for(let i = 0; i < n; i++) {
        p_o += data[i][0] == data[i][1] ? 1 : 0;
    }
    p_o /= n;

    var p_e = 0;
    for(let i = 0; i < k; i++) {
        const n1 = data.reduce((a, b) => a + (b[0] == i ? 1 : 0), 0);
        const n2 = data.reduce((a, b) => a + (b[1] == i ? 1 : 0), 0);
        p_e += (n1 * n2);
    }

    p_e /= (n * n);

    if(p_e == 1 && p_o == 1) {
        return 1;
    } else if(p_e == 1) {
        return 0;
    }

    return (p_o - p_e) / (1 - p_e);
}

const translateCKappaValue = (kappa: number) => {
    if(kappa <= 0.0) {
        return "None";
    } else if(kappa <= 0.2) {
        return "Slight";
    } else if(kappa <= 0.4) {
        return "Fair";
    } else if(kappa <= 0.6) {
        return "Moderate";
    } else if(kappa <= 0.8) {
        return "Substantial";
    } else if(kappa <= 0.99){
        return "Near Perfect";
    } else {
        return "Perfect";
    }
}


interface Props {
    criteria: Criterion[];
    dataTable: DataEntry[];
    deployFilter: {type: string, criteriaId: string, section: string} | null;
    setDeployFilter: (filter: {type: string, criteriaId: string, section: string} | null) => void;
    openPanel: string;
    setOpenPanel: (panel: string) => void;
}

const DeployStatsSection = ({
    criteria,
    dataTable,
    deployFilter,
    setDeployFilter,
    openPanel,
    setOpenPanel
}: Props) => {

    const createBarChartPortion = (label: string, percentage: number, color: string, index?: number, data?: any) => {
        if(index === undefined) index = 0;
        if(color == "") {
            return (
                <BarChartPortion 
                    key={index} 
                    style={{width: (percentage*100)+'%'}}
                    color={color}
                >
                    {label}
                </BarChartPortion>
            )
        } else {
            const isActive = deployFilter !== null &&
                deployFilter.type == data.type &&
                deployFilter.criteriaId == data.criteriaId &&
                deployFilter.section == data.section;
            return (
                <BarChartPortion 
                    key={index} 
                    style={{width: (percentage*100)+'%'}}
                    color={color}
                    active={isActive}
                    onClick={() => {
                        if(data === undefined) return;
                        setDeployFilter(isActive ? null : data);
                    }}
                >
                    {label == "" ? Math.round(percentage*100)+'%' : label}
                </BarChartPortion>
            )
        }
    }

    const createLabels = (criteria: Criterion[]) => {
        const labelComponents = [];
        for(let i = 0; i < criteria.length; i++) {
            const criterion = criteria[i];
            const { name, color } = criterion;
            labelComponents.push(
                <div key={i} style={{color: color}}>{name}</div>
            )
        }
        return labelComponents;
    }

    const labelComponents = createLabels(criteria);

    const createEvaluationOverview = () => {
        const statComponents = [];
        const statistics: {[key: string]: {'current': number[], 'missing': number}} = {};

        for(let i = 0; i < criteria.length; i++) {
            const criterion = criteria[i];
            statistics[criterion.id] = {'current': [0, 0, 0], 'missing': 0};
        }
        for(let i = 0; i < dataTable.length; i++) {
            const dataEntry = dataTable[i];
            if (dataEntry.area === "test") continue;
            const { evaluations } = dataEntry;
            for(let j = 0; j < evaluations.length; j++) {
                const { criterion, overallWinner, winners } = evaluations[j];
                if(overallWinner === -1) {
                    statistics[criterion.id]['missing']++;
                    continue;
                }
                statistics[criterion.id]['current'][overallWinner]++;
            }
        }
        for(let i = 0; i < criteria.length; i++) {
            const { id } = criteria[i];
            const { current, missing } = statistics[id];
            const total = current.reduce((a, b) => a+b, 0) + missing;
            if(total === 0) {
                statComponents.push(
                    <StatsRow key={i}>
                        {createBarChartPortion("No Data", 1, "")}
                    </StatsRow>
                )
            } else {
                const percentages = [
                    current[0]/total, current[2]/total, current[1]/total, missing/total
                ];
                statComponents.push(
                    <StatsRow key={i}>
                        {percentages.map((percentage, index) => {
                            if(percentage == 0) return null;
                            var colorWheel = ["#0088FF", "#CCCCCC", "#FDA946"];
                            var sectionInfo = ["prompt1", "tie", "prompt2"]
                            if(index !== 3) {
                                var color = colorWheel[index];
                                return createBarChartPortion(
                                    "", percentage, color, index, 
                                    {"type": "evaluation", "criteriaId": id, "section": sectionInfo[index]}
                                );
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
                <Title>
                    <div>Evaluation Overview</div>
                    <HeaderButton
                        isActive={openPanel === "history"}
                        onClick={(e) => {
                            e.stopPropagation();
                            if(setOpenPanel === undefined) return;
                            setOpenPanel(openPanel === "history" ? "" : "history");
                        }}
                        data-tooltip-id="tooltip"
                        data-tooltip-content="Browse evaluation history."
                    >
                        <i className="fa-solid fa-clock-rotate-left"></i>
                    </HeaderButton>
                </Title>
                <OverviewContainer>
                    <LabelsContainer>{labelComponents}</LabelsContainer>
                    <StatsContainer>{statComponents}</StatsContainer>
                </OverviewContainer>
            </Container>
        )
    }

    const createTestRetestOverview = () => {
        const statComponents = [];
        const processedTable = preprocessTable(dataTable);

        var isAllEvaluated = true;
        var numberOfTrials = 0;

        for(let i = 0; i < criteria.length; i++) {
            const { id } = criteria[i];

            if(!(id in processedTable)) {
                statComponents.push(
                    <StatsRow key={i}>
                        {createBarChartPortion("No Data", 1, "")}
                    </StatsRow>
                )
                isAllEvaluated = false;
            } else {
                const winnersAggregate = processedTable[id]['winners'];
                numberOfTrials = winnersAggregate[0].reduce((a, b) => a+b, 0);
                const missing = processedTable[id]['missing'];
                const agreement = winnersAggregate.filter((winners) => winners.some((value) => value === winners.length)).length;
                const majority = winnersAggregate.filter((winners) => winners.some((value) => value > winners.length / 2)).length - agreement;
                const total = winnersAggregate.length;

                if(missing > 0) {
                    isAllEvaluated = false;
                }

                const percentages = [agreement/total, majority/total, (total - agreement - majority - missing)/total, missing/total];
                statComponents.push(
                    <StatsRow key={i}>
                        {percentages.map((percentage, index) => {
                            if(percentage == 0) return null;
                            var colorWheel = ["#59B668", "#59B66855", "#dddddd"];
                            var sectionInfo = ['agree', 'majority', 'disagree']
                            if(index !== 3) {
                                var color = colorWheel[index];
                                return createBarChartPortion(
                                    "", percentage, color, index, 
                                    {"type": "testretest", "criteriaId": id, "section": sectionInfo[index]}
                                );
                            } else {
                                return createBarChartPortion("N/A", percentage, "", index);
                            }
                        })}
                    </StatsRow>
                )
            }
        }

        const kappaComponents = [];
        if(isAllEvaluated && numberOfTrials > 0) {
            const kappaPerCriteria: {[key: string]: number} = {};
            for(let i = 0; i < criteria.length; i++) {
                const criterion = criteria[i];
                const { id } = criterion;
                const kappa = calculateFleissKappa(processedTable[id]['winners'], numberOfTrials); 
                kappaPerCriteria[id] = kappa;
            }
            for(let i = 0; i < criteria.length; i++) {
                const criterion = criteria[i];
                const { id } = criterion;
                const kappa = kappaPerCriteria[id];
                kappaComponents.push(
                    <div key={i}>
                        <div>
                            <span style={{fontWeight: "bold"}}>κ</span>={kappa.toFixed(2)} 
                        </div>
                        <div style={{color: "#999", fontSize: "8px"}}>
                            {translateFKappaValue(kappa)}
                        </div>
                    </div>
                )
            }
        } else {
            for(let i = 0; i < criteria.length; i++) {
                kappaComponents.push(
                    <div key={i} style={{opacity: 0.5}}>
                        <div>
                            <span style={{fontWeight: "bold"}}>κ</span>=N/A
                        </div>
                        <div style={{color: "#999", fontSize: "8px"}}>
                            N/A
                        </div>
                    </div>
                )
            }
        }

        return (
            <Container>
                <Title>Test-Retest Overview</Title>
                <OverviewContainer>
                    <LabelsContainer>
                        {labelComponents}
                    </LabelsContainer>
                    <StatsContainer>
                        {statComponents}
                    </StatsContainer>
                    <OthersContainer>
                        {kappaComponents}
                    </OthersContainer>
                </OverviewContainer>
            </Container>
        )
    }

    const createInterRaterOverview = () => {
        const statComponents = [];
        const processedTable = preprocessTable(dataTable);
        const processedAltTable = preprocessTable(dataTable, 'test');

        var isAltEvaluated = true;

        const combinedData: {[key: string]: number[][]} = {};

        for(let i = 0; i < criteria.length; i++) {
            const { id } = criteria[i];

            if(!(id in processedTable)) {
                statComponents.push(
                    <StatsRow key={i}>
                        {createBarChartPortion("No Data", 1, "")}
                    </StatsRow>
                )
                isAltEvaluated = false;
            } else {
                const winnersAggregate = processedTable[id]['overallWinners'];
                const altWinnersAggregate = processedAltTable[id]['overallWinners'];
                const missing = processedAltTable[id]['missing'];

                combinedData[id] = [];
                var agreement = 0;
                for(let j = 0; j < winnersAggregate.length; j++) {
                    if(winnersAggregate[j] == -1 || altWinnersAggregate[j] == -1) continue;
                    if(winnersAggregate[j] === altWinnersAggregate[j]) {
                        agreement++;
                    }
                    combinedData[id].push([winnersAggregate[j], altWinnersAggregate[j]]);
                }
                const total = winnersAggregate.length;

                const percentages = [agreement/total, (total - agreement - missing)/total, missing/total];
                statComponents.push(
                    <StatsRow key={i}>
                        {percentages.map((percentage, index) => {
                            if(percentage == 0) return null;
                            var colorWheel = ["#59B668", "#dddddd"];
                            var sectionInfo = ['agree', 'disagree']
                            if(index !== 2) {
                                var color = colorWheel[index];
                                return createBarChartPortion(
                                    "", percentage, color, index,
                                    {"type": "irr", "criteriaId": id, "section": sectionInfo[index]}
                                );
                            } else {
                                return createBarChartPortion("N/A", percentage, "", index);
                            }
                        })}
                    </StatsRow>
                );
            }
        }

        const kappaComponents = [];
        if(isAltEvaluated) {
            const kappaPerCriteria: {[key: string]: number} = {};
            for(let i = 0; i < criteria.length; i++) {
                const { id } = criteria[i];
                if(!(id in combinedData)) {
                    continue;
                }
                const kappa = calculateCohenKappa(combinedData[id]);
                kappaPerCriteria[id] = kappa;
            }
            for(let i = 0; i < criteria.length; i++) {
                const criterion = criteria[i];
                const { id } = criterion;
                const kappa = kappaPerCriteria[id];
                kappaComponents.push(
                    <div key={i}>
                        <div>
                            <span style={{fontWeight: "bold"}}>κ</span>={kappa.toFixed(2)} 
                        </div>
                        <div style={{color: "#999", fontSize: "8px"}}>
                            {translateCKappaValue(kappa)}
                        </div>
                    </div>
                )
            }
        } else {
            for(let i = 0; i < criteria.length; i++) {
                kappaComponents.push(
                    <div key={i} style={{opacity: 0.5}}>
                        <div>
                            <span style={{fontWeight: "bold"}}>κ</span>=N/A
                        </div>
                        <div style={{color: "#999", fontSize: "8px"}}>
                            N/A
                        </div>
                    </div>
                )
            }
        }

        return (
            <Container>
                <Title>Inter-Rater Overview</Title>
                <OverviewContainer>
                    <LabelsContainer>
                        {labelComponents}
                    </LabelsContainer>
                    <StatsContainer>
                        {statComponents}
                    </StatsContainer>
                    <OthersContainer>
                        {kappaComponents}
                    </OthersContainer>
                </OverviewContainer>
            </Container>
        )
    }

    return (<>
        {createEvaluationOverview()}
        <Divider />
        {createTestRetestOverview()}
        <Divider />
        {createInterRaterOverview()}
    </>);
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
`;

const Title = styled.div`
    font-size: 16px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;

    & > div:first-child {
        flex: 1;
    }
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

    & > div:first-child {
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
    }
    & > div:last-child {
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
    }
`;

const OthersContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 0;
    gap: 8px;

    & > div {
        height: 32px;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
`;

const Divider = styled.hr`
    width: 100%;
    border: 1px solid #f5f5f5;
`;

const BarChartPortion = styled.div<{color: string, active?: boolean}>`
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.color ? props.color : "transparent"};
    border: ${props => props.color ? "none" : "solid 2px #ccc"};
    color: ${props => props.color ? "#ffffff" : "#ccc"};
    cursor: ${props => props.color ? "pointer" : "default"};
    opacity: 0.7;

    ${props => !props.active ? 
        `&:hover {
            outline: ${props.color ? "solid 2px "+props.color : "none"};
            opacity: ${props.color ? "1" : "0.7"};
        }` :
        `opacity: 1;
        outline: ${props.color ? "solid 2px "+props.color : "none"};`
    }
`;

const HeaderButton = styled.div<{isActive: boolean}>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: solid 2px #ccc;
    font-size: 12px;
    color: ${(props) => props.isActive ? "#0088ff" : "#ccc"};
    cursor: pointer;
    
    ${(props) => props.isActive ? 
        (`color: #0088ff; border-color: #0088ff;`) : 
        `&:hover {
            color: #0088FF99;
            border-color: #0088FF99;
        }`
    }
`;

export default DeployStatsSection;