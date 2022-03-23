import React from 'react';
import logo from './logo.svg';
import './App.css';

console.log('websocket start');
// Create WebSocket connection.
const socket = new WebSocket('ws://localhost:4000');

// Connection opened
socket.addEventListener('open', function (event) {
    socket.send('Hello Server!');
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log(`Message from server *${event.data}*`);
});
console.log('websocket end');

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                    Edit <code>src/App.tsx</code> and save to reload motherfucker.
                </p>
                <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
                    Learn React
                </a>
            </header>
        </div>
    );
}

export default App;
