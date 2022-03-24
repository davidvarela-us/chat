import React, { createContext, useContext } from 'react';
import './App.css';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

/* MOBX */
type Message = {
    message: string;
    timestamp: string;
};
class RootStore {
    _socket: WebSocket | undefined = undefined;
    _messages: Message[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    get messages() {
        return this._messages;
    }

    pushMessage(x: Message) {
        console.log(`** new message: ${x.message}**`);
        this._messages.push(x);
        console.log(this.messages);
    }

    send(message: string) {
        if (this._socket == null) {
            console.log('cant send message with unconnected socket');
            return undefined;
        }

        const x: Message = {
            message: message,
            timestamp: String(Date.now()),
        };

        this.pushMessage(x);
        this._socket.send(JSON.stringify(x));
    }

    connect() {
        console.log('websocket start');

        // Create WebSocket connection.
        const socket = new WebSocket('ws://localhost:4000');

        // Connection opened
        socket.addEventListener('open', function (_) {
            const x: Message = {
                message: 'Hello Server!',
                timestamp: String(Date.now()),
            };
            socket.send(JSON.stringify(x));
        });

        // Listen for messages
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);

            console.log(`Message from server *${message.message} | ${message.timestamp}*`);

            this.pushMessage(message);
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
                        <div key={i} style={{ border: 'solid 1px gray', marginBottom: '1rem' }}>
                            <p>{x.message}</p>
                            <p>{x.timestamp}</p>
                        </div>
                    ))}
            </div>
        </RootStoreContext.Provider>
    );
});

export default App;
