import React from 'react';
import {createRoot} from 'react-dom/client';
import {AiResponses} from './AiResponses';

const elm = document.getElementById("root");
if (elm) {
  const root = createRoot(elm);
  root.render(<AiResponses />);
}