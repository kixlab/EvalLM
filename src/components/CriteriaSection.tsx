import React, { useState, useEffect, useRef, useReducer, useContext } from 'react';
import styled from 'styled-components';

import { GenerateContext } from '../api/GenerateContext';

import { Criterion } from '../types';

import { ReactComponent as MergeIcon } from './icons/merge.svg';
import { ReactComponent as SplitIcon } from './icons/split.svg';

interface AnalysisData {
    'merge': {'name': string, 'description': string, original_criteria: string[], seen: boolean}[];
    'split': {'name': string, 'description': string, original_criteria: string | undefined, seen: boolean}[];
    'refine': {'name': string, 'description': string, original_criteria: string | undefined, seen: boolean}[];
}

const analysisReducer = (state: AnalysisData, action: any) => {
    switch (action.type) {
        case 'set':
            return {
                ...state,
                [action.analysisType]: action.data
            }
        case 'update_deleted':
            return {
                'merge': state['merge'].filter((result) => !result['original_criteria'].includes(action.deletedCriterionId)),
                'split': state['split'].filter((result) => result['original_criteria'] !== action.deletedCriterionId),
                'refine': state['refine'].filter((result) => result['original_criteria'] !== action.deletedCriterionId)
            };
        case 'update_seen':
            if(action.analysisType === 'merge') {
                return {
                    ...state,
                    'merge': state['merge'].map((result, idx) => {
                        if(idx === action.idx) {
                            return { ...result, seen: true };
                        }
                        return result;
                    })
                }
            } else if(action.analysisType === 'split') {
                return {
                    ...state,
                    'split': state['split'].map((result, idx) => {
                        if(idx === action.idx) {
                            return { ...result, seen: true };
                        }
                        return result;
                    })
                }
            } else if(action.analysisType === 'refine') {
                return {
                    ...state,
                    'refine': state['refine'].map((result, idx) => {
                        if(idx === action.idx) {
                            return { ...result, seen: true };
                        }
                        return result;
                    })
                }
            }
            return state;
        case 'reset':
            return { 'merge': [], 'split': [], 'refine': [] }
        default:
            throw new Error();
    }
}

interface Props {
    instruction: string;
    criteria: Criterion[];
    createCriterion: (name: string, description: string, type: string) => void;
    updateCriterion: (criterion: Criterion) => void;
    deleteCriterion: (criteriaId: string) => void;
    section: string;
    disabled?: boolean;
    openPanel: string;
    setOpenPanel: (panel: string) => void;
}

