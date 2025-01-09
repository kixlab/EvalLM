import React, { useState, createContext } from 'react';
import { postRequest } from "./api";

import { Criterion, EvalResponse } from "../types";

import { evaluatePrompt, mergeCriteriaPrompt, splitCriteriaPrompt, refineCriteriaPrompt } from "./prompts";
import { isEqualCriteria, computeAgreement } from "./utils";

// Generate with OpenAI API
const generateOpenAI = (model: string, systemPrompt: string, userPrompt: string, max_tokens: number, temperature: number, n: number, callback: (json: any) => void, apiKey: string) => {
    postRequest(`https://api.openai.com/v1/chat/completions`, {"Authorization": `Bearer ${apiKey}`}, {
        model: model,
        messages: [
            { "role": "system", "content": systemPrompt },
            { "role": "user", "content": userPrompt }
        ],
        max_tokens: max_tokens,
        temperature: temperature,
        n: n
    }, (json: any) => {
        if(json.error) {
            callback({ error: json.error });
        } else {
            callback({ response: n === 1 ? json.choices[0].message.content : json.choices.map((choice: any) => choice.message.content) });
        }
    });
}

// Generate with Google API
const generateGoogle = (model: string, systemPrompt: string, userPrompt: string, maxOutputTokens: number, temperature: number, n: number, callback: (json: any) => void, apiKey: string) => {
    postRequest(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {}, {
        contents: [ { role: "user", parts: [ { text: userPrompt } ] } ],
        systemInstruction: systemPrompt,
        generationConfig: {
            maxOutputTokens: maxOutputTokens,
            temperature: temperature,
            candidateCount: n
        }
    }, (json: any) => {
        if(json.error) {
            callback({ error: json.error });
        } else {
            callback({ response: 
                n === 1 ?
                json.candidates[0].content.map((part: any) => part.text).join(" ") :
                json.candidates.map((candidate: any) => candidate.content.map((part: any) => part.text).join(" "))
            });
        }
    });
}

// Generate with Anthropic API
const generateAnthropic = (model: string, systemPrompt: string, userPrompt: string, max_tokens: number, temperature: number, n: number, callback: (json: any) => void, apiKey: string) => {
    postRequest(`https://api.anthropic.com/v1/messages`, {"x-api-key": apiKey}, {
        model: model,
        system: systemPrompt,
        messages: [
            { "role": "user", "content": userPrompt }
        ],
        max_tokens: max_tokens,
        temperature: temperature,
        n: n
    }, (json: any) => {
        if(json.error) {
            callback({ error: json.error });
        } else {
            callback({ response: n === 1 ? json.content[0].text : json.content.map((content: any) => content.text) });
        }
    });
}

const GenerateContext = createContext<{
    modelDictionary: { [key: string]: string[] },
    apiKeys: { [key: string]: string },
    setApiKey: (api: string, key: string) => void,
    generateResponses: (requests: any[], callback: (json: any) => void) => void,
    evaluateResponses: (instructions: string, input: string, outputs: string[], criteria: Criterion[], model: string, temperature: number, n: number, callback: (data: any) => void) => void,
    reviewCriteria: (type: string, instructions: string, criteria: Criterion[], callback: (json: any) => void) => void
}>({
    modelDictionary: {},
    apiKeys: {
        openai: "",
        google: "",
        anthropic: ""
    },
    setApiKey: () => {},
    generateResponses: () => {},
    evaluateResponses: () => {},
    reviewCriteria: () => {}
});

const GenerateContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [modelDictionary, ] = useState<{ [key: string]: string[] }>({
        "openai": [
            "gpt-4o",
            "gpt-4o-2024-11-20",
            "gpt-4o-2024-08-06",
            "gpt-4o-2024-05-13",
            "gpt-4o-mini",
            "gpt-4o-mini-2024-07-18",
            "gpt-4-turbo",
            "gpt-4-turbo-2024-04-09",
            "gpt-4-turbo-preview",
            "gpt-4-0125-preview",
            "gpt-4-1106-preview",
            "gpt-4",
            "gpt-4-0613",
            "gpt-4-32k-0314",
            "gpt-3.5-turbo-0125",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-1106"
        ],
        "anthropic": [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-sonnet-20240620",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ],
        "google": [
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-1.0-pro"
        ]
    });

    const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({
        openai: "",
        google: "",
        anthropic: ""
    });

    const generateRequest = (model: string, systemPrompt: string, userPrompt: string, max_tokens: number, temperature: number, callback: (json: any) => void, n: number = 1) => {
        if(n === 0) {
            callback({ response: []});
            return;
        }
        if(modelDictionary["openai"].includes(model)) {
            generateOpenAI(model, systemPrompt, userPrompt, max_tokens, temperature, n, callback, apiKeys.openai);
        } else if(modelDictionary["google"].includes(model)) {
            generateGoogle(model, systemPrompt, userPrompt, max_tokens, temperature, n, callback, apiKeys.google);
        } else if(modelDictionary["anthropic"].includes(model)) {
            generateAnthropic(model, systemPrompt, userPrompt, max_tokens, temperature, n, callback, apiKeys.anthropic);
        } else {
            callback({ error: "Invalid model" });
        }
    }

    const generateResponses = (requests: any[], callback: (json: any) => void) => {
        const responses: any[] = [];
        generateRequest(requests[0].model, requests[0].systemPrompt, requests[0].userPrompt, requests[0].max_tokens, requests[0].temperature, (json: any) => {
            if(json.error) {
                callback({ error: json.error });
                return;
            }
            responses.push({
                dataId: requests[0].dataId,
                inputId: requests[0].inputId,
                output: json.response
            });
            generateRequest(requests[1].model, requests[1].systemPrompt, requests[1].userPrompt, requests[1].max_tokens, requests[1].temperature, (json: any) => {
                if(json.error) {
                    callback({ error: json.error });
                    return;
                }
                responses.push({
                    dataId: requests[1].dataId,
                    inputId: requests[1].inputId,
                    output: json.response
                });
                callback({ responses: responses });
            });
        });
    }

    const evaluateResponses = (instructions: string, input: string, outputs: string[], criteria: Criterion[], model: string, temperature: number, n: number, callback: (data: any) => void) => {
        const prompt = evaluatePrompt(instructions, input, outputs[0], outputs[1], criteria);
        const switchedPrompt = evaluatePrompt(instructions, input, outputs[1], outputs[0], criteria);
        const isSwitch = Math.random() > 0.5;

        const firstSetN = Math.floor(n/2);
        const secondSetN = n - firstSetN;
        generateRequest(model, !isSwitch ? prompt.system : switchedPrompt.system, !isSwitch ? prompt.user : switchedPrompt.user, 2048, temperature, (data: any) => {
            if(data.error) {
                callback({ error: data.error });
                return;
            }
            var initialResponses: string[] = firstSetN === 1 ? [data.response] : data.response;
            if (isSwitch) {
                initialResponses = initialResponses.map((response: string) => {
                    return response.replaceAll("assistant 1", "assistant x")
                        .replaceAll("Assistant 1", "Assistant X")
                        .replaceAll("assistant 2", "assistant 1")
                        .replaceAll("Assistant 2", "Assistant 1")
                        .replaceAll("assistant x", "assistant 2")
                        .replaceAll("Assistant X", "Assistant 2")
                        .replaceAll("assistant_1", "assistant_x")
                        .replaceAll("Assistant_1", "Assistant_X")
                        .replaceAll("assistant_2", "assistant_1")
                        .replaceAll("Assistant_2", "Assistant_1")
                        .replaceAll("assistant_x", "assistant_2")
                        .replaceAll("Assistant_X", "Assistant_2");
                });
            }
            generateRequest(model, !isSwitch ? switchedPrompt.system : prompt.system, !isSwitch ? switchedPrompt.user : prompt.user, 2048, temperature, (data: any) => {
                try {
                    data.response = secondSetN === 1 ? [data.response] : data.response;
                    data.response = [...initialResponses, ...data.response];
                    var jsonOutputs: any[] = [];
                    jsonOutputs = data.response.map((output: any) => JSON.parse(output.split("```json\n").pop().split("\n```").shift()));
                    console.log(jsonOutputs);
                    const processedResults: EvalResponse[] = [];
                    Object.keys(jsonOutputs[0]).forEach((criteriaKey: string) => {
                        const criteriaName = criteriaKey.toLowerCase().replace(' ', '_');
                        const criteriaEvals = [];
                        for (const output of jsonOutputs) {
                            const outputValues = Object.values(output);
                            const outputIdx = Object.keys(output).findIndex((name) => isEqualCriteria(name, criteriaName));
                            if (outputIdx === -1) continue;
                            criteriaEvals.push(outputValues[outputIdx]);
                        }
                        const { evaluations, agreement } = computeAgreement(criteriaEvals);
                        
                        const evalData: EvalResponse = {
                            'criterion': criteria.find((c) => isEqualCriteria(c.name, criteriaName)) as Criterion,
                            'winners': evaluations.map((e: any) => e['winner']),
                            'scores': evaluations.map((e: any) => [e['assistant_1']['score'], e['assistant_2']['score']]),
                            'explanations': evaluations.map((e: any) => e['explanation']),
                            'evidence': evaluations.map((e: any) => [e['assistant_1']['evidence'], e['assistant_2']['evidence']]),
                            'agreement': agreement,
                            'similarCriteria': []
                        }

                        processedResults.push(evalData);
                    });

                    console.log(processedResults);
                    callback({ data: processedResults });
                } catch (error) {
                    callback({ error: error });
                }
            }, secondSetN);
        }, firstSetN);
    }

    const reviewCriteria = (type: string, instructions: string, criteria: Criterion[], callback: (json: any) => void) => {
        const model = "gpt-4-turbo-2024-04-09";
        const temperature = 0.7;

        var prompt: { system: string, user: string } = { system: "", user: "" }; 
        switch (type) {
            case "merge":
                prompt = mergeCriteriaPrompt(instructions, criteria);
                break;
            case "split":
                prompt = splitCriteriaPrompt(instructions, criteria);
                break;
            case "refine":
                prompt = refineCriteriaPrompt(instructions, criteria);
                break;
            default:
                callback({ error: "Invalid type" });
                return;
        }

        generateRequest(model, prompt.system, prompt.user, 2048, temperature, (json: any) => {
            if(json.error) {
                callback({ error: json.error });
            } else {
                const jsonStr = json.response.split("```json\n").pop().split("\n```").shift();
                callback({data: JSON.parse(jsonStr)['results']});
            }
        });
    }

    const setApiKey = (api: string, key: string) => {
        setApiKeys({ ...apiKeys, [api]: key });
    }

    return (
        <GenerateContext.Provider value={{ 
            modelDictionary: modelDictionary,
            apiKeys: apiKeys,
            setApiKey: setApiKey,
            generateResponses: generateResponses,
            evaluateResponses: evaluateResponses,
            reviewCriteria: reviewCriteria
        }}>
            {children}
        </GenerateContext.Provider>
    );
}

export { GenerateContext, GenerateContextProvider };