import OpenAI from "openai";
import { ErrorFormat } from "./errorListening";
// import "dotenv/config"; or secretssssss

// create typing for  error : string (Might not be but double check) apiKey: string

// use GPT-5 nano (to get full list of available models: const allModels = await vscode.lm.selectChatModels(MODEL_SELECTOR);)

/* LANGUAGE MODEL API STEPS
1. Build the language model prompt - provides instructions to llm on broad task, defines context where user messages are interpreted
    * vscode.LanguageModelChatMessage.User - for providing instructions and the user's request
    * vscode.LanguageModelChatMessage.Assistant - for adding history of prev llm responses as context to prompt (maybe also examples??)
    * EXAMPLE:
    *  const SYSTEM_PROMPT = '<all the text describing role, rules, instructions with examples>'
       const ERROR_PROMPT = <specific error from webview including any additional surrounding code if necessary>
    const compiledPrompt = [ vscode.LanguageModelChatMessage.User('<SYSTEM_PROMPT>'), vscode.LanguageModelChatMessage.User('<ERROR_PROMPT>')];
2. Send the language model request
    * select llm we want to use with selectChatModels method (returns array of llms matching specified criteria) -> can specify vendor, id, family, or version
    * send request to llm using sendRequest method, passing in prompt, any additional options, and cancellation token
    * use LanguageModelError to distinguish between types of errors
3. Interpret the response - streaming based, so add appropriate error handling
    * parseResponse function that accumulates all the response fragments into a whole string, looking out for a closing } to be sure the fragment is finished
*/

// who we want our ai to be and how we want it to return our data
// Role, Context/Examples, Rules, Task

// response variable is where our async function happens

/*
TESTING:
* MOCK: What we receive from webview:
    * editor object props (language, range (s line, s char, end line, end char), text)
* MOCK: Diagnostic array with errors that match mock object sent from webview
* Function to match range in editor object to one of the objects in the diagnostics array
* Create an "error" variable that includes editor object and matching diagnostic (nested object)
    * this variable is passed in as the "error" argument in AI call

const error = {
 editor: {
 
 }, 
 diagnostic: {
 
 }
}
*/

export async function otterTranslation(
  error: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error("apiKey is required.");
  }

  const systemPrompt = `You are an Otter AI, friendly programming assistant who specializes in compiler and runtime errors. The errors format is: 
  - message: The diagnostic error message ;
  - code:  The diagnostic code ;
  - source: The diagnostic source ;
  - fileSource: The file path of the error;
  - selectedText: The users selected text that contains the error;
  - errorContext:  Additional lines of code 3 before and 3 after the selected diagnostic error;
}

    Your job is to : 
    -Translate technical error messages into clear, plain English.
    -Only use the error context to better understand the provided diagnostic error.
    -Use a kind and encouraging tone.
    -Include a light sea or ocean-themed pun (otter/ocean related) when appropriate.
    -Provide 2-3 actionable next steps the developer can try.
    -NOT be sarcastic or overly verbose.
    -NOT invent solutions unrelated to the error. 
    
  FORMATTING INSTRUCTIONS:
  - Use the template below as a visual guide for the final output.
  - Where you see Markdown syntax (like #, **, or -) in the template, apply that styling to the text (e.g., make it bold or a list).
  - Do NOT return the literal Markdown characters (the symbols); return the rendered, styled text that follows this structure.

  Format your response exactly like this:
  
    **OtterDr says 🦦:**
    
    *What happened:*

    - <plain English explanation>

    **Next Steps 👣:**

    1.<step 1 on its own line>

    2.<step 2 on its own line>

    3.<optional step 3 on its own line>

    **Otter thoughts 💭:**
    
    *- <short ocean or otter pun>*

    `;
  try {
    const openai = new OpenAI({ apiKey });
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-5-nano",
      //using messages tells the model how to behave and what to respond to
      messages: [
        {
          //system role = model's rules and personality
          role: "system",
          content: systemPrompt.trim(), // trim just gets rid of white space sent to the model
        },
        {
          //user role = input from vscode error
          role: "user",
          content:
            `Translate this compiler/runtime  error in plain English and provide steps to fix it : 
                ERROR:
                ${error}`.trim(), // cleans up white space
        },
      ],
      temperature: 1, //increased creativity because I want it to use puns  and be friendly
    });
    //save the response in a variable
    const aiMessage = aiResponse.choices[0].message.content;

    // handle  the response if you receive a valid one or an invalid one
    if (!aiMessage) {
      // checks if the message is invalid
      return "🦦 Otter try again, this one is out of my depth. 🌊"; //Throw message to show valid aiMessage wasn't recieved
    }
    return aiMessage.trim();

    // Original attempt with ternary:
    // aiResponse.choices[0].message.content ? aiResponse.choices[0].message.content : "🦦 Otter try again, this one is out of my depth.🌊"
  } catch (err) {
    console.error("Error Occurred with Translation:", err);

    return `🦦 Otter can't sea a translation to that error. Please check your API key or network connection and dive back in.`;
  }
}
