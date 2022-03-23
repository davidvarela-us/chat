import React, { createContext, useContext } from 'react';
import './App.css';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

/* MOBX */
class RootStore {
    _socket: WebSocket | undefined = undefined;
    _messages: string[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    get messages() {
        return this._messages;
    }

    pushMessage(x: string) {
        console.log(`** new message: ${x}**`);
        this._messages.push(x);
        console.log(this.messages);
    }

    send(message: string) {
        if (this._socket == null) {
            console.log('cant send message with unconnected socket');
            return undefined;
        }

        this.pushMessage(message);
        this._socket.send(message);
    }

    connect() {
        console.log('websocket start');

        // Create WebSocket connection.
        const socket = new WebSocket('ws://localhost:4000');

        // Connection opened
        socket.addEventListener('open', function (_) {
            socket.send('Hello Server!');
        });

        // Listen for messages
        socket.addEventListener('message', (event) => {
            console.log(`Message from server *${event.data}*`);
            this.pushMessage(event.data);
        });

        this._socket = socket;

        console.log('websocket end');
    }
}

/* APP */

const RootStoreContext = createContext<RootStore>(new RootStore());

const SendDialog: React.FC = observer(() => {
    const store = useContext(RootStoreContext);

    return (
        <div>
            <h1>Send a message</h1>
            <button onClick={() => store.send('this is a message mothafucka')}>send</button>
        </div>
    );
});

const store = new RootStore();
store.connect();

const App: React.FC = observer(() => {
    return (
        <RootStoreContext.Provider value={store}>
            <SendDialog />
            <div>
                <h1> Messages </h1>
                {store.messages
                    .slice()
                    .reverse()
                    .map((x, i) => (
                        <p key={i}>{x}</p>
                    ))}
            </div>
        </RootStoreContext.Provider>
    );
});

export default App;
