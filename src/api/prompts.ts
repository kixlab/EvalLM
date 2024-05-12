import { Criterion } from '../types';

export const evaluatePrompt = (instruction: string, input: string, output1: string, output2: string, criteria: Criterion[]) => {
    return {
        "system": "You are a helpful and precise assistant that can check the quality of responses by other AI assistants for a given user instruction. You can objectively evaluate the holistic quality of responses by assessing how well the responses satisfy a set of quality criteria. You should provide comprehensive feedback on the responses according to each of these criteria and provide detailed justification for your feedback. If you refer to specific fragments of the responses in your feedback, you should also return these fragments as evidence. You should return your final answer as a valid JSON object.",
        "user": `# Task Description

We would like to request your feedback on the performance of two AI assistants responding to a user's instruction. Each assistant performed the instruction on the same input. In the feedback, please rate the quality of the responses on the given set of criteria. The user's instruction, input, the two responses, and the criteria are provided below.

Please give feedback on the responses for each criteria. First, provide a comprehensive explanation comparing the two assistants in their ability to satisfy the criterion. You should justify your judgement by providing substantial detail about your reasoning. Ensure that you only write comments about one criterion at a time. Avoid giving feedback on other aspects of the responses that are not described in the criteria. Then, for each assistant, list a maximum of five words or short phrases from their response that illustrate what you described in your explanation. Avoid listing whole sentences or long phrases as evidence. If the whole response is needed as evidence, add the token "$WHOLE$" to the list. Finally, write your scores for each assistant on the criterion. The score should be on a scale of 1 to 10, where a higher score indicates that the assistant's response was better at satisfying the criterion. Avoid any potential bias and ensure that the order in which the responses were presented does not affect your judgement. Finally, ONLY return your feedback and scores as a valid JSON object by following the Output Format provided below.

## Criteria

${criteria.map(criterion => `- ${criterion.name}: ${criterion.description}`).join("\n")}

## Instruction

${instruction}

## Input

${input}

## Assistant 1's Response

${output1}

## Assistant 2's Response

${output2}

## Output Format

\`\`\`json
{
    <criterion name>: {
        "explanation": <comprehensive and detailed comparison of the assistants' ability to satisfy the criterion>,
        "assistant_1": {
            "evidence": [<maximum of 5 words or short phrases from the assistant's response that serve as evidence for your feedback>],
            "score": <score on the criterion>
        },
        "assistant_2": {
            "evidence": [<maximum of 5 words or short phrases from the assistant's response that serve as evidence for your feedback>],
            "score": <score on the criterion>
        }
    },
    ...
}
\`\`\``
    }
}

export const mergeCriteriaPrompt = (instruction: string, criteria: Criterion[]) => {
    return {
        "system": "You are a helpful and precise assistant that can review the quality of scoring criteria that are used to measure the quality of responses. You can identify whether criteria are redundant or if they have overlapping areas. You can also revise the criteria to improve their quality. You return your final answer as a valid JSON object.",
        "user": `# Task Description

We would like to request you to examine a set of criteria that AI assistants should satisfy when responding to the user instruction below. Human judges will refer to these criteria to rate the assistants' responses on how well they satisfy each criteria.

Please carefully review the list of criteria provided below. Identify criteria that are not mutually exclusive, meaning that the criteria have areas of overlap between them. Focus on identifying criteria that have portions that are redundant with portions of other criteria as they measure the same feature of assistants' responses. For the criteria pairs or groups that may overlap, provide a comprehensive explanation about what parts of the criteria are redundant. Then, combine only these overlapping portions into a new criteria. Ensure that these revised criteria have names that are concise and descriptions that are clear so that judges can precisely understand their meaning. You should only merge the redundant portions and avoid creating new criteria that are excessively broad. Finally, ONLY return the new criteria as a valid JSON object by following the Output Format provided below. Avoid including the criteria that were not overlapping in this object. You may be unable to identify any overlapping criteria. If so, simply return an empty list: {"results": []}.

## Instruction

${instruction}

## Criteria

${criteria.map(criterion => `- ${criterion.name}: ${criterion.description}`).join("\n")}

## Output Format

\`\`\`json
{
    "results": [
        {
            "name": <name of new criterion>, 
            "description": <description of new criterion>, 
            "original_criteria": [<list of the original names of criteria that were redundant>]
        }, 
        ...
    ]
}
\`\`\``
    }
}

