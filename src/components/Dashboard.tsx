import React, { useState, useReducer, useRef, useContext } from 'react';
import styled from 'styled-components';

import PromptingSection from './PromptingSection';
import SamplingSection from './SamplingSection';
import CriteriaSection from './CriteriaSection';
import StatsSection from './StatsSection';
import DataTable from './DataTable';
import Panel from './Panel';

import DeployTable from './DeployTable';
import DeploymentSection from './DeploymentSection';
import DeployStatsSection from './DeployStatsSection';

import Modal from './Modal';

import { GenerateContext } from '../api/GenerateContext';

import { 
    Criterion, Prompt, 
    InputData, OutputData, EvaluationData, DataEntry, 
    EvalResponse,
    Deployment
} from '../types';
import { COLORWHEEL, STATUS, DEFAULT_CONFIGS } from './constants';

const createId = (prefix: string) => {
    // use current time as id
    const now = new Date();
    const id = `${prefix}${now.getTime()}${Math.floor(Math.random() * 1000)}`;
    return id;
}

const getOverallWinner = (winners: number[]) => {
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

const dataTableReducer = (state: DataEntry[], action: any) => {
    switch (action.type) {
        case 'set':
            return action.data;
        case 'add':
            return [action.dataEntry, ...state];
        case 'addMultiple':
            return [ ...action.dataEntries, ...state];
        case 'edit':
            return state.map((dataEntry) => {
                if(dataEntry.id === action.editedData.id) {
                    if(action.editedData.selectedCriterionId !== undefined && action.editedData.selectedCriterionId !== "<NEW>") {
                        action.editedData.criteriaSuggestions = null;
                    }
                    if(action.editedData.area !== undefined) {
                        if(action.editedData.area === "test") {
                            action.editedData.selectedCriterionId = null;
                            action.editedData.evaluations = dataEntry.evaluations.map((evaluation) => {
                                return {
                                    ...evaluation,
                                    testOverallWinner: evaluation.overallWinner,
                                    testWinners: [-1],
                                    testScores: [[-1, -1]],
                                    testExplanations: [""],
                                    testEvidence: [[[], []]]
                                }
                            });
                        } else if(dataEntry.area === "test" && action.editedData.area !== "test") {
                            action.editedData.selectedCriterionId = null;
                            action.editedData.evaluations = dataEntry.evaluations.map((evaluation) => {
                                return {
                                    ...evaluation,
                                    testOverallWinner: -1,
                                    testWinners: [-1],
                                    testScores: [[-1, -1]],
                                    testExplanations: [""],
                                    testEvidence: [[[], []]]
                                }
                            });
                        }
                    }
                    return {...dataEntry, ...action.editedData};
                }
                return dataEntry;
            });
        case 'editMultiple':
            const editedKeys = action.editedDataList.map((editedData: any) => editedData.id);
            return state.map((dataEntry) => {
                if(editedKeys.includes(dataEntry.id)) {
                    const editedData = action.editedDataList.find((editedData: any) => editedData.id === dataEntry.id);
                    if(editedData.selectedCriterionId !== undefined && editedData.selectedCriterionId !== "<NEW>") {
                        editedData.criteriaSuggestions = null;
                    }
                    return {...dataEntry, ...editedData};
                }   
                return dataEntry;
            });
        case 'delete':
            return state.filter((dataEntry) => dataEntry.id !== action.id);
        case 'reset':
            return state.filter((dataEntry) => dataEntry.area === "test");
        default:
            throw new Error();
    }
};

const BATCH_SIZE = 30;
interface Progress {
    queue: {
        dataEntryId: string,
        status: string,
        type: string,
        callback: () => void
    }[],
    counts: {
        generating: {done: number, total: number},
        evaluating: {done: number, total: number},
        testing: {done: number, total: number},
        deploying: {done: number, total: number},
        validating: {done: number, total: number}
    }
}
const progressReducer = (state: Progress, action: any) => {
    switch (action.type) {
        case 'add':
            const { dataEntryId, type, taskIdx, callback } = action.data;
            const runningTasks = state.queue.filter((task) => task.status === "running");
            if(runningTasks.length < BATCH_SIZE) {
                setTimeout(() => callback(), 2000 * taskIdx);
            }
            return {
                queue: [
                    ...state.queue, 
                    {
                        "dataEntryId": dataEntryId,
                        "status": runningTasks.length < BATCH_SIZE ? "running" : "pending",
                        "type": type,
                        "callback": callback
                    }
                ],
                counts: type === "" ? state.counts : {
                    ...state.counts,
                    [type]: {
                        done: state.counts[type as keyof typeof state.counts].done,
                        total: state.counts[type as keyof typeof state.counts].total + 1
                    }
                }
            };
        case 'complete':
            // remove task from queue and update counts
            const newQueue = state.queue.filter((task) => task.dataEntryId !== action.data.dataEntryId || task.type !== action.data.type);
            const newCounts = { ...state.counts };
            if(action.data.type !== "") {
                const typeCounts = newCounts[action.data.type as keyof typeof newCounts];
                const isComplete = typeCounts.done + 1 === typeCounts.total;    
                newCounts[action.data.type as keyof typeof newCounts] = {
                    done: isComplete ? 0 : typeCounts.done + 1,
                    total: isComplete ? 0 : typeCounts.total
                }
            }
            if(newQueue.filter((task) => task.status === "running").length < BATCH_SIZE && newQueue.length > 0) {
                const nextTask = newQueue.find((task) => task.status === "pending");
                if(nextTask) {
                    setTimeout(() => nextTask.callback(), 2000);
                    nextTask.status = "running";
                }
            }
            return {queue: newQueue, counts: newCounts};
        case 'remove':
            // get all tasks that need to be removed, dataEntryId
            const tasksToRemove = state.queue.filter((task) => task.dataEntryId === action.data.dataEntryId);
            const newQueueRemove = state.queue.filter((task) => task.dataEntryId !== action.data.dataEntryId);
            const newCountsRemove = { ...state.counts };
            tasksToRemove.forEach((task) => {
                const typeCounts = newCountsRemove[task.type as keyof typeof newCountsRemove];
                const isComplete = typeCounts.done === typeCounts.total - 1;
                newCountsRemove[task.type as keyof typeof newCountsRemove] = {
                    done: isComplete ? 0 : typeCounts.done,
                    total: isComplete ? 0 : typeCounts.total - 1
                }
            });
            return { queue: newQueueRemove, counts: newCountsRemove };
        default:
            throw new Error();
    }
}

const historyReducer = (state: DataEntry[], action: any) => {
    switch (action.type) {
        case 'set':
            return action.data;
        case 'add':
            return [...state, ...action.dataEntries];
        case 'update':
            var historyData = state.find((historyEntry: DataEntry) => {
                if(historyEntry.id !== action.dataEntry.id) return false;
                var historyOutputs = historyEntry.outputs.map((output: OutputData) => output.text);
                var dataEntryOutputs = action.dataEntry.outputs.map((output: OutputData) => output.text);
                return historyOutputs.every((output: string) => dataEntryOutputs.includes(output));
            });
            if(historyData) {
                return state.map((dataEntry) => {
                    if(dataEntry.id === action.dataEntry.id) {
                        return action.dataEntry;
                    }
                    return dataEntry;
                });
            } else {
                return [...state, action.dataEntry];
            }
        default:
            throw new Error();
    }
}

const deploymentReducer = (state: {[key: string]: Deployment}, action: any) => {
    const selectedDeployment = state[action.id];
    switch (action.type) {
        case 'set':
            return action.data;
        case 'create':
            return {...state, [action.id]: {
                id: action.id,
                settings: {
                    instruction: null,
                    prompts: [],
                    criteria: [],
                    sampleSize: 20,
                    trialN: 3,
                    alternateEvaluator: 'None'
                },
                dataTable: []
            }}
        case 'configure':
            return {...state, [action.id]: {...selectedDeployment, settings: action.settings}};
        case 'add':
            return {
                ...state,
                [action.id]: {
                    ...selectedDeployment,
                    dataTable: [action.dataEntry, ...state[action.id].dataTable]
                }
            }
        case 'addMultiple':
            return {
                ...state,
                [action.id]: {
                    ...selectedDeployment,
                    dataTable: [ ...action.dataEntries, ...state[action.id].dataTable]
                }
            }   
        case 'edit':
            return {
                ...state,
                [action.id]: {
                    ...selectedDeployment,
                    dataTable: state[action.id].dataTable.map((dataEntry) => {
                        if(dataEntry.id === action.editedData.id) {
                            return {...dataEntry, ...action.editedData};
                        }
                        return dataEntry;
                    })
                }
            }
        case 'editMultiple':
            const editedKeys = action.editedDataList.map((editedData: any) => editedData.id);
            return {
                ...state,
                [action.id]: {
                    ...selectedDeployment,
                    dataTable: state[action.id].dataTable.map((dataEntry) => {
                        if(editedKeys.includes(dataEntry.id)) {
                            const editedData = action.editedDataList.find((editedData: any) => editedData.id === dataEntry.id);
                            return {...dataEntry, ...editedData};
                        }   
                        return dataEntry;
                    })
                }
            }
        default:
            throw new Error();
    }
};

const initialPrompts = [
    {
        id: createId('p'),
        name: "Version 1",
        systemPrompt: "You are a helpful assistant.",
        userPrompt: "**Instruction**\n{{instruction}}\n\n**Input**\n{{input}}"
    },
    {
        id: createId('p'),
        name: "Version 2",
        systemPrompt: "You are a helpful assistant.",
        userPrompt: "## Instruction\n\n{{instruction}}\n\n## Input\n\n{{input}}"
    }
];

const Dashboard = () => {
    const {
        generateResponses,
        evaluateResponses,
        apiKeys
    } = useContext(GenerateContext);

    const [instruction, setInstruction] = useState<string>('');
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);

    const [selectedPrompts, setSelectedPrompts] = useState<string[]>(initialPrompts.map((prompt) => prompt.id));
    const [dataEntryIdx, setDataEntryIdx] = useState<number>(0);
    const [criteriaColorIdx, setCriteriaColorIdx] = useState<number>(0);

    const [inputSet, setInputSet] = useState<InputData[]>([]);
    const [inputClusters, setInputClusters] = useState<string[][]>([]);
    const [dataTable, dataTableDispatch] = useReducer(dataTableReducer, []);

    const [evaluateN, setEvaluateN] = useState<number>(1);
    const [testN, setTestN] = useState<number>(3);

    const [progress, progressDispatch] = useReducer(progressReducer, {
        queue: [], 
        counts: {
            generating: {done: 0, total: 0},
            evaluating: {done: 0, total: 0},
            testing: {done: 0, total: 0},
            deploying: {done: 0, total: 0},
            validating: {done: 0, total: 0}
        }
    });
    const [openPanel, setOpenPanel] = useState<string>('');
    const [panelData, setPanelData] = useState<any>({});
    const [history, historyDispatch] = useReducer(historyReducer, []);
    
    const [section, setSection] = useState<string>('develop');

    const [deployment, deploymentDispatch] = useReducer(deploymentReducer, {});
    const [selectedDeployment, setSelectedDeployment] = useState<string>('');
    const [deployFilter, setDeployFilter] = useState<{type: string, criteriaId: string, section: string} | null>(null);

    const [isModalOpen, setIsModalOpen] = useState<boolean>(true);

    const instructionRef = useRef(instruction);
    instructionRef.current = instruction;
    const criteriaRef = useRef(criteria);
    criteriaRef.current = criteria;
    const promptsRef = useRef(prompts);
    promptsRef.current = prompts;
    const dataTableRef = useRef(dataTable);
    dataTableRef.current = dataTable;
    const deploymentRef = useRef(deployment);
    deploymentRef.current = deployment;
    const historyRef = useRef(history);
    historyRef.current = history;
    const inputSetRef = useRef(inputSet);
    inputSetRef.current = inputSet;
    const inputClustersRef = useRef(inputClusters);
    inputClustersRef.current = inputClusters;

    const addInputSamples = (sampledInputs: InputData[], section: string, selectedDeployment?: string, isManual?: boolean) => {
        const newDataEntries = sampledInputs.map((input: InputData, idx: number) => {
            const emptyEvaluations: EvaluationData[] = criteria.map((criterion, cIdx) => {
                return {
                    criterion: {...criterion},
                    overallWinner: -1,
                    winners: [-1],
                    scores: [[-1, -1]],
                    explanations: [""],
                    evidence: [[[], []]],
                    agreement: -1,
                    similarCriteria: [],
                    selected: 0,
                    isRefining: false,
                    testOverallWinner: -1,
                    testWinners: [-1],
                    testScores: [[-1, -1]],
                    testExplanations: [""],
                    testEvidence: [[[], []]],
                }
            });
            const newEntry: DataEntry = {
                id: createId('d') + '-' + (dataEntryIdx+idx),
                input: input,
                outputs: input.outputs ? input.outputs.map((output, idx) => {
                    return {
                        prompt: {
                            id: "<PREDEFINED_PROMPT_" + idx + ">",
                            name: "Predefined Prompt " + idx,
                            systemPrompt: "",
                            userPrompt: "",
                        },
                        inputId: input.id,
                        text: output
                    }
                }) : [],
                evaluations: emptyEvaluations,
                status: 0,
                selectedCriterionId: null,
                area: (section && section === "deploy") ? 'bank' : 'stage'
            };
            return newEntry;
        });

        newDataEntries.reverse();
        setDataEntryIdx(dataEntryIdx + sampledInputs.length);
        if(section === 'develop') {
            dataTableDispatch({type: 'addMultiple', dataEntries: newDataEntries});
        } else if(section === 'deploy') {
            deploymentDispatch({type: 'addMultiple', id: selectedDeployment, dataEntries: newDataEntries});
        }

        return newDataEntries;
    }

    const createCriterion = (name: string, description: string, type: string) => {
        const newCriterion: Criterion = {
            id: createId('c'),
            name: name,
            color: COLORWHEEL[criteriaColorIdx],
            description: description,
        }
        setCriteria([...criteria, newCriterion]);
        
        const editedDataList = dataTable.map((dataEntry: DataEntry) => {
            const emptyEvaluation: EvaluationData = {
                criterion: {...newCriterion},
                overallWinner: -1,
                winners: [-1],
                scores: [[-1, -1]],
                explanations: [""],
                evidence: [[[], []]],
                agreement: -1,
                similarCriteria: [],
                selected: 0,
                isRefining: false,
                testOverallWinner: -1,
                testWinners: [-1],
                testScores: [[-1, -1]],
                testExplanations: [""],
                testEvidence: [[[], []]],
            }
            const newEvaluations = [...dataEntry.evaluations, emptyEvaluation];
            return {
                id: dataEntry.id,
                evaluations: newEvaluations
            }
        });

        dataTableDispatch({
            type: 'editMultiple', 
            editedDataList: editedDataList,
        });

        var nextCriteriaColorIdx = (criteriaColorIdx + 2) % COLORWHEEL.length;
        setCriteriaColorIdx(nextCriteriaColorIdx);
    }

    const deleteCriterion = (criteriaId: string) => {
        const newCriteria = criteria.filter((c) => c.id !== criteriaId);
        setCriteria(newCriteria);
        const editedDataList = dataTable.map((dataEntry: DataEntry) => {
            const newEvaluations = dataEntry.evaluations.filter((evaluation: EvaluationData) => {
                return evaluation.criterion.id !== criteriaId
            });
            return {
                id: dataEntry.id,
                evaluations: newEvaluations
            }
        });
        dataTableDispatch({
            type: 'editMultiple', 
            editedDataList: editedDataList,
        });
    }

    const dataDispatchHandler = (action: any, section: string, selectedDeployment?: string) => {
        if(section === "develop") {
            if(action.editedData) {
                dataTableDispatch({type: action.type, editedData: action.editedData});
            } else if(action.editedDataList) {
                dataTableDispatch({type: action.type, editedDataList: action.editedDataList});
            }
        } else if(section === "deploy") {
            if(action.editedData) {
                deploymentDispatch({type: action.type, id: selectedDeployment, editedData: action.editedData});
            } else if(action.editedDataList) {
                deploymentDispatch({type: action.type, id: selectedDeployment, editedDataList: action.editedDataList});
            }
        }
    }

    const generateHandler = (
        instruction: string,
        dataEntry: DataEntry,
        idx: number,
        promptTemplates: Prompt[],  
        section: string,
        selectedDeployment?: string,
        callback?: (data: any) => void
    ) => {
        const { id, input } = dataEntry;

        var requests: any[] = [];

        promptTemplates.forEach((prompt: Prompt) => {
            var systemPromptText = prompt.systemPrompt.replace("{{instruction}}", instruction);
            systemPromptText = systemPromptText.replace("{{input}}", input.text);
            var userPromptText = prompt.userPrompt.replace("{{instruction}}", instruction);
            userPromptText = userPromptText.replace("{{input}}", input.text);
            requests.push({
                'dataId': id,
                'inputId': input.id,
                'userPrompt': userPromptText,
                'systemPrompt': systemPromptText,
                ...DEFAULT_CONFIGS["generate"] // TODO: see if we want to make this editable by the user
            })
        })

        progressDispatch({type: 'add', data: {dataEntryId: id, type: section !== 'deploy' ? 'generating' : 'deploying', callback: () => {
            generateResponses(requests, (response: any) => {
                if(response.error) {
                    console.error(response.error);
                    // cancel generation
                    dataDispatchHandler({
                        type: 'edit',
                        editedData: {
                            id: dataEntry.id,
                            status: STATUS.DEFAULT
                        }
                    }, section, selectedDeployment);
                    progressDispatch({type: 'complete', data: {dataEntryId: id, type: section !== 'deploy' ? 'generating' : 'deploying'}});
                    return;
                }
                const newOutputs: OutputData[] = [];
                response.responses.forEach((responseData: any, idx: number) => {
                    const { inputId, output } = responseData;
                    newOutputs.push({
                        prompt: promptTemplates[idx],
                        inputId: inputId,
                        text: output
                    })
                });

                const editedData: any = {
                    id: dataEntry.id,
                    outputs: newOutputs,
                    status: STATUS.DEFAULT,
                    evaluations: (section === "develop" ? criteriaRef.current : criteria).map((criterion, cIdx) => {
                        return {
                            criterion: {...criterion},
                            overallWinner: -1,
                            winners: [-1],
                            scores: [[-1, -1]],
                            explanations: [""],
                            evidence: [[[], []]],
                            agreement: -1,
                            similarCriteria: [],
                            selected: 0,
                            isRefining: false,
                            testOverallWinner: -1,
                            testWinners: [-1],
                            testScores: [[-1, -1]],
                            testExplanations: [""],
                            testEvidence: [[[], []]]
                        }
                    })
                }
                dataDispatchHandler({ type: 'edit', editedData: editedData }, section, selectedDeployment);
                progressDispatch({type: 'complete', data: {dataEntryId: id, type: section !== 'deploy' ? 'generating' : ''}});
                if(callback) callback(editedData);
            })
        }}});
    }

    const generate = (dataEntries: DataEntry[], section: string, selectedDeployment?: string) => {
        const promptTemplates = selectedPrompts.map((promptId) => {
            const prompt = prompts.find((prompt) => prompt.id === promptId);
            if(!prompt) {
                return {
                    id: 'p-none',
                    name: 'None',
                    systemPrompt: "You are a helpful assistant.",
                    userPrompt: '{{input}}',
                }
            }
            return prompt;
        });

        dataEntries.forEach((dataEntry, index) => {
            dataDispatchHandler({
                type: 'edit', 
                editedData: {id: dataEntry.id, status: STATUS.GENERATING},
            }, section, selectedDeployment);
            generateHandler(instruction, dataEntry, index, promptTemplates, section, selectedDeployment);
        });
    }

    const evaluate = async (dataEntries: DataEntry[], type: string, section: string) => {
        if(criteria.length === 0 || criteria.some((criterion) => criterion.name === "" || criterion.description === "")) return;
        dataEntries.forEach((dataEntry, i) => {
            dataDispatchHandler({
                type: 'edit', 
                editedData: {id: dataEntry.id, status: STATUS.EVALUATING},
            }, section, selectedDeployment);
            evaluateHandler(instruction, dataEntry, criteria, i, type, section, selectedDeployment);
        });
    }

    const evaluateHandler = (
        instruction: string, 
        dataEntry: DataEntry, 
        criteria: Criterion[], 
        idx: number, 
        type: string, 
        section: string, 
        selectedDeployment?: string, 
        model?: string, 
        callback?: (data: any) => void
    ) => {
        const { id, input, outputs, evaluations } = dataEntry;

        if(section === 'develop') {
            dataDispatchHandler({
                type: 'edit', 
                editedData: {id: dataEntry.id, status: type !== "test" ? STATUS.EVALUATING : STATUS.TESTING}
            }, section);
        }
        
        const criteriaList = evaluations.map((evaluation: EvaluationData) => {
            var criterion = {...evaluation.criterion};
            var currCriterion = criteria.find((c: Criterion) => c.id === criterion.id);
            if(currCriterion) return {...currCriterion};
            return {...criterion};
        });

        const nTrials = section === "develop" ? 
            (type !== "test" ? evaluateN : testN) : 
            (selectedDeployment ? (deployment as {[key: string]: Deployment})[selectedDeployment].settings.trialN : 1);
        model = model ? model : DEFAULT_CONFIGS['evaluate']['model']; // TODO: need to add model and temperature selection for evaluation
        const temperature = DEFAULT_CONFIGS['evaluate']['temperature'];
        const inputText = input.text;
        const outputsText = outputs.map((output: OutputData) => output.text);

        var taskType = section !== 'deploy' ? 
            (type !== "test" ? 'evaluating' : 'testing') :
            (type !== "test" ? '' : 'validating');

        progressDispatch({type: 'add', taskIdx: idx, data: {dataEntryId: id, type: taskType, callback: () => {
            evaluateResponses(instruction, inputText, outputsText, criteriaList, model as string, temperature, nTrials, (response: any) => {
                progressDispatch({type: 'complete', data: {dataEntryId: id, type: section !== 'deploy' ? taskType : (type !== "test" ? 'deploying' : 'validating')}});
                if(response.error) {
                    console.error(response.error);
                    dataDispatchHandler({
                        type: 'edit',
                        editedData: {
                            id: dataEntry.id,
                            status: STATUS.DEFAULT
                        }
                    }, section, selectedDeployment);
                    return;
                }
                    
                if(section === "develop") {
                    dataEntry.evaluations = dataEntry.evaluations.filter((evaluation: EvaluationData) => {
                        return criteriaRef.current.some((criterion: Criterion) => criterion.id === evaluation.criterion.id)
                    });
                    criteriaRef.current.forEach((criterion: Criterion) => {
                        var evaluationIdx = dataEntry.evaluations.findIndex((evaluation: EvaluationData) => evaluation.criterion.id === criterion.id);
                        if(evaluationIdx === -1) {
                            dataEntry.evaluations.push({
                                criterion: {...criterion},
                                overallWinner: -1,
                                winners: [-1],
                                scores: [[-1, -1]],
                                explanations: [""],
                                evidence: [[[], []]],
                                agreement: -1,
                                similarCriteria: [],
                                selected: 0,
                                isRefining: false,
                                testOverallWinner: -1,
                                testWinners: [-1],
                                testScores: [[-1, -1]],
                                testExplanations: [""],
                                testEvidence: [[[], []]],
                            });
                        }
                    });
                }

                var responseData = response.data;
                responseData.forEach((row: EvalResponse) => {
                    const { criterion, winners, scores, explanations, evidence, agreement, similarCriteria } = row;

                    var evaluationIdx = dataEntry.evaluations.findIndex((evaluation: EvaluationData) => evaluation.criterion.id === criterion.id);
                    if(winners !== undefined && evaluationIdx !== -1 && scores && explanations && evidence && agreement !== undefined && similarCriteria) {
                        var newEvalData: EvaluationData;
                        if(type !== "test") {
                            newEvalData = {
                                ...dataEntry.evaluations[evaluationIdx],
                                criterion: criterion,
                                overallWinner: getOverallWinner(winners),
                                winners: winners,
                                scores: scores,
                                explanations: explanations,
                                evidence: evidence,
                                agreement: agreement,
                                similarCriteria: similarCriteria.filter((name: string) => name !== criterion.name),
                                selected: 0,
                                isRefining: false
                            }
                        } else {
                            newEvalData = {
                                ...dataEntry.evaluations[evaluationIdx],
                                criterion: criterion,
                                testWinners: winners,
                                testScores: scores,
                                testExplanations: explanations,
                                testEvidence: evidence,
                                selected: 0,
                                isRefining: false
                            }
                            if(section === "deploy") {
                                newEvalData['testOverallWinner'] = getOverallWinner(winners);
                            }
                        }
                        dataEntry.evaluations[evaluationIdx] = newEvalData;
                    }
                });

                var editedData = {
                    id: dataEntry.id,
                    status: STATUS.DEFAULT,
                    evaluations: dataEntry.evaluations
                }

                dataDispatchHandler({
                    type: 'edit', 
                    editedData: editedData
                }, section, selectedDeployment);

                historyDispatch({
                    type: 'add',
                    dataEntries: [{
                        ...dataEntry,
                        ...editedData,
                        isDeploy: section === "deploy"
                    }]
                });

                if(callback) callback(editedData);
            });
        }}});
    }

    const generateSample = (dataEntry: DataEntry) => {
        const promptTemplates = selectedPrompts.map((promptId) => {
            const prompt = prompts.find((prompt) => prompt.id === promptId);
            if(!prompt) {
                return {
                    id: 'p-none',
                    name: 'None',
                    systemPrompt: "You are a helpful assistant.",
                    userPrompt: '{{input}}',
                }
            }
            return prompt;
        });

        dataDispatchHandler({
            type: 'edit', 
            editedData: {id: dataEntry.id, status: STATUS.GENERATING},
        }, 'develop', '');

        generateHandler(instruction, dataEntry, 1, promptTemplates, 'develop', '');
    }

    const evaluateSample = async (dataEntry: DataEntry, type: string) => {
        if(criteria.length === 0 || criteria.some((criterion) => criterion.name === "" || criterion.description === "")) return;

        dataDispatchHandler({
            type: 'edit', 
            editedData: {id: dataEntry.id, status: STATUS.EVALUATING},
        }, 'develop', selectedDeployment);

        evaluateHandler(instruction, dataEntry, criteria, 0, type, 'develop');
    }

    const changeWinner = (dataEntryId: string, criterionId: string, newWinner: number, isTest?: boolean) => {
        if(!isTest) return;

        const dataEntry = dataTable.find((dataEntry: DataEntry) => dataEntry.id === dataEntryId);
        if(!dataEntry) return;
        if(dataEntry.status !== STATUS.DEFAULT) return;
        const { evaluations } = dataEntry;
        
        // edit existing criterion
        const evaluation = evaluations.find((evaluation: EvaluationData) => evaluation.criterion.id === criterionId);
        if(!evaluation) return;
        dataTableDispatch({ type: 'edit', editedData: {
            id: dataEntryId,
            selectedCriterionId: criterionId,
            status: STATUS.DEFAULT,
            evaluations: dataEntry.evaluations.map((evaluation: EvaluationData) => {
                if(evaluation.criterion.id !== criterionId) return evaluation;
                return {...evaluation, testOverallWinner: newWinner, suggestions: null, isRefining: false};
            })
        }})
    }

    const deploy = async (selectedDeployment: string) => {
        if(selectedDeployment === "") return;
        if(criteria.some((criterion) => criterion.name === "" || criterion.description === "")) return;

        const selected: Deployment = (deployment as {[key: string]: Deployment})[selectedDeployment];
        if(progress.counts.deploying.total > 0 || progress.counts.validating.total > 0) return;

        var promptTemplates = selectedPrompts.map((promptId) => {
            const prompt = prompts.find((prompt) => prompt.id === promptId);
            if(!prompt) return { id: 'p-none', name: 'None', systemPrompt: "You are a helpful assistant.", userPrompt: '{{input}}',};
            return {...prompt};
        })
        var selectedCriteria = criteria;
        var selectedInstruction = instruction;
        if(selected.settings.prompts.length === 0) {
            deploymentDispatch({
                type: 'configure',
                id: selectedDeployment,
                settings: {
                    ...selected.settings,
                    instruction: selectedInstruction,
                    prompts: promptTemplates,
                    criteria: selectedCriteria
                }
            });
        } else {
            promptTemplates = selected.settings.prompts;
            selectedCriteria = selected.settings.criteria;
            selectedInstruction = instruction;
        }

        const sampledIds = selected.dataTable.map((dataEntry) => dataEntry.input.id);
        var availableClusters = inputClusters.map((cluster) => cluster.filter((inputId) => !sampledIds.includes(inputId)));
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
            if(sampledInputs.length === selected.settings.sampleSize) break;
        }
        var dataEntries = addInputSamples(sampledInputs, 'deploy', selectedDeployment);

        dataEntries.forEach((dataEntry, index) => {
            dataDispatchHandler({
                type: 'edit', 
                editedData: {id: dataEntry.id, status: STATUS.GENERATING},
            }, 'deploy', selectedDeployment);

            generateHandler(selectedInstruction, dataEntry, index, promptTemplates, 'deploy', selectedDeployment, (editedData: any) => {
                dataDispatchHandler({
                    type: 'edit', 
                    editedData: {id: editedData.id, status: STATUS.EVALUATING},
                }, 'deploy', selectedDeployment);
                dataEntries[index] = { ...dataEntries[index], ...editedData };
                const model = DEFAULT_CONFIGS['evaluate']['model'];
                evaluateHandler(selectedInstruction, dataEntries[index], selectedCriteria, index, "evaluating", "deploy", selectedDeployment, model, (result: any) => {
                    dataEntries[index] = { ...dataEntries[index], ...result };
    
                    var numLowAgreement = 0;
                    for(var i = 0; i < result.evaluations.length; i++) {
                        const evaluation = result.evaluations[i];
                        if(evaluation.agreement < 0.7) numLowAgreement++;
                    }
                    if(numLowAgreement > result.evaluations.length / 2) {
                        dataDispatchHandler({
                            type: 'edit', 
                            editedData: {id: result.id, area: 'stage'},
                        }, 'deploy', selectedDeployment);
    
                        dataEntries[index] = { ...dataEntries[index], area: 'stage' };
                    }

                    if(selected.settings.alternateEvaluator === 'None') {
                        return;
                    }

                    dataDispatchHandler({
                        type: 'edit',
                        editedData: {id: dataEntry.id, status: STATUS.TESTING},
                    }, 'deploy', selectedDeployment);

                    const altEvaluator = selected.settings.alternateEvaluator;
                    evaluateHandler(selectedInstruction, dataEntries[index], selectedCriteria, index, "test", "deploy", selectedDeployment, altEvaluator, (result: any) => {
                        // check if no agreement between evaluators
                        const entryIdx = dataEntries.findIndex((dataEntry) => dataEntry.id === result.id);
                        const dataEntry = {...dataEntries[entryIdx], ...result};
    
                        var numDisagreements = 0;
                        for(var i = 0; i < dataEntry.evaluations.length; i++) {
                            const evaluation = dataEntry.evaluations[i];
                            if(evaluation.overallWinner !== evaluation.testOverallWinner) numDisagreements++;
                        }
                        if(numDisagreements === dataEntry.evaluations.length) {
                            dataDispatchHandler({
                                type: 'edit',
                                editedData: {id: result.id, area: 'stage'},
                            }, 'deploy', selectedDeployment);
                        }
                    });
                });
            });
        });
    }

    var canGenerate = progress.counts.generating.done === progress.counts.generating.total;
    var canEvaluate = progress.counts.evaluating.done === progress.counts.evaluating.total;
    var canTest = progress.counts.testing.done === progress.counts.testing.total;
    var canDeploy = progress.counts.deploying.done === progress.counts.deploying.total;

    var stage = dataTable.filter((dataEntry: DataEntry) => dataEntry.area === "stage");
    canGenerate = canGenerate && stage.length > 0 && !stage.some((dataEntry: DataEntry) => dataEntry.status !== STATUS.DEFAULT) && apiKeys['openai'] !== "";
    canEvaluate = canEvaluate && canGenerate && !stage.some((dataEntry: DataEntry) => dataEntry.outputs.length === 0) && criteria.length > 0 && apiKeys['openai'] !== "";
    var test = dataTable.filter((dataEntry: DataEntry) => dataEntry.area === "test");
    canTest = canTest && test.length > 0 && !test.some((dataEntry: DataEntry) => dataEntry.status !== STATUS.DEFAULT) && criteria.length > 0 && apiKeys['openai'] !== "";

    // Create Dashboard
    const createDevelopDashboard = () => {
        return [
            <InputContainer id='input-container' key="input">
                <InstructionSection>
                    <InstructionHeader> Instructions </InstructionHeader>
                    <InstructionText
                        value={instruction}
                        onChange={(e) => {
                            setInstruction(e.target.value)
                        }}
                        placeholder="Enter your task instruction here..."
                    />
                </InstructionSection>
                <Divider />
                <PromptingSection 
                    prompts={prompts} 
                    selectedPrompts={selectedPrompts}
                    createPrompt={(selectedIdx: number) => {
                        const newPrompt: Prompt = {
                            id: createId('p'),
                            name: 'Version ' + (prompts.length + 1),
                            systemPrompt: "",
                            userPrompt: '',
                        };
                        setPrompts([...prompts, newPrompt]);
                        const newSelectedPrompts = [...selectedPrompts];
                        newSelectedPrompts[selectedIdx] = newPrompt.id;
                        setSelectedPrompts(newSelectedPrompts);
                    }}
                    updatePrompt={(prompt: Prompt) => {
                        const newPrompts = [...prompts];
                        const idx = newPrompts.findIndex((p) => p.id === prompt.id);
                        newPrompts[idx] = prompt;
                        setPrompts(newPrompts);
                    }}
                    openPanel={openPanel}
                    setOpenPanel={setOpenPanel}
                    panelData={panelData}
                    setPanelData={setPanelData}
                    section={section}
                />
                <Divider/>
                <ButtonContainer>
                    <Button 
                        onClick={() => {
                            if(!canGenerate) return;
                            var generatable = dataTable.filter((dataEntry: DataEntry) => {
                                return dataEntry.area === "stage" && 
                                        dataEntry.status === STATUS.DEFAULT &&
                                        (dataEntry.outputs.length > 0 ? 
                                        (selectedPrompts.includes(dataEntry.outputs[0].prompt.id) && 
                                        selectedPrompts.includes(dataEntry.outputs[1].prompt.id)) : 
                                        true);
                            });
                            generate(generatable, section)
                        }}
                        isActive={canGenerate}
                    >
                        Run Prompts <i className="fa-solid fa-play"></i>
                    </Button>
                    {progress.counts.generating.done !== progress.counts.generating.total && (
                        <ProgressBar progress={progress.counts.generating.done} total={progress.counts.generating.total}>
                            <div></div>
                        </ProgressBar>
                    )}
                </ButtonContainer>
                <Divider/>
                <SamplingSection
                    inputSet={inputSet}
                    setInputSet={setInputSet}
                    inputClusters={inputClusters}
                    setInputClusters={setInputClusters}
                    sampledInputIds={dataTable.map((dataEntry: DataEntry) => dataEntry.input.id)}
                    testInputIds={test.map((dataEntry: DataEntry) => dataEntry.input.id)}
                    addInputSamples={(sampledInputs: InputData[]) => addInputSamples(sampledInputs, 'develop')}
                    openPanel={openPanel}
                    setOpenPanel={setOpenPanel}
                    prompts={prompts}
                    setPrompts={setPrompts}
                />
            </InputContainer>,
            <DataContainer key="data" style={openPanel !== "" ? {filter: "brightness(80%)"} : {}}>
                <DataTable
                    dataTable={dataTable}
                    prompts={prompts}
                    selectedPrompts={selectedPrompts}
                    criteria={criteria}
                    updateDataEntry={(dataEntryId: string, updatedProps: any) => {
                        dataTableDispatch({
                            type: 'edit', 
                            editedData: {id: dataEntryId, ...updatedProps}
                        });
                    }}
                    deleteDataEntry={(dataEntryId: string) => {
                        var dataEntry = dataTable.find((dataEntry: DataEntry) => dataEntry.id === dataEntryId);
                        if(!dataEntry) return;
                        progressDispatch({type: 'remove', data: dataEntryId});
                        dataTableDispatch({
                            type: 'delete', 
                            id: dataEntryId
                        });
                    }}
                    changeWinner={(dataEntryId, criterionId, winner, isTest) => {
                        changeWinner(dataEntryId, criterionId, winner, isTest);
                    }}
                    changeSelectedEval={(dataEntryId, criterionId, selected) => {
                        const newEvaluations: EvaluationData[] = [...dataTable.find((dataEntry: DataEntry) => dataEntry.id === dataEntryId)!.evaluations];
                        const idx = newEvaluations.findIndex((evaluation) => evaluation.criterion.id === criterionId);
                        newEvaluations[idx] = {...newEvaluations[idx], selected: selected};
                        dataDispatchHandler({
                            type: 'edit',
                            editedData: {
                                id: dataEntryId,
                                evaluations: newEvaluations
                            }
                        }, 'develop');
                    }}
                    addCriterion={(n, d) => createCriterion(n, d, 'suggestion')}
                    updateCriterion={(criterionId: string, updatedProps: any) => {
                        const newCriteria = [...criteria];
                        const idx = newCriteria.findIndex((c) => c.id === criterionId);
                        newCriteria[idx] = {...newCriteria[idx], ...updatedProps};
                        setCriteria(newCriteria);
                    }}
                    resetSample={(dataId: string) => {
                        const emptyEvaluations: EvaluationData[] = criteria.map((criterion, cIdx) => {
                            return {
                                criterion: {...criterion},
                                overallWinner: -1,
                                winners: [-1],
                                scores: [[-1, -1]],
                                explanations: [""],
                                evidence: [[[], []]],
                                agreement: -1,
                                similarCriteria: [],
                                selected: 0,
                                isRefining: false,
                                testOverallWinner: -1,
                                testWinners: [-1],
                                testScores: [[-1, -1]],
                                testExplanations: [""],
                                testEvidence: [[[], []]],
                            }
                        });
                        dataTableDispatch({
                            type: 'edit', 
                            editedData: {id: dataId, outputs: [], area: "stage", evaluations: emptyEvaluations}
                        });
                    }}
                    generateSample={(dataId: string) => {
                        const dataEntry = dataTable.find((dataEntry: DataEntry) => dataEntry.id === dataId);
                        if(!dataEntry) return;
                        generateSample(dataEntry);
                    }}
                    evaluateSample={(dataId: string) => {
                        const dataEntry = dataTable.find((dataEntry: DataEntry) => dataEntry.id === dataId);
                        if(!dataEntry) return;
                        evaluateSample(dataEntry, dataEntry.area);
                    }}
                />
            </DataContainer>,
            <EvalContainer id='eval-container' key="evaluation">
                <CriteriaSection
                    instruction={instruction}
                    criteria={criteria}
                    createCriterion={(name, description, type) => createCriterion(name, description, type)}
                    updateCriterion={(criterion: Criterion) => {
                        const newCriteria = [...criteria];
                        const idx = newCriteria.findIndex((c) => c.id === criterion.id);
                        newCriteria[idx] = criterion;
                        setCriteria(newCriteria);
                    }}
                    deleteCriterion={deleteCriterion}
                    section={section}
                    openPanel={openPanel}
                    setOpenPanel={setOpenPanel}
                />
                <Divider/>
                <SectionContainer>
                    <Title>
                        <div>Evaluation</div>
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
                    <>
                        <OptionButtonsContainer>
                            <div>Number of Trials</div>
                            <ReverseButton onClick={() => setEvaluateN(1)} isActive={evaluateN !== 1}> 1 </ReverseButton>
                            <ReverseButton onClick={() => setEvaluateN(3)} isActive={evaluateN !== 3}> 3 </ReverseButton>
                        </OptionButtonsContainer>
                        <ButtonContainer>
                            <Button 
                                onClick={() => {
                                    if(!canEvaluate) return;
                                    var filteredDataTable = dataTable.filter((dataEntry: DataEntry) => {
                                        return dataEntry.area === "stage" && 
                                                dataEntry.status === STATUS.DEFAULT && 
                                                dataEntry.outputs.length > 0 &&
                                                selectedPrompts.includes(dataEntry.outputs[0].prompt.id) &&
                                                selectedPrompts.includes(dataEntry.outputs[1].prompt.id);
                                    });
                                    evaluate(filteredDataTable, 'evaluate', section)
                                }} 
                                isActive={canEvaluate}
                            >
                                Auto-Evaluate <i className="fa-solid fa-flask"></i>
                            </Button>
                            {progress.counts.evaluating.done !== progress.counts.evaluating.total && (
                                <ProgressBar progress={progress.counts.evaluating.done} total={progress.counts.evaluating.total}>
                                    <div></div>
                                </ProgressBar>
                            )}
                        </ButtonContainer>
                    </>
                    <StatsSection
                        selectedPrompts={selectedPrompts}
                        criteria={criteria}
                        dataTable={dataTable}
                        type={"evaluate"}
                        openPanel={openPanel}
                        setOpenPanel={setOpenPanel}
                    />
                </SectionContainer>
                <Divider/>
                <>
                    <SectionContainer>
                        <Title>
                            <div>Validation</div>
                        </Title>
                        <OptionButtonsContainer>
                            <div>Number of Trials</div>
                            <ReverseButton onClick={() => setTestN(1)} isActive={testN !== 1}> 1 </ReverseButton>
                            <ReverseButton onClick={() => setTestN(3)} isActive={testN !== 3}> 3 </ReverseButton>
                        </OptionButtonsContainer>
                        <ButtonContainer>
                            <Button 
                                onClick={() => {
                                    if(!canTest) return;
                                    var filteredDataTable = dataTable.filter((dataEntry: DataEntry) => dataEntry.area === "test" && dataEntry.status === STATUS.DEFAULT);
                                    evaluate(filteredDataTable, 'test', section)
                                }} 
                                isActive={canTest}
                            >
                                Validate Criteria <i className="fa-solid fa-circle-check"></i>
                            </Button>
                            {progress.counts.testing.done !== progress.counts.testing.total && (
                                <ProgressBar progress={progress.counts.testing.done} total={progress.counts.testing.total}>
                                    <div></div>
                                </ProgressBar>
                            )}
                        </ButtonContainer>
                        <StatsSection
                            selectedPrompts={selectedPrompts}
                            criteria={criteria}
                            dataTable={dataTable}
                            type={"test"}
                        />
                    </SectionContainer>
                </>
            </EvalContainer>
        ];
    }

    // Create Dashboard
    const createDeployDashboard = () => {
        const selected = (deployment as {[key: string]: Deployment})[selectedDeployment];
        const editable = selected.settings.instruction === null;
        const hasDeployed = selected.settings.instruction !== null;

        return [
            <InputContainer id='input-container' key='input'>
                <InstructionSection>
                    <InstructionHeader>Evaluation History</InstructionHeader>
                    <EvaluationHistoryContainer>
                        {Object.keys(deployment).map((deploymentId, idx) => {
                            return (
                                <EvaluationHistoryButton
                                    key={idx}
                                    onClick={() => setSelectedDeployment(deploymentId)}
                                    style={{
                                        backgroundColor: selectedDeployment === deploymentId ? '#0088ff' : '#ccc',
                                    }}
                                >
                                    {idx + 1}
                                </EvaluationHistoryButton>
                            )
                        })}
                        <EvaluationHistoryButton
                            style={{backgroundColor: '#fff', color: '#ccc', border: "solid 2px #ccc"}}
                            onClick={() => {
                                const newDeploymentId = createId('d');
                                deploymentDispatch({ type: 'create', id: newDeploymentId });
                                setSelectedDeployment(newDeploymentId);
                            }}
                        >
                            <i className="fa-solid fa-plus"></i>
                        </EvaluationHistoryButton>
                    </EvaluationHistoryContainer>
                </InstructionSection>
                <Divider/>
                <InstructionSection>
                    <InstructionHeader>Instructions</InstructionHeader>
                    <InstructionText
                        value={hasDeployed ? (selected.settings.instruction === null ? "" : selected.settings.instruction)  : instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="Enter your task instruction here..."
                        style={!editable ? {color: '#777'} : {}}
                        disabled={!editable}
                    />
                </InstructionSection>
                <Divider />
                <PromptingSection 
                    prompts={hasDeployed ? selected.settings.prompts : prompts} 
                    selectedPrompts={hasDeployed ? selected.settings.prompts.map((prompt) => prompt.id) : selectedPrompts}
                    createPrompt={(selectedIdx: number) => {
                        const newPrompt: Prompt = {
                            id: createId('p'),
                            name: 'Version ' + (prompts.length + 1),
                            systemPrompt: "",
                            userPrompt: '',
                        };
                        setPrompts([...prompts, newPrompt]);
                        const newSelectedPrompts = [...selectedPrompts];
                        newSelectedPrompts[selectedIdx] = newPrompt.id;
                        setSelectedPrompts(newSelectedPrompts);
                    }}
                    updatePrompt={(prompt: Prompt) => {
                        const newPrompts = [...prompts];
                        const idx = newPrompts.findIndex((p) => p.id === prompt.id);
                        newPrompts[idx] = prompt;
                        setPrompts(newPrompts);
                    }}
                    openPanel={openPanel}
                    setOpenPanel={setOpenPanel}
                    panelData={panelData}
                    setPanelData={setPanelData}
                    section={section}
                    disabled={!editable}
                />
                <Divider/>
                <CriteriaSection
                    instruction={instruction}
                    criteria={hasDeployed ? selected.settings.criteria : criteria}
                    createCriterion={(n, d, type) => createCriterion("", "", 'new')}
                    updateCriterion={(criterion: Criterion) => {
                        const newCriteria = [...criteria];
                        const idx = newCriteria.findIndex((c) => c.id === criterion.id);
                        newCriteria[idx] = criterion;
                        setCriteria(newCriteria);
                    }}
                    deleteCriterion={deleteCriterion}
                    section={section}
                    disabled={!editable}
                    openPanel={openPanel}
                    setOpenPanel={setOpenPanel}
                />
            </InputContainer>,
            <DataContainer key="data" style={openPanel !== "" ? {filter: "brightness(80%)"} : {}}>
                <DeployTable
                    dataTable={selected.dataTable}
                    prompts={selected.settings.prompts}
                    selectedPrompts={selected.settings.prompts.map((prompt) => prompt.id)}
                    criteria={selected.settings.criteria}
                    updateDataEntry={(dataEntryId: string, updatedProps: any) => {
                        deploymentDispatch({
                            type: 'edit', 
                            id: selectedDeployment,
                            editedData: {id: dataEntryId, ...updatedProps}
                        });
                    }}
                    changeSelectedEval={(dataEntryId, criterionId, selectedEval) => {
                        const newEvaluations: EvaluationData[] = [...selected.dataTable.find((dataEntry) => dataEntry.id === dataEntryId)!.evaluations];
                        const idx = newEvaluations.findIndex((evaluation) => evaluation.criterion.id === criterionId);
                        newEvaluations[idx] = {...newEvaluations[idx], selected: selectedEval};
                        deploymentDispatch({
                            type: 'edit',
                            id: selectedDeployment,
                            editedData: {
                                id: dataEntryId,
                                evaluations: newEvaluations
                            }
                        });
                    }}
                    sendToDevelop={(dataEntry: DataEntry) => {
                        dataEntry.isDeploy = false;
                        dataTableDispatch({
                            type: 'add',
                            dataEntry: dataEntry
                        });
                        deploymentDispatch({
                            type: 'edit',
                            id: selectedDeployment,
                            editedData: {
                                id: dataEntry.id,
                                isDeploy: false
                            }
                        });
                    }}
                    developEntryIds={dataTable.map((dataEntry: DataEntry) => dataEntry.id)}
                    deployFilter={deployFilter}
                />
            </DataContainer>,
            <EvalContainer key="evaluation">
                <DeploymentSection 
                    deploySampleSize={selected.settings.sampleSize}
                    setDeploySampleSize={(sampleSize) => {
                        deploymentDispatch({
                            type: 'configure',
                            id: selectedDeployment,
                            settings: {
                                ...selected.settings,
                                sampleSize: sampleSize
                            }
                        });
                    }}
                    deployN={selected.settings.trialN}
                    setDeployN={(trialN) => {
                        deploymentDispatch({
                            type: 'configure',
                            id: selectedDeployment,
                            settings: {
                                ...selected.settings,
                                trialN: trialN
                            }
                        });
                    }}
                    altEvaluator={selected.settings.alternateEvaluator}
                    setAltEvaluator={(altEvaluator) => {
                        deploymentDispatch({
                            type: 'configure',
                            id: selectedDeployment,
                            settings: {
                                ...selected.settings,
                                alternateEvaluator: altEvaluator
                            }
                        });
                    }}
                    deployTable={selected.dataTable}
                    inputSet={inputSet}
                    disabled={!editable}
                />
                <Divider/>
                <ButtonContainer>
                    {<Button onClick={() => canDeploy && deploy(selectedDeployment)} isActive={canDeploy}>
                        Run Evaluation <i className="fa-solid fa-play"></i>
                    </Button>}
                    {progress.counts.deploying.done !== progress.counts.deploying.total && (
                        <ProgressBar progress={progress.counts.deploying.done} total={progress.counts.deploying.total}>
                            <div></div>
                        </ProgressBar>
                    )}
                    {progress.counts.validating.done !== progress.counts.validating.total && (
                        <ProgressBar progress={progress.counts.validating.done} total={progress.counts.validating.total}>
                            <div style={{backgroundColor: "#0088FF99"}}></div>
                        </ProgressBar>
                    )}
                </ButtonContainer>
                <Divider/>
                <DeployStatsSection
                    criteria={criteria}
                    dataTable={selected.dataTable}
                    deployFilter={deployFilter}
                    setDeployFilter={(filter: {type: string, criteriaId: string, section: string} | null) => {
                        setDeployFilter(filter);
                    }}
                    openPanel={openPanel}
                    setOpenPanel={setOpenPanel}
                />
            </EvalContainer>
        ];
    }

    // Create Dashboard
    return (
        <OuterContainer onClick={() => setOpenPanel("")}>
            <Modal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
            <Header> 
                <div>
                    ⚗️
                    <span>E<span style={{fontSize: "12px"}}>VAL</span>LM</span>
                </div>
                <div>
                    <SectionButton onClick={() => setSection("develop")} selected={section === "develop"}> Develop </SectionButton>
                    <i className="fa-solid fa-chevron-right"></i>
                    <SectionButton 
                        onClick={() => {
                            if(selectedDeployment === "") {
                                const newDeploymentId = createId('dep');
                                deploymentDispatch({type: 'create', id: newDeploymentId});
                                setSelectedDeployment(newDeploymentId);
                            }
                            setSection("deploy")
                        }} 
                        selected={section === "deploy"}
                    > Deploy </SectionButton>
                </div>
                <div>
                    <HeaderButton
                        isActive={isModalOpen}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsModalOpen(true);
                        }}
                        data-tooltip-id="tooltip"
                        data-tooltip-content="View information about the application."
                    >
                        <i className="fa-solid fa-info"></i>
                    </HeaderButton>
                </div>
            </Header>
            <InnerContainer>
                {section === "develop" ? createDevelopDashboard() : createDeployDashboard()}
                <Panel
                    direction={"left"}
                    openPanel={openPanel}
                    setOpenPanel={setOpenPanel}
                    panelData={panelData}
                    prompts={prompts}
                    selectedPrompts={selectedPrompts}
                    changeSelectedPrompt={(index: number, promptId: string) => {
                        const newSelectedPrompts = [...selectedPrompts];
                        newSelectedPrompts[index] = promptId;
                        setSelectedPrompts(newSelectedPrompts);
                    }}
                    inputSet={openPanel === "sampling" ? inputSet : []}
                    sampledInputs={openPanel === "sampling" ? dataTable.map((dataEntry: DataEntry) => dataEntry.input.id) : []}
                    addInputSamples={(sampledInputs) => addInputSamples(sampledInputs, "develop", '', true)}
                    criteria={criteria}
                    createCriterion={(n, d) => createCriterion(n, d, 'predefined')}
                    history={history}
                />
                <Panel
                    direction={"right"}
                    openPanel={openPanel}
                    setOpenPanel={setOpenPanel}
                    panelData={panelData}
                    prompts={prompts}
                    selectedPrompts={selectedPrompts}
                    changeSelectedPrompt={(index: number, promptId: string) => {
                        const newSelectedPrompts = [...selectedPrompts];
                        newSelectedPrompts[index] = promptId;
                        setSelectedPrompts(newSelectedPrompts);
                    }}
                    inputSet={openPanel === "sampling" ? inputSet : []}
                    sampledInputs={openPanel === "sampling" ? dataTable.map((dataEntry: DataEntry) => dataEntry.input.id) : []}
                    addInputSamples={(sampledInputs) => addInputSamples(sampledInputs, "develop")}
                    criteria={criteria}
                    createCriterion={(n, d) => createCriterion(n, d, 'predefined')}
                    history={history}
                />
            </InnerContainer>
        </OuterContainer>
    );
}

