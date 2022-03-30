import React, { createContext, Profiler, useContext, useState } from 'react';
import './App.css';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { info } from 'console';

/* MOBX */

let CONNECTED = false;

type Message = {
    message: string;
    timestamp: string;
    userID: string;
    userName: string;
};

type Profile = {
    name: string;
    email: string;
    picture: string;
};
class RootStore {
    _socket: WebSocket | undefined = undefined;
    _messages: Message[] = [];
    _uuid: string;
    _userName: string | undefined = 'David'; //TODO
    _profile: Profile | undefined = undefined;
    _token: string | undefined = undefined;
    _READY: boolean = false;

    constructor() {
        makeAutoObservable(this);
        this._uuid = uuidv4();
    }

    get token() {
        return this._token;
    }
    set token(token: string | undefined) {
        this._token = token;
    }

    get READY() {
        return this._READY;
    }

    set READY(ready: boolean) {
        this._READY = ready;
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

    get profile() {
        return this._profile;
    }

    set profile(profile: Profile | undefined) {
        this._profile = profile;
    }

    set socket(socket: WebSocket | undefined) {
        this._socket = socket;
    }

    get socket() {
        return this._socket;
    }

    pushMessage(x: Message) {
        this._messages.push(x);
    }

    authenticate() {
        if (this._socket == null) {
            console.log('* cant send message with unconnected socket');
            return undefined;
        }
        const x = {
            token: this.token,
        };

        this._socket.send(JSON.stringify(x));
    }

    send(message: string) {
        if (this._socket == null) {
            console.log('* cant send message with unconnected socket');
            return undefined;
        }

        if (this._profile == null) {
            console.log('* refusing to connect without profile');
            return undefined;
        }

        const x: Message = {
            message: message,
            timestamp: String(Date.now()),
            userID: this._uuid,
            userName: this._profile.email,
        };

        this.pushMessage(x);
        this._socket.send(JSON.stringify(x));
    }

    disconnect() {
        this.socket = undefined;
    }

    connect(token: string) {
        this.token = token;

        if (CONNECTED) {
            return undefined;
        }

        console.log('websocket start');

        // Create WebSocket connection.
        const socket = new WebSocket('ws://ec2-54-176-38-82.us-west-1.compute.amazonaws.com:4000', ["access_token", token]);
        console.log("attempting websocket connection");

        // Connection opened
        socket.addEventListener('open', (_) => {
            console.log("websocket connection established");
            this.READY = true;
        });

        // Listen for messages
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);

            if (message.control == 'profile') {
                console.log('PROFILE');
                this.profile = {
                    name: message.name,
                    email: message.email,
                    picture: message.picture,
                };
                console.log('setting profile: ', this.profile);
                return undefined;
            }

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

        // Listen for possible errors
        socket.addEventListener('error', (event) => {
            console.log('WebSocket error: ', event);
            this.disconnect();
        });

        // deal with a closed connection
        socket.addEventListener('close', (event) => {
            console.log('WebSocket closed: ', event);
            this.disconnect();
        });

        this.socket = socket;
        CONNECTED = true;
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
            <div>
                <input
                    onChange={(e) => setUserName(e.target.value)}
                    value={userName}
                    onKeyPress={(e) => e.key === 'Enter' && submit()}
                    placeholder="Username"
                ></input>
                <button onClick={submit}>Enter</button>
            </div>
            Fook
            <div id="buttonDiv"></div>
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
    if (store.socket == null || store.READY == false) {
        return <p>no connection established</p>
    }

    if (store.profile == null) {
        store.authenticate();
        return <p>no profile</p>
    }

    return (
        <div className="chat">
            {store.profile == null ? 'no info' : `${store.profile.name}`}
            {store.socket == null ? 'disconnected' : 'connected'}
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

export const handleCredentialResponse = (response: any) => {
    store.connect(response.credential);
    /*
    const responsePayload = jwt.decode(response.credential);
    if (responsePayload == null) {
        console.log("null payload");
        return undefined;
    }
    if (typeof responsePayload === 'string' ) {
        console.log("string payload", responsePayload);
        return undefined;
    }
    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Given Name: ' + responsePayload.given_name);
    console.log('Family Name: ' + responsePayload.family_name);
    console.log("Image URL: " + responsePayload.picture);
    console.log("Email: " + responsePayload.email);
    */
};

// TODO check username and that websocket connection is open before displaying chat?
const App: React.FC = observer(() => {
    return (
        <RootStoreContext.Provider value={store}>
            {store.userName == null ? <LoginScreen /> : <Chat />}
        </RootStoreContext.Provider>
    );
});

export default App;
