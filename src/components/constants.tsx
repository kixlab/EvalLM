export const COLORWHEEL = [
    "#F27A7A",
    "#daa641",
    "#5eb537",
    "#98E0CF",
    "#93A7F0",
    "#AA83EB",
    "#EB97F9"
]

export const STATUS = {
    DEFAULT: 0,
    GENERATING: 1,
    EVALUATING: 2,
    REFINING: 3,
    SUGGESTING: 4,
    TESTING: 5
}

export const DEFAULT_CONFIGS = {
    "generate": { "temperature": 0.7, "model": "gpt-4o-2024-11-20" },
    "evaluate": { "temperature": 0.3, "model": "gpt-4o-2024-11-20" }
}

export const PREDEFINED_CRITERIA = [
    // UniEval
    {
        'name': 'Naturalness',
        'description': 'Judge whether a response is like something a person would naturally say.',
        'reference': 'https://arxiv.org/abs/2210.07197',
        'paper': 'Towards a Unified Multi-Dimensional Evaluator for Text Generation'
    },
    {
        'name': 'Coherence',
        'description': 'Determine whether this response serves as a valid continuation of the previous conversation.',
        'reference': 'https://arxiv.org/abs/2210.07197',
        'paper': 'Towards a Unified Multi-Dimensional Evaluator for Text Generation'
    },
    {
        'name': 'Engagingness',
        'description': 'Determine if the response is interesting or dull.',
        'reference': 'https://arxiv.org/abs/2210.07197',
        'paper': 'Towards a Unified Multi-Dimensional Evaluator for Text Generation'
    },
    {
        'name': 'Groundedness',
        'description': 'Given the fact that this response is conditioned on, determine whether this response uses that fact.',
        'reference': 'https://arxiv.org/abs/2210.07197',
        'paper': 'Towards a Unified Multi-Dimensional Evaluator for Text Generation'
    },
    {
        'name': 'Understandability',
        'description': 'Judge whether the response is understandable.',
        'reference': 'https://arxiv.org/abs/2210.07197',
        'paper': 'Towards a Unified Multi-Dimensional Evaluator for Text Generation'
    },
    // SummEval
    {
        'name': 'Coherence',
        'description': 'The collective quality of all sentences. The response should be well-structured and well-organized. The response should not just be a heap of related information, but should build from sentence to a coherent body of information about a topic.',
        'reference': 'https://arxiv.org/abs/2007.12626',
        'paper': 'SummEval: Re-evaluating Summarization Evaluation'
    },
    {
        'name': 'Consistency',
        'description': 'The factual alignment between the summary and the summarized source. A factually consistent summary contains only statements that are entailed by the source document. Summaries that contain hallucinated facts should be penalized.',
        'reference': 'https://arxiv.org/abs/2007.12626',
        'paper': 'SummEval: Re-evaluating Summarization Evaluation'
    },
    {
        'name': 'Fluency',
        'description': 'The quality of the response in terms of grammar, spelling, punctuation, word choice, and sentence structure. The response should contain few or no errors, and should be easy to read and follow.',
        'reference': 'https://arxiv.org/abs/2007.12626',
        'paper': 'SummEval: Re-evaluating Summarization Evaluation'
    },
    {
        'name': 'Relevance',
        'description': 'The selection of important content from the source. The summary should include only important information from the source document. Summaries that contain redundancies and excess information should be penalized.',
        'reference': 'https://arxiv.org/abs/2007.12626',
        'paper': 'SummEval: Re-evaluating Summarization Evaluation'
    },
    // LongEval
    {
        'name': 'Faithfulness',
        'description': 'The summary is devoid of factual errors, where a factual error is a statement that contradicts the source document, or is not directly stated, heavily implied, or logically entailed by the source document.',
        'reference': 'https://arxiv.org/abs/2301.13298',
        'paper': 'LongEval: Guidelines for Human Evaluation of Faithfulness in Long-form Summarization'
    },
    // FLASK
    {
        'name': 'Factuality',
        'description': 'Did the assistant extract pertinent and accurate background knowledge without any misinformation when factual knowledge retrieval is needed? Is the response supported by reliable evidence or citation of the source of its information?',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Commonsense Understanding',
        'description': 'Is the assistant accurately interpreting world concepts for instructions that require a simulation of the expected result or necessitate commonsense or spatial reasoning?',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Comprehension',
        'description': 'Does the response fulfill the requirements of the instruction by providing relevant information especially when the instruction is complex and includes multiple requirements? This includes responding in accordance with the explicit and implicit purpose of given instruction.',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Insightfulness',
        'description': 'Is the response creative, original or novel, including new perspectives or interpretations of existing information?',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Completeness',
        'description': 'Does the response provide a sufficient explanation? Comprehensiveness and thoroughness of the response should be considered, which depends on the breadth of topics covered and the level of detail provided within each topic.',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Metacognition',
        'description': 'Did the model respond with awareness of its own capability? Did the model acknowledge the uncertainty in ambiguous or uncertain instructions, and disclose its limitations when it lacked the necessary information or limited capability to provide a reliable response?',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Readability',
        'description': 'Is the response structured to promote readability and coherence? Does the response exhibit excellent organization?',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Conciseness',
        'description': 'Is the response presented in a concise manner for the reader without any unnecessary information?',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Harmlessness',
        'description': 'Does the response refrain from biases tied to gender, race, ethnicity, or religion? Moreover, does it consider potential risks to user safety, avoiding provision of responses that could potentially result in physical harm or endangerment?',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Logical Correctness',
        'description': 'Does the response ensure general applicability and avoid logical contradictions in its reasoning steps for an instruction that requires step-by-step logical process? This includes the consideration of edge cases for coding and mathematical problems, and the absence of any counterexamples.',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Logical Robustness',
        'description': 'Is the final answer provided by the response logically accurate and correct for an instruction that has a deterministic answer?',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    },
    {
        'name': 'Logical Efficiency',
        'description': 'Is the response logically efficient? The logic behind the response should have no redundant step, remaining simple and efficient. For tasks involving coding, the proposed solution should also consider time complexity.',
        'reference': 'https://arxiv.org/abs/2307.10928',
        'paper': 'FLASK: Fine-grained Language Model Evaluation based on Alignment Skill Sets'
    }
];