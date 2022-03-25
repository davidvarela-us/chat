import React, { createContext, useContext, useState } from 'react';
import './App.css';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';

/* MOBX */
type Message = {
    message: string;
    timestamp: string;
    userID: string;
    userName: string;
};
class RootStore {
    _socket: WebSocket | undefined = undefined;
    _messages: Message[] = [];
    _uuid: string;
    _userName: string | undefined;

    constructor() {
        makeAutoObservable(this);
        this._uuid = uuidv4();
    }

    get messages() {
        return this._messages;
    }

    get userName() {
        return this._userName;
    }

    // TODO why do I have to do this function signature?
    set userName(userName: string | undefined) {
        this._userName = userName;
    }

    get socket() {
        return this._socket;
    }

    pushMessage(x: Message) {
        this._messages.push(x);
    }

    send(message: string) {
        if (this._socket == null) {
            console.log('* cant send message with unconnected socket');
            return undefined;
        }

        if (this._userName == null) {
            console.log('* refusing to connect without username');
            return undefined;
        }

        const x: Message = {
            message: message,
            timestamp: String(Date.now()),
            userID: this._uuid,
            userName: this._userName,
        };

        this.pushMessage(x);
        this._socket.send(JSON.stringify(x));
    }

    connect() {
        if (this._userName == null) {
            console.log('refusing to connect without username');
            return undefined;
        }

        console.log('websocket start');

        // Create WebSocket connection.
        const socket = new WebSocket('ws://localhost:4000');

        // Connection opened
        socket.addEventListener('open', (_) => {
            if (this._userName == null) {
                console.log('* refusing to connect without username');
                return undefined;
            }

            const x: Message = {
                message: 'Hello server',
                timestamp: String(Date.now()),
                userID: this._uuid,
                userName: this._userName,
            };
            socket.send(JSON.stringify(x));
        });

        // Listen for messages
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);

            if (message.message == null) {
                console.log('invalid message');
                return undefined;
            } else if (message.timestamp == null) {
                console.log('invalid message');
                return undefined;
            } else if (message.userID == null) {
                console.log('invalid message');
                return undefined;
            } else if (message.userName == null) {
                console.log('invalid message');
                return undefined;
            }

            console.log(`Message from server *${message.message} | ${message.timestamp}*`);

            this.pushMessage(message);
        });

        this._socket = socket;

        console.log('websocket end');
    }
}

/* APP */

const RootStoreContext = createContext<RootStore>(new RootStore());

const LoginScreen: React.FC = observer(() => {
    const store = useContext(RootStoreContext);

    const [userName, setUserName] = useState('');
    const submit = () => {
        store.userName = userName;
        setUserName('');
    };

    return (
        <div>
            <input
                onChange={(e) => setUserName(e.target.value)}
                value={userName}
                onKeyPress={(e) => e.key === 'Enter' && submit()}
                placeholder="Username"
            ></input>
            <button onClick={submit}>Enter</button>
        </div>
    );
});

const SendDialog: React.FC = observer(() => {
    const store = useContext(RootStoreContext);
    const [message, setMessage] = useState('');

    const submit = () => {
        store.send(message);
        setMessage('');
    };

    return (
        <div className="sendDialog">
            <input
                className="sendDialogInput"
                onChange={(e) => setMessage(e.target.value)}
                value={message}
                onKeyPress={(e) => e.key === 'Enter' && submit()}
                placeholder="Message"
            ></input>
            <button onClick={submit}>Send</button>
        </div>
    );
});

const Chat: React.FC = observer(() => {
    const store = useContext(RootStoreContext);
    if (store.socket == null) {
        store.connect();
    }

    return (
        <div className="chat">
            <SendDialog />
            <div className="messages">
                {store.messages
                    .slice()
                    .reverse()
                    .map((x, i) => (
                        <div key={i} className="messageCard">
                            <div className="messageCardHeader">
                                <div className="user">{x.userName}</div>
                                <div className="timestamp">{new Date(parseInt(x.timestamp)).toLocaleTimeString()}</div>
                            </div>
                            <div className="messageBox">{x.message}</div>
                        </div>
                    ))}
            </div>
        </div>
    );
});

const store = new RootStore();

// TODO check username and that websocket connection is open before displaying chat?
const App: React.FC = observer(() => {
    return (
        <RootStoreContext.Provider value={store}>
            {store.userName == null ? <LoginScreen /> : <Chat />}
        </RootStoreContext.Provider>
    );
});

export default App;