export const splitCriteriaPrompt = (instruction: string, criteria: Criterion[]) => {
    return {
        "system": "You are a helpful and precise assistant that can review the quality of scoring criteria that are used to measure the quality of responses. You can identify whether criteria are excessively broad or consider multiple unrelated aspects. You can also revise the criteria to improve their quality. You return your final answer as a valid JSON object.",
        "user": `# Task Description

We would like to request you to examine a set of criteria that AI assistants should satisfy when responding to the user instruction below. Human judges will refer to these criteria to rate the assistants' responses on how well they satisfy each criteria.

Please carefully review the list of criteria provided below. Identify criteria that are excessively broad. You should identify criteria that consider multiple, distinct aspects in the assistants' responses. Focus on identifying criteria that measure dimensions that are independent and possibly unrelated. For the identified criteria, provide a comprehensive explanation about how these criteria may be excessively broad. Then, divide each identified criterion into a new set of criteria that are specific and mutually exclusive, meaning that they do not overlap. Ensure that these revised criteria have names that are concise and descriptions that are clear so that judges can precisely understand their meaning. Finally, ONLY return the new criteria as a valid JSON object by following the Output Format provided below. Avoid including the criteria that were not excessively broad in this object. You may be unable to identify any broad criteria. If so, simply return an empty list: {"results": []}.

## Instruction

${instruction}

## Criteria

${criteria.map(criterion => `- ${criterion.name}: ${criterion.description}`).join("\n")}

## Output Format

\`\`\`json
{
    "results": [
        {
            "name": <name of new criterion>, 
            "description": <description of new criterion>, 
            "original_criteria": <original name of criterion that was divided>
        }, 
        ...
    ]
}
\`\`\``
    }
}

export const refineCriteriaPrompt = (instruction: string, criteria: Criterion[]) => {
    return {
        "system": "You are a helpful and precise assistant that can review the quality of scoring criteria that are used to measure the quality of responses. You can identify whether criteria are vague or confusing. You can also revise the criteria to improve their quality. You return your final answer as a valid JSON object.",
        "user": `# Task Description

We would like to request you to examine a set of criteria that AI assistants should satisfy when responding to the user instruction below. Human judges will refer to these criteria to rate the assistants' responses on how well they satisfy each criteria.

Please carefully review the list of criteria provided below. Identify criteria that are vague, meaning that they describe general characteristics that are not specifically relevant to the user instruction. Also, identify criteria that have unclear or confusing descriptions. First, provide a comprehensive explanation about how certain criteria are vague, unclear, or both. Then, paraphrase the criteria names and descriptions so that they are more specific to the instruction and their descriptions are clearer. Ensure that these revised criteria have names that are concise and descriptions that are clear so that judges can precisely understand their meaning. You should only rephrase criteria or add more details. Avoid removing details from the criteria. Avoid replacing any criteria or creating new criteria. Finally, ONLY return the revised criteria as a valid JSON object by following the Output Format provided below. Avoid including the criteria that were not revised in this object. You may be unable to identify any unclear or imprecise criteria. If so, simply return an empty list: {"results": []}.

## Instruction

${instruction}

## Criteria

${criteria.map(criterion => `- ${criterion.name}: ${criterion.description}`).join("\n")}

## Output Format

\`\`\`json
{
    "results": [
        {
            "name": <name of criterion after revision>, 
            "description": <description of criterion after revision>, 
            "original_criteria": <original name of criterion that was revised>
        }, 
        ...
    ]
}
\`\`\``
    }
}

