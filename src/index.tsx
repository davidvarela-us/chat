import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App, { handleCredentialResponse } from './App';
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root'),
);

window.onload = function () {
    /* @ts-expect-error workaround to access google lib*/
    window['google'].accounts.id.initialize({
        client_id: '592851698614-1tl5j1l895ofj9ad9jofc2cm813bqamt.apps.googleusercontent.com',
        callback: handleCredentialResponse,
    });
    /* @ts-expect-error workaround to access google lib*/
    window['google'].accounts.id.renderButton(
        document.getElementById('buttonDiv'),
        { theme: 'filled_black', size: 'large' }, // customization attributes
    );
    /* @ts-expect-error workaround to access google lib*/
    window['google'].accounts.id.prompt(); // also display the One Tap dialog
};

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
