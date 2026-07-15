import * as React from 'react';
import { messageHandler } from '@estruyf/vscode/dist/client';
import { OtterResponse } from '../aiTranslator';
import "./styles.css";
import * as OtterExpression from "/assets";

export interface IAppProps {}

export const App: React.FunctionComponent<IAppProps> = ({ }: React.PropsWithChildren<IAppProps>) => {
  //Information sent from the Ai model
  const [message, setMessage] = React.useState<OtterResponse[] | null>(null); //Probably we would need an interface for the data sent "whatHappened" string
  const [error, setError] = React.useState<string>(""); //Window Errors using diagnostics



React.useEffect(()=>{

  //Function to read the responses from the extension ts
  const response = (event:MessageEvent) =>{
    try{
      const responseData = event.data;
      if(!responseData) return;
     
      //From the AI model
      if(responseData.type === "renderAI"){
        console.log("Rendering the data", JSON.stringify(responseData.payload,null,2));

        //Update the state of message
        setMessage(responseData.payload);
      }

    }catch(error){
      console.error('Error handling the information', error)

    }
  }

  window.addEventListener('message',response);

  //Post Message we are sending the extension
  window.tsvscode.postMessage({type:'renderReady'});

  

return() =>{
  window.removeEventListener('message',response); //This removes the response event listener after being used Line 29
}

},[])
  // whatHappened: string;
  // nextSteps: string[];
  // otterThoughts: string;

function aiResponse() {
  
  return (
    <div className='app'>
      <h1>Hello from the React Webview Starter</h1>
      <div className='response-ai'>
        {message && message?.map((elem,index)=>(
          <div className='' key={index}>
            <div>{elem.whatHappened}</div>
            <div>{elem.nextSteps.map((steps, index)=> <div key={index}> {steps}</div>)}</div>
            <div>{elem.otterThoughts}</div>
          </div>
         
        ))}
      </div>
    </div>
  );
}


//Three emotions --> Default, Happy (Belly One), and the confused one
function OtterExpression() {
  
  //Two states of the otter
   //Belly rub --> Event listener on click 
   //Error in code --> Otter looks confused (The answer is fixed --> Back to normal/ default)
const [happy, setHappy] = React.useState(<img src={OtterExpression.happy_image}></img>);
const [confused, setConfused] = React.useState('/assets/default_image.png');

  return (
    <div className='otterDisplay'>
    <h1>Testing for Otter Expression</h1>

    <div className='otterDefault'>
      <img src="/assets/default_image.png" width="300" onClick={() => setHappy}></img>
    </div>
    
    <div className='otterConfused'>
      <img src="/assets/default_image.png" width="300" onClick={() => setConfused}></img>
    </div>

    </div>
  )
}


//////////////////// Older code, obsolete

//Communication happening
 //React send a post message to webview extension to get the ai response to render
   // React uses useEffect to wait for the answer


//   const sendMessage = () => {
//     messageHandler.send('POST_DATA', { msg: 'Hello from the webview' });
//   };

//   const requestData = () => {
//     messageHandler.request<string>('GET_DATA').then((msg) => {
//       setMessage(msg);
//     });
//   };

//   const requestWithErrorData = () => {
//     messageHandler.request<string>('GET_DATA_ERROR')
//     .then((msg) => {
//       setMessage(msg);
//     })
//     .catch((err) => {
//       setError(err);
//     });
//   };

//   return (
//     <div className='app'>
//       <h1>Hello from the React Webview Starter</h1>

//       <div className='app__actions'>
//         <button onClick={sendMessage}>
//           Send message to extension
//         </button>

//         <button onClick={requestData}>
//           Get data from extension
//         </button>

//         <button onClick={requestWithErrorData}>
//           Get data with error
//         </button>
//       </div>
      
//       <div>
//          <img src="/assets/default_image.png" width="300"></img>
//       </div>

//       {message && <p><strong>Message from the extension</strong>: {message}</p>}

//       {error && <p className='app__error'><strong>ERROR</strong>: {error}</p>}
//     </div>
//   );
// };

