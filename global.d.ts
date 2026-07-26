export {};



declare global {
  interface Window {
    tsvscode: {
      postMessage: (message: { type: string; payload?: any;}) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }

  const tsvscode: Window['tsvscode'];
} 
  