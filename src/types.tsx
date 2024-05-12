// id: c-XXXX
export type Criterion = {
    id: string;
    name: string;
    color: string;
    description: string;
}

// id: p-XXXX
export type Prompt = {
    id: string;
    name: string;
    systemPrompt: string;
    userPrompt: string;
}

// id: i-XXXX
export type InputData = {
    id: string;
    text: string;
    outputs?: string[];
}

// id: o-XXXX
export type OutputData = {
    prompt: Prompt;
    inputId: string;
    text: string;
}

export type Suggestions = {
    name: string;
    description: string;
    winners?: number[];
}

// id: e-XXXX
export type EvaluationData = {
    criterion: Criterion;
    overallWinner: number;
    winners: number[];
    scores: number[][];
    explanations: string[];
    evidence: string[][][];
    agreement: number;
    similarCriteria: string[];
    selected: number;
    testOverallWinner: number;
    testWinners: number[];
    testScores: number[][];
    testExplanations: string[];
    testEvidence: string[][][];
    isRefining: boolean;
    suggestions?: Suggestions[];
    feedback?: string;
}

// id: d-XXXX
export type DataEntry = {
    id: string;
    input: InputData;
    outputs: OutputData[];
    evaluations: EvaluationData[];
    status: number;
    selectedCriterionId: string | null;
    area: string;
    criteriaSuggestions?: EvaluationData;
    isDeploy?: boolean;
}

export type EvalResponse = {
    criterion: Criterion,
    overallWinner?: number,
    winners?: number[],
    scores?: number[][],
    explanations?: string[],
    evidence?: string[][][],
    agreement?: number,
    similarCriteria?: string[]
}

export type Deployment = {
    id: string,
    settings: {
        instruction: string | null,
        prompts: Prompt[],
        criteria: Criterion[],
        sampleSize: number,
        trialN: number,
        alternateEvaluator: string
    },
    dataTable: DataEntry[],
    isDeploying: boolean
}