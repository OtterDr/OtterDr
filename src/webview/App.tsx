import * as React from 'react';
///import { messageHandler } from '@estruyf/vscode/dist/client';
import { OtterResponse } from '../aiTranslator';
import './styles.css';


export interface IAppProps {}

export const App: React.FunctionComponent<IAppProps> = ({ }: React.PropsWithChildren<IAppProps>) => {
  const [errorCount, setErrorCount] = React.useState<number>(0); //Window Errors using diagnostics
  const [mood, setMood] = React.useState<'default' | 'happy' | 'confused'>('default'); //Otter expression state
  const [errorText, setErrorText] = React.useState<number>(0) // For updating error count text underneath the Otter

React.useEffect(()=>{
  //Function to read the responses from the extension.ts
  const response = (event:MessageEvent) =>{
    try{
      const responseData = event.data;
      if(!responseData) return;

      if(responseData.type === 'UPDATE_ERROR_COUNT'){
        console.log("Error count", responseData.payload);
        setErrorCount(responseData.payload);
      }
      
      if(responseData.type === 'GAME_STATE_UPDATE'){
        console.log("Error counter updating", responseData.payload);
        setErrorText(responseData.payload.diagnosedCount);
        
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

React.useEffect(()=>{
  setMood(errorCount > 0 ? 'confused' : "default");
},[errorCount])


const handleOtterClick = () => {
  setMood('happy');
  setTimeout(() => {
    setMood(errorCount > 0 ? 'confused' : 'default');
  }, 2000);
}

const assets = (window as any).otterAssets;
  const src = mood === 'happy' ? assets.happyImage
    : mood === 'confused' ? assets.confusedImage
    : assets.defaultImage;

  return (
    <div className='app'>
      <h1>Hello from the React Webview Starter</h1>
      <div className="app">
      <img id="otter" src={src} width={300} onClick={handleOtterClick} alt="Otter" />
    </div>
    <div>
      <p>{errorText} errors diagnosed</p>
    </div>
    </div>
  );
}