const CriteriaSection = ({
    instruction,
    criteria,
    createCriterion,
    updateCriterion,
    deleteCriterion,
    section,
    disabled,
    openPanel,
    setOpenPanel
}: Props) => {
    // const [autoAnalysis, _] = useState<boolean>(true);
    // const [analysisTimeout, setAnalysisTimeout] = useState<any>(null);
    const [analysisProgress, setAnalysisProgress] = useState<number>(0);
    const [analysisResults, dispatchAnalysisResults] = useReducer(analysisReducer, {'merge': [], 'split': [], 'refine': []});
    const [selectedAnalysis, setSelectedAnalysis] = useState<any>({type: '', idx: -1});

    const { reviewCriteria } = useContext(GenerateContext);

    const criteriaRef = useRef(criteria);

    // useEffect(() => {
    //     return () => {
    //         clearTimeout(analysisTimeout);
    //     }
    // }, []);

    // auto increase height of textarea and set analysis timer
    useEffect(() => {
        // var isChanged = false;
        if(criteriaRef.current.length < criteria.length) {
            // focus on the new criterion '#criteria-' + criteriaId + ' input'
            const newCriteria = criteria[criteria.length - 1];
            const input = document.querySelector<HTMLInputElement>('#criteria-' + newCriteria.id + ' input');
            if(input) {
                input.focus();
            }

            const textarea = document.querySelector<HTMLTextAreaElement>('#criteria-' + newCriteria.id + ' textarea');
            if(textarea) {
                textarea.style.height = '0px';
                textarea.style.height = textarea.scrollHeight + 'px';
            }
            // isChanged = true;
        } else {
            // remove analysis results that contain the deleted criterion
            const deletedCriterion = criteriaRef.current.find((criterion) => !criteria.some((c) => c.id === criterion.id));
            if(deletedCriterion) {
                dispatchAnalysisResults({type: 'update_deleted', deletedCriterionId: deletedCriterion.id});
                // isChanged = true;
            }
            const textareas = document.querySelectorAll<HTMLElement>('#criteria-section textarea');
            textareas.forEach((textarea) => {
                textarea.style.height = '0px';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
        }

        for(let i = 0; i < criteria.length; i++) {
            const criterion = criteria[i];
            const prevCriterion = criteriaRef.current.find((c) => c.id === criterion.id);
            if(!prevCriterion || prevCriterion.name !== criterion.name || prevCriterion.description !== criterion.description) {
                // isChanged = true;
                break;
            }
        }
        
        // if(isChanged) {
        //     resetAutoAnalysis();
        // }

        if(selectedAnalysis.type !== '') {
            const analysisResult = analysisResults[(selectedAnalysis.type as 'merge' | 'split' | 'refine')][selectedAnalysis.idx];
            if(analysisResult && !analysisResult.seen) {
                dispatchAnalysisResults({type: 'update_seen', analysisType: selectedAnalysis.type, idx: selectedAnalysis.idx});
            }
        }

        criteriaRef.current = JSON.parse(JSON.stringify(criteria));
    }, [criteria, selectedAnalysis, analysisResults]);

    // const resetAutoAnalysis = () => {
    //     if(autoAnalysis && analysisProgress === 0) {
    //         clearTimeout(analysisTimeout);
    //         const timeout = setTimeout(() => {
    //             analyzeCriterion(criteriaRef.current, true);
    //         }, 3 * 60 * 1000);
    //         setAnalysisTimeout(timeout);
    //     }
    // }

    const fetchAnalysisResults = (criteria: Criterion[], type: string) => {
        reviewCriteria(type, instruction, criteria, (response) => {
            setAnalysisProgress(prevProgress => prevProgress - 1);
            if(response.error) {
                console.error('[Criteria Analysis] Error:', response.error);
                return;
            }
            const results: any[] = [];
            response.data.forEach((data: any) => {
                if(type === 'merge') {
                    results.push({
                        'name': data['name'],
                        'description': data['description'],
                        'original_criteria': data['original_criteria'].map((criteria_name: string) => criteria.find((criterion) => criterion.name === criteria_name)?.id),
                        'seen': false
                    });
                } else {
                    results.push({
                        'name': data['name'],
                        'description': data['description'],
                        'original_criteria': criteria.find((criterion) => criterion.name === data['original_criteria'])?.id,
                        'seen': false
                    });
                }
            })
            dispatchAnalysisResults({type: 'set', analysisType: type, data: results});
        });
    }

    const analyzeCriterion = (criteria: Criterion[], isAutomatic: boolean) => {
        if(analysisProgress !== 0) return;
        if(criteria.some((criterion) => criterion.name === '' || criterion.description === '')) return;

        // if(analysisTimeout) clearTimeout(analysisTimeout);

        setAnalysisProgress(3);
        
        dispatchAnalysisResults({type: 'reset', data: null});

        fetchAnalysisResults(criteria, 'merge');
        fetchAnalysisResults(criteria, 'split');
        fetchAnalysisResults(criteria, 'refine');
    }

    const openCriteriaPanel = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.stopPropagation();
        setOpenPanel(openPanel === "criteria" ? "" : "criteria");
    }

    return (
        <Container id="criteria-section">
            <Title>
                <div>Criteria</div>
                {section === "develop" && [
                    <HeaderButton key={0}
                        isActive={openPanel === "criteria"}
                        isAnimate={false}
                        onClick={openCriteriaPanel}
                        data-tooltip-id="tooltip"
                        data-tooltip-content="Select from list of pre-existing criteria."
                    >
                        <i className="fa-solid fa-book"></i>
                    </HeaderButton>,
                    <HeaderButton key={1}
                        isActive={analysisProgress !== 0}
                        isAnalyzing={false} 
                        isAnimate={true}
                        onClick={() => analyzeCriterion(criteria, false)}
                        data-tooltip-id="tooltip"
                        data-tooltip-content="Analyze criteria for ambiguities, redundancies, or overgeneralizations."
                    >
                        <i className="fa-solid fa-bolt"></i>
                    </HeaderButton>
                ]}
            </Title>
            {criteria.map((criterion) => {
                const { id, name, color, description } = criterion;

                var mergeIdx = -1;
                var splitIdx = -1;
                var refineIdx = -1;
                var isLastInMerge = false;

                if(analysisResults['merge'])  {
                    mergeIdx = analysisResults['merge'].findIndex((merge: any) => merge['original_criteria'].includes(id));
                    isLastInMerge = mergeIdx !== -1 && id === analysisResults['merge'][mergeIdx]['original_criteria'][analysisResults['merge'][mergeIdx]['original_criteria'].length - 1];
                }
                if(analysisResults['split']) {
                    splitIdx = analysisResults['split'].findIndex((split: any) => split['original_criteria'] === id);
                }
                if(analysisResults['refine']) {
                    refineIdx = analysisResults['refine'].findIndex((refine: any) => refine['original_criteria'] === id);
                }

                var mergeSelected = selectedAnalysis['type'] === 'merge' && selectedAnalysis['idx'] === mergeIdx;
                var splitSelected = selectedAnalysis['type'] === 'split' && selectedAnalysis['idx'] === splitIdx;
                var refineSelected = selectedAnalysis['type'] === 'refine' && selectedAnalysis['idx'] === refineIdx;
                var selectedAnalysisData: {'name': string, 'description': string, 'original_criteria': string | string[] | undefined}[] = [];
                if(mergeSelected) {
                    selectedAnalysisData = [analysisResults['merge'][mergeIdx]];
                } else if(splitSelected) {
                    selectedAnalysisData = analysisResults['split'].filter((data: any) => data['original_criteria'] === id);
                } else if(refineSelected) {
                    selectedAnalysisData = analysisResults['refine'].filter((data: any) => data['original_criteria'] === id);
                }


                return [
                    <CriterionContainer key={id} id={"criteria-" + id} style={mergeSelected || splitSelected ? {outline: "solid 2px #0088ff99"} : {}}>
                        <CriterionLabel>
                            <CriterionColor>
                                <div style={{backgroundColor: color}}></div>
                            </CriterionColor>
                            <input 
                                key={id} value={name}
                                placeholder={"Enter criterion name..."}
                                onChange={(e) => {
                                    const newCriterion = {...criterion};
                                    newCriterion.name = e.target.value;
                                    updateCriterion(newCriterion);
                                }}
                                style={disabled ? {color: "#777"} : {}}
                                disabled={disabled}
                            />
                            {mergeIdx !== -1 && (
                                <AnalysisIndicators
                                    selected={mergeSelected}
                                    onClick={() => mergeSelected ? setSelectedAnalysis({type: '', idx: -1}) : setSelectedAnalysis({type: 'merge', idx: mergeIdx})}
                                    seen={analysisResults['merge'][mergeIdx]['seen']}
                                >
                                    <MergeIcon />
                                </AnalysisIndicators>
                            )}
                            {splitIdx !== -1 && (
                                <AnalysisIndicators
                                    selected={splitSelected}
                                    onClick={() => splitSelected ? setSelectedAnalysis({type: '', idx: -1}) : setSelectedAnalysis({type: 'split', idx: splitIdx})}
                                    seen={analysisResults['split'][splitIdx]['seen']}
                                >
                                    <SplitIcon />
                                </AnalysisIndicators>
                            )}
                            {refineIdx !== -1 && (
                                <AnalysisIndicators
                                    selected={refineSelected}
                                    onClick={() => refineSelected ? setSelectedAnalysis({type: '', idx: -1}) : setSelectedAnalysis({type: 'refine', idx: refineIdx})}
                                    seen={analysisResults['refine'][refineIdx]['seen']}
                                >
                                    <i className="fa-solid fa-pen-fancy"></i>
                                </AnalysisIndicators>
                            )}
                            {section === "develop" && (
                                <div onClick={() => !disabled && deleteCriterion(id)}>
                                    <i className="fa-solid fa-trash"></i>
                                </div>
                            )}
                        </CriterionLabel>
                        <DescriptionList>
                            <Description>
                                <textarea 
                                    value={description}
                                    placeholder={"Enter description..."}
                                    onKeyDown={(e) => {
                                        // prevent new line
                                        if(e.key === 'Enter') {
                                            e.preventDefault();
                                        }
                                    }}
                                    onChange={(e) => {
                                        const newCriterion = {...criterion};
                                        newCriterion.description = e.target.value;
                                        updateCriterion(newCriterion);
                                    }}
                                    style={disabled ? {color: "#777"} : {}}
                                    disabled={disabled}
                                />
                            </Description>
                        </DescriptionList>
                    </CriterionContainer>,
                    (splitSelected || (mergeSelected && isLastInMerge) || refineSelected) && (
                        <AnalysisContainer>
                            <AnalysisHeader>
                                <div>{splitSelected ? "Split" : (mergeSelected ? "Merge" : "Refine")}</div>
                                {mergeSelected ? 
                                    (selectedAnalysisData[0]['original_criteria'] as string[]).map((criterionId: string) => {
                                        const criterion = criteria.find((criterion) => criterion.id === criterionId);
                                        if(!criterion) return <></>;
                                        return (<div style={{backgroundColor: criterion.color}}>{criterion.name}</div>)
                                    }) :
                                    ((criterionId: string) => {
                                        const criterion = criteria.find((criterion) => criterion.id === criterionId);
                                        if(!criterion) return;
                                        return <div style={{backgroundColor: criterion.color}}>{criterion.name}</div>;
                                    })(selectedAnalysisData[0]['original_criteria'] as string)
                                }
                            </AnalysisHeader>
                            {selectedAnalysisData.map((data: any) => {
                                return (
                                    <CriterionContainer 
                                        isHoverable={true} 
                                        onClick={() => {
                                            createCriterion(data['name'], data['description'], splitSelected ? 'split' : (mergeSelected ? 'merge' : 'refine'));
                                            // delete from analysis results
                                            if(splitSelected) {
                                                const newAnalysisResults = {...analysisResults};
                                                newAnalysisResults['split'] = newAnalysisResults['split'].filter((split: any) => split['name'] !== data['name'] && split['description'] !== data['description']);
                                                dispatchAnalysisResults({type: 'set', analysisType: 'split', data: newAnalysisResults['split']});
                                                if(!newAnalysisResults['split'].some((split: any) => split['original_criteria'] === id)) {
                                                    setSelectedAnalysis({type: '', idx: -1});
                                                }
                                            } else if (refineSelected) {
                                                const newAnalysisResults = {...analysisResults};
                                                newAnalysisResults['refine'] = newAnalysisResults['refine'].filter((refine: any) => refine['name'] !== data['name'] && refine['description'] !== data['description']);
                                                dispatchAnalysisResults({type: 'set', analysisType: 'refine', data: newAnalysisResults['refine']});
                                                setSelectedAnalysis({type: '', idx: -1});
                                            } else if(mergeSelected) {
                                                const newAnalysisResults = {...analysisResults};
                                                newAnalysisResults['merge'] = newAnalysisResults['merge'].filter((merge: any) => merge['name'] !== data['name'] && merge['description'] !== data['description']);
                                                dispatchAnalysisResults({type: 'set', analysisType: 'merge', data: newAnalysisResults['merge']});
                                                setSelectedAnalysis({type: '', idx: -1});
                                            }
                                        }
                                    }>
                                        <CriterionLabel>
                                            <CriterionColor>
                                                <div style={{backgroundColor: "#ccc"}}></div>
                                            </CriterionColor>
                                            <input value={data['name']}/>
                                        </CriterionLabel>
                                        <DescriptionList>
                                            <Description>
                                                <textarea value={data['description']}/>
                                            </Description>
                                        </DescriptionList>
                                    </CriterionContainer>
                                );
                            })}
                        </AnalysisContainer>
                    )
                ];
            })}
            {section === "develop" && (<>
                <CriterionContainer>
                    <CriterionLabel>
                        <input
                            style={{borderRadius: "8px", fontWeight: "normal", cursor: "pointer", padding: "12px"}}
                            type="text"
                            placeholder="Enter new criterion name..."
                            onClick={() => createCriterion("", "", 'new')}
                        />
                    </CriterionLabel>
                </CriterionContainer>
            </>)}
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
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;

    & > div:first-child {
        flex: 1;
    }
`;

const HeaderButton = styled.div<{isAnimate: boolean, isActive: boolean, isAnalyzing?: boolean}>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: solid 2px #ccc;
    font-size: 12px;
    color: ${(props) => props.isActive ? (!props.isAnalyzing ? "#0088ff" : "#FFBF00" ) : "#ccc"};
    cursor: pointer;

    ${(props) => props.isActive && props.isAnimate && `
        border: 2px dotted transparent;
        background-image: linear-gradient(
            to right,
            rgb(255 255 255 / 1),
            rgb(255 255 255 / 1)
        ),
        conic-gradient(
            from var(--angle),
            ${!props.isAnalyzing ? "#0088FF99" : "#FFBF0099"} 0deg 120deg,
            #FFFFFF 120deg 180deg,
            ${!props.isAnalyzing ? "#0088FF99" : "#FFBF0099"} 180deg 300deg,
            #FFFFFF 300deg 360deg
        );
        background-origin: border-box;
        background-clip: padding-box, border-box;
    
        animation: rotate ${!props.isAnalyzing ? "4s" : "1s"} linear infinite;
    
        @property --angle {
            syntax: "<angle>";
            initial-value: 0deg;
            inherits: false;
        }
        
        @keyframes rotate {
            to {
                --angle: 360deg;
            }
        }}
    `}

    ${(props) => props.isActive && !props.isAnimate && `color: #0088ff; border-color: #0088ff;`}
    ${(props) => !props.isActive && `&:hover { color: #0088FF99; border-color: #0088FF99; }`}
`;

const CriterionContainer = styled.div<{isHoverable?: boolean}>`
    display: flex;
    flex-direction: column;
    border-radius: 8px;

    ${(props) => props.isHoverable && `
        cursor: pointer;
        & input {
            cursor: pointer;
        }
        & textarea {
            cursor: pointer;
        }
        &:hover {
            outline: solid 1px #0088ff99;
            & > div {
                background-color: #ebeff5;
            }
            & textarea {
                background-color: #ebeff5;
            }
        }
    `}
`;

const CriterionLabel = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    border-radius: 8px 8px 0 0;
    background-color: #F5F7FA;
    &:focus-within {
        background-color: #ebeff5;
    }

    & > input {
        flex: 1;
        min-width: 0px;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 12px 8px 12px 0;
        color: #333;
        font-weight: bold;
        font-size: 14px;
        outline: none;
        background: transparent;
    }
    & > div {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;

        height: 28px;
        width: 28px;
        border-radius: 50%;
        margin-right: 8px;

        color: #ccc;
        cursor: pointer;
        &:hover {
            color: #0088FF;
        }
    }
`;

const AnalysisIndicators = styled.div<{selected: boolean, seen: boolean}>`
    border: solid 2px ${(props) => props.selected ? "transparent" : (!props.seen ? "#0088ffcc" : "#ddd")};
    background-color: ${(props) => props.selected ? "#0088FF" : "transparent"};
    color: ${(props) => props.selected ? "#fff" : (!props.seen ? "#0088ffcc" : "#ddd")} !important;
    & svg {
        height: 16px;
        width: 16px;

        & path {
            stroke: ${(props) => props.selected ? "#fff" : (!props.seen ? "#0088ffcc" : "#ddd")};
        }
    }
    &:hover {
        border-color: ${(props) => props.selected ? "transparent" : "#0088ff"};
        background-color: ${(props) => props.selected ? "#0088FFcc" : "#0088ff11"};
        color: ${(props) => props.selected ? "#fff" : "#0088ff"} !important;
        & svg path {
            stroke: ${(props) => props.selected ? "#fff" : "#0088ff"};
        }
    }
`;

const CriterionColor = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default !important;
    margin-left: 8px;

    & > div {
        width: 16px;
        height: 16px;
        border-radius: 4px;
    }
`;

const DescriptionList = styled.div`
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    color: #555;

    & > div:last-child {
        border-bottom: none;
    }
    & > div:first-child {
        & > div:first-child { border-top-left-radius: 8px; }
        & > div:last-child { border-top-right-radius: 8px; }
    }
`;

const Description = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    border-top: solid 1px #E9E9E9;
    border-radius: 0 0 8px 8px;

    & > textarea {
        resize: none;
        overflow: hidden;
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 8px 12px;
        color: #555;
        font-size: 14px;
        background-color: #F5F7FA;
        border-radius: 0 0 8px 8px;
        outline: none;
        &:focus {
            background-color: #ebeff5;
        }
    }
`;

const AnalysisContainer = styled.div`
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    outline: solid 2px #0088ff99;
    padding: 8px;
    gap: 8px;
`;

const AnalysisHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    & > div:first-child {
        color: #999;
        padding: 0px;
    }
    & > div {
        padding: 4px 8px;
        color: #fff;
        border-radius: 4px;
    }
`;

export default CriteriaSection;