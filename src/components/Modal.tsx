import React, { useContext } from 'react';
import styled from 'styled-components';

import { GenerateContext } from '../api/GenerateContext';

const Background = styled.div`
    background: rgba(0, 0, 0, 0.5);
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    color: #333;
`;

const ModalContainer = styled.div`
    background: white;
    position: fixed;
    top: 50%;
    left: 50%;
    width: 50%;
    transform: translate(-50%, -50%);
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    z-index: 1001;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Title = styled.h1`
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 8px;
`;

const Subtitle = styled.h2`
    font-size: 18px;
    font-weight: 600;
    text-align: left;
    margin-top: 8px;
`;

const ButtonRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 16px;
    justify-content: center;
    align-items: center;
`;

const Button = styled.a`
    background-color: #363636;
    color: #fff;
    opacity: 0.9;
    padding: 8px 16px;
    border: none;
    border-radius: 20px;
    width: 120px;
    text-align: center;

    &:hover {
        opacity: 1;
    }
`;

const Description = styled.div`
    font-size: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    & code {
        color: #777;
        font-size: 14px;
    }
`;

const CloseButton = styled.div`
    color: #999;
    font-size: 24px;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
        color: #666;
    }
`;

const InputContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    width: 100%;
    align-items: center;

    & > div {
        width: 80px;
    }
`;

const Input = styled.input`
    font-size: 14px;
    padding: 8px 12px;
    background-color: #F5F7FA;
    color: #333;
    outline: none;
    border-radius: 4px;
    flex: 1;

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

interface Props {
    isModalOpen: boolean;
    setIsModalOpen: (isModalOpen: boolean) => void;
}

const Modal = ({ isModalOpen, setIsModalOpen } : Props) => {
    const { apiKeys, setApiKey } = useContext(GenerateContext);

    const closeModal = () => {
        if(apiKeys["openai"] === "") {
            return;
        }
        setIsModalOpen(false);
    }
    
    return (
        <Background style={{ display: isModalOpen ? "block" : "none" }} onClick={() => closeModal()}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", flexDirection: "row"}}>
                    <div style={{width: "18px"}}></div>
                    <Title>
                        <span style={{marginRight: "8px"}}>⚗️</span>
                        <span>E<span style={{fontSize: "16px"}}>VAL</span>LM</span>
                    </Title>
                    <div style={{width: "18px"}}>
                        {(apiKeys['openai'] !== "") &&
                            <CloseButton className="fa-solid fa-xmark" onClick={() => closeModal()}></CloseButton>
                        }
                    </div>
                </div>
                <ButtonRow>
                    <Button href="https://arxiv.org/abs/2309.13633" target="_blank">
                        Paper
                        <i className="fa-solid fa-file-lines" style={{marginLeft: "8px"}}></i>
                    </Button>
                    <Button href="https://github.com/kixlab/EvalLM" target="_blank">
                        Code
                        <i className="fa-brands fa-github" style={{marginLeft: "8px"}}></i>
                    </Button>
                    <Button href="https://evallm.kixlab.org" target="_blank">
                        Website
                        <i className="fa-solid fa-arrow-up-right-from-square" style={{marginLeft: "8px"}}></i>
                    </Button>
                    <Button href="https://www.youtube.com/watch?v=7hvTnhiCO7Y" target="_blank">
                        Video
                        <i className="fa-solid fa-video" style={{marginLeft: "8px"}}></i>
                    </Button>
                    <Button href="https://twitter.com/tae_skim" target="_blank">
                        Twitter
                        <i className="fa-brands fa-twitter" style={{marginLeft: "8px"}}></i>
                    </Button>
                </ButtonRow>
                <Subtitle>
                    What can I do with EvalLM?
                </Subtitle>
                <Description>
                    <div>
                        EvalLM is a tool that allows you to <b>evaluate</b> the quality of LLM prompts for your application on your own <b>defined, subjective criteria</b>. This work was accepted to <b>CHI 2024</b>.
                        To get started:
                    </div>
                    <ul className="list-decimal" style={{paddingLeft: "32px"}}>
                        <li>Enter API keys for LLMs you want to use to generate and evaluate.</li>
                        <li>Upload JSON file with input samples. Format: <code>{"[{input: string}, ... ]"}</code></li>
                        <li>Define two prompts (left in screen).</li>
                        <li>Define evaluation criteria (right in screen).</li>
                        <li>Run your prompts to generate outputs and then auto-evaluate to compare outputs on each criterion.</li>
                    </ul>
                </Description>
                <Subtitle>
                   Enter your API keys below:
                </Subtitle>
                <Description>
                    <span>We do <b>NOT</b> store or send your API keys in any way. Not as a cookie or localStorage. Not to a server.</span>
                </Description>
                <InputContainer>
                    <div>OpenAI</div>
                    <Input 
                        type="text" 
                        value={apiKeys['openai']}
                        placeholder={"Enter OpenAI API key..."}
                        onChange={(e) => setApiKey("openai", e.target.value)}
                    />
                </InputContainer>
                <InputContainer>
                    <div>Anthropic</div>
                    <Input 
                        type="text" 
                        value={apiKeys['anthropic']}
                        placeholder={"Enter Anthropic API key..."}
                        onChange={(e) => setApiKey("anthropic", e.target.value)} 
                    />
                </InputContainer>
                <InputContainer>
                    <div>Google</div>
                    <Input 
                        type="text" 
                        value={apiKeys['google']}
                        placeholder={"Enter Google API key..."}
                        onChange={(e) => setApiKey("google", e.target.value)} 
                    />
                </InputContainer>
                <Description style={{textAlign: "center", color: "#999", gap: "0px"}}>
                    <span>Currently, evaluation and generation is performed with <code>gpt-4-turbo-2024-04-09</code>.</span>
                    <span>You will be able to close this modal after entering the OpenAI API key.</span>
                    <span>Add Anthropic or Google API keys for alternative evaluators in the Deploy screen.</span>
                </Description>
            </ModalContainer>
        </Background>
    );
}

export default Modal;