const OuterContainer = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    color: #555;
`;

const Header = styled.div`
    height: 48px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    background-color: #fff;
    z-index: 5;

    & > div {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 100%;
    }
    & > div:nth-child(1) {
        flex: 1;
        margin-left: 20px;
        color: #555555;
        font-size: 16px;
        font-weight: bold;
    }
    & > div:nth-child(2) {
        flex: 4;
        justify-content: center;
        color: #ccc;
        gap: 12px;
        font-size: 24px;
    }
    & > div:nth-child(3) {
        flex: 1;
        justify-content: flex-end;
        margin-right: 20px;
    }
`;

const SectionButton = styled.button<{selected: boolean}>`
    height: 100%;
    color: #555;
    font-weight: normal;
    width: 112px;
    padding-top: 4px;
    border-bottom: solid 4px transparent;
    font-size: 16px;

    &:hover {
        background-color: #f9f9f9;
    }

    ${(props) => props.selected && `
        color: #0088ff;
        font-weight: bold;
        border-color: #0088ff;
    `}
`;

const InnerContainer = styled.div`
    height: calc(100% - 48px);
    width: 100%;
    display: flex;
    flex-direction: row;
    position: relative;
    overflow-x: hidden;
`;

const InputContainer = styled.div`
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    border-top: solid 2px #f5f5f5;
    align-items: start;
    text-align: left;
    padding: 24px 24px 24px 24px;
    box-shadow: 4px 4px 4px 0 rgba(0,0,0,0.1);
    background-color: #fff;
    z-index: 5;
    gap: 16px;
    overflow-y: auto;

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

const DataContainer = styled.div`
    height: 100%;
    flex: 3;
    background-color: #F5F7FA;
    position: relative;
`;

const EvalContainer = styled.div`
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    border-top: solid 2px #f5f5f5;
    align-items: start;
    text-align: left;
    padding: 24px;
    gap: 16px;
    box-shadow: -4px 4px 4px 0 rgba(0,0,0,0.1);
    background-color: #fff;
    z-index: 5;
    overflow-y: auto;

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

const Divider = styled.hr`
    width: 100%;
    border: 1px solid #f5f5f5;
`;

const ButtonContainer = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Button = styled.button<{isActive?: boolean, color?: string, isPressed?: boolean}>`
    height: 36px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: 6px;
    border: solid 2px ${(props) => props.isActive ? (props.color ? props.color : '#0088FF') : '#cccccc'};
    background-color: ${(props) => props.isActive ? (props.color ? props.color : '#0088FF') : '#cccccc'}1A;
    color: ${(props) => props.isActive ? (props.color ? props.color : '#0088FF') : '#cccccc'};
    font-size: 14px;
    font-weight: bold;
    cursor: ${(props) => props.isActive ? 'pointer' : 'default'};
    box-shadow: ${(props) => props.isActive ? "0 2px 2px rgba(0,0,0,0.1)" : "none"};
    
    ${(props) => props.isActive && (
        `&:hover {
            background-color: ${props.color ? props.color : '#0088FF'}33;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }`
    )}

    ${(props) => props.isPressed && (`
        background-color: ${props.color}33 !important;
        box-shadow: inset 0px 4px 4px rgba(0,0,0,0.1) !important;
    `)}
`;

const ReverseButton = styled.button<{isActive?: boolean}>`
    height: 36px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: 6px;
    border: solid 2px ${(props) => props.isActive ? '#cccccc' : "#aaaaaa"};
    background-color: ${(props) => props.isActive ? '#cccccc1A' : "#aaaaaa66"};
    color: ${(props) => props.isActive ? '#999999' : '#aaaaaa'};
    font-size: 14px;
    font-weight: bold;
    cursor: ${(props) => props.isActive ? 'pointer' : 'default'};
    box-shadow: ${(props) => props.isActive ? "0 2px 2px rgba(0,0,0,0.1)" : "inset 0 4px 4px rgba(0,0,0,0.1)"};
    opacity: ${(props) => props.isActive ? 1 : 0.7};
    
    ${(props) => props.isActive && (
        `&:hover {
            background-color: #CCCCCC33;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }`
    )}
`;

const ProgressBar = styled.div<{progress: number, total: number}>`
    height: 8px;
    width: 100%;
    display: flex;
    gap: 8px;
    border-radius: 8px;
    background-color: #ddd;
    overflow: hidden;

    & > div {
        height: 100%;
        width: ${(props) => props.progress / props.total * 100}%;
        background-color: #0088FF;
    }
`;

const InstructionSection = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
`;

const InstructionHeader = styled.div`
    font-size: 16px;
`;

const InstructionText = styled.textarea`
    font-size: 14px;
    padding: 8px 12px;
    background-color: #F5F7FA;
    border-radius: 8px;
    height: 100px;
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

const OptionButtonsContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    width: 100%;
    align-items: center;
    font-size: 16px;

    & > div {
        color: #999;
        flex: 3;
    }
    & > button {
        flex: 1;
    }
`;

const EvaluationHistoryContainer = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 8px;
    align-items: center;
    justify-content: center;
`;

const EvaluationHistoryButton = styled.div`
    height: 24px;
    width: 24px;
    border-radius: 50%;
    color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0.8;
    cursor: pointer;

    &:hover {
        opacity: 1;
    }
`;


const Title = styled.div`
    width: 100%;
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

const SectionContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
`;

export default Dashboard;