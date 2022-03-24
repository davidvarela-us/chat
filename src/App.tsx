import React, { createContext, useContext } from 'react';
import './App.css';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';

/* MOBX */
type Message = {
    message: string;
    timestamp: string;
    userID: string;
};
class RootStore {
    _socket: WebSocket | undefined = undefined;
    _messages: Message[] = [];
    _uuid: string;

    constructor() {
        makeAutoObservable(this);
        this._uuid = uuidv4();
    }

    get messages() {
        return this._messages;
    }

    pushMessage(x: Message) {
        this._messages.push(x);
    }

    send(message: string) {
        if (this._socket == null) {
            console.log('cant send message with unconnected socket');
            return undefined;
        }

        const x: Message = {
            message: message,
            timestamp: String(Date.now()),
            userID: this._uuid,
        };

        this.pushMessage(x);
        this._socket.send(JSON.stringify(x));
    }

    connect() {
        console.log('websocket start');

        // Create WebSocket connection.
        const socket = new WebSocket('ws://localhost:4000');

        // Connection opened
        socket.addEventListener('open', (_) => {
            const x: Message = {
                message: 'Hello Server!',
                timestamp: String(Date.now()),
                userID: this._uuid,
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
                <p>{store._uuid}</p>
                {store.messages
                    .slice()
                    .reverse()
                    .map((x, i) => (
                        <div key={i} style={{ border: 'solid 1px gray', marginBottom: '1rem' }}>
                            <h2>{x.message}</h2>
                            <p>{`${x.userID} | ${x.timestamp}`}</p>
                        </div>
                    ))}
            </div>
        </RootStoreContext.Provider>
    );
});

export default App;
