import OpenAI from "openai";
// import "dotenv/config"; or secretssssss

// create typing for  error : string (Might not be but double check) apiKey: string


// who we want our ai to be and how we want it to return our data
// Role, Context/Examples, Rules, Task
const systemPrompt = 'You are a friendly programming assistant who knows everything about compiler and runtime errors. Your job is to create a plain-English translation of the compiler and runtime errors, with actionable next steps to fix the error in a kind and professional tone.'

// response variable is where our async function happens