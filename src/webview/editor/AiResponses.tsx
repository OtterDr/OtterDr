import * as React from 'react';
import './styles.css';
import { OtterResponse } from '../../aiTranslator';

export const AiResponses: React.FunctionComponent = () => {
  const [responses, setResponses] = React.useState<OtterResponse[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const responseData = event.data;
        if (!responseData) return;

        if(responseData.type==='LOADING_CONTENT'){
            setLoading(true);
        }

        if (responseData.type === 'AI_RESPONSE_UPDATE') {
          setLoading(false);
          setResponses(responseData.payload);
        }
      } catch (error) {
        console.error('Error handling the response information', error);
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify the extension that the webview is ready to receive messages
    window.tsvscode.postMessage({ type: 'AI_RENDER_READY' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if(loading){
    return (
        <div className='loading-message'>Hold your breath, OtterDr is taking a deep dive...🤿</div>
    )
  }

  return (
    <div>
      <div className='error-container'></div>
      {responses.map((response, index) => (
        <div key={index} className='error-card'>
          {responses.length > 1
            ? <h2>Error {index + 1} of {responses.length} 🦦</h2>
            : <h2>OtterDr says 🦦</h2>}
          <h3>What happened:</h3>
          <p>{response.whatHappened}</p>
          <h3>Next Steps 👣:</h3>
          <ol>
            {response.nextSteps
              .map((step,index) => <li key={index}> {step}</li>)
            }
          </ol>
          <h3>Otter thoughts 💭:</h3>
          <p>{response.otterThoughts}</p>
        </div>
      ))} 
    </div>
  );
};