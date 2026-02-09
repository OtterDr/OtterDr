import OpenAI from "openai";
// import "dotenv/config"; or secretssssss

// create typing for  error : string (Might not be but double check) apiKey: string

// use GPT-5 nano (to get full list of available models: const allModels = await vscode.lm.selectChatModels(MODEL_SELECTOR);)

/* LANGUAGE MODEL API STEPS
1. Build the language model prompt - provides instructions to llm on broad task, defines context in which user messages are interpreted
    * vscode.LanguageModelChatMessage.User - for providing instructions and the user's request
    * vscode.LanguageModelChatMessage.Assistant - for adding history of prev llm responses as context to prompt (maybe also examples??)
    * EXAMPLE:
    *  const SYSTEM_PROMPT = '<all the text describing role, rules, instructions with examples>'
       const ERROR_PROMPT = <specific error from webview including any additional surrounding code if necessary>
    const compiledPrompt = [ vscode.LanguageModelChatMessage.User('<SYSTEM_PROMPT>'), vscode.LanguageModelChatMessage.User('<ERROR_PROMPT>')];
2. Send the language model request
    * select llm we want to use with selectChatModels method (returns array of llms matching specified criteria) -> can specify vendor, id, family, or version
    * send request to llm using sendRequest method, passing in prompt, any additional options, and cancellation token
    * use LanguageModelError to distinguish to distinguish between types of errors
3. Interpret the response - streaming based, so add appropriate error handling
    * parseResponse function that accumulates all the response fragments into a whole string, looking out for a closing } to be sure the fragment is finished
*/

// who we want our ai to be and how we want it to return our data
// Role, Context/Examples, Rules, Task

// response variable is where our async function happens


export async function otterTranslation(error: string, apiKey: string): Promise<string>{
    const systemPrompt = `You are a OtterAI, friendly programming assistant who specializes compiler and runtime errors. 

    Your job is to create: 
    -Translate technical error messages into clear, plain English.
    -Use a kind and encouraging tone.
    -Include a light sea or ocean-themed pun (otter/ocean related) when appropriate.
    -Privide 2-3 actionable next steps the developer can try.
    -Do NOT be sarcastic or overlt verbose.
    -Do NOT invent solutions unrelated to the error. 
    `;
    try{
    const openai = new OpenAI({apiKey});
    const aiResponse = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
            {
                role: "system",
                content: systemPrompt.trim(),// trim just gets rid of white space sent to the model
            },
            {
                role: "user",
                content: `Explain this error in plain English and provide steps to fix it : ${error}`
            }
        ], 
        temperature: 0.2 //increased creativity because I want it to use puns 
        
    });
    
}catch(err){
    console.error("Error Occured with Translation:", err);
    
    return `Otter try again, that error was unresolved: ${err}`;
}   
}