import React, { createContext, Profiler, useContext, useState } from 'react';
import './App.css';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { info } from 'console';

/* MOBX */

let CONNECTED = false;

type Profile = {
    name: string;
    email: string;
    picture: string;
};

type Message = {
    message: string;
    timestamp: string;
    userID: string;
    profile: Profile;
};

class RootStore {
    _socket: WebSocket | undefined = undefined;
    _messages: Message[] = [];
    _uuid: string;
    _profile: Profile | undefined = undefined;
    _token: string | undefined = undefined;
    _READY = false;

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
            profile: this._profile,
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
        const socket = new WebSocket('wss://chat.davidvarela.us', ['access_token', token]);
        console.log('attempting websocket connection foo');

        // Connection opened
        socket.addEventListener('open', (_) => {
            console.log('websocket connection established');
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
            } else if (message.profile == null) {
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

    if (store.profile == null && store.socket != null && store.READY) {
        store.authenticate();
    }

    return (
        <div className="loginScreen">
            <Header />
            <div className="loginScreenButtonBox">
                <div id="buttonDiv"></div>
            </div>
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
        </div>
    );
});

const Header: React.FC = observer(() => {
    const store = useContext(RootStoreContext);

    return (
        <div className="header">
            <div className="headerChannel"># main</div>
            <div className="headerMenu">⏷</div>
        </div>
    );
});

const ChatUI: React.FC = observer(() => {
    return (
        <div className="chatUI">
            <Sidebar />
            <Header />
            <Chat />
            <SendDialog />
        </div>
    );
});

const Sidebar: React.FC = observer(() => {
    return (
        <div className="sidebar">
            <SidebarHeader />
            <div className="sidebarHeading">Channels</div>
            <ul className="channelList">
                <ChannelItem>main</ChannelItem>
                <ChannelItem>tech</ChannelItem>
                <ChannelItem>social events</ChannelItem>
                <ChannelItem>random</ChannelItem>
            </ul>
        </div>
    );
});

const SidebarHeader: React.FC = observer(() => {
    const store = useContext(RootStoreContext);

    return (
        <div className="sidebarHeader">
            <div className="sidebarHeaderBranding">Chatter</div>
            <div className="sidebarHeaderStatus">
                <div className={store.socket == null || store.READY == false ? 'redDot' : 'greenDot'} />
                <div className="headerProfile">{store.profile == null ? '' : `${store.profile.name}`}</div>
            </div>
        </div>
    );
});

const ChannelItem: React.FC = observer(({ children }) => {
    const className = children == 'main' ? 'channelItem selected' : 'channelItem';

    return (
        <button className={className}>
            <li>{`# ${children}`}</li>
        </button>
    );
});

const Chat: React.FC = observer(() => {
    const store = useContext(RootStoreContext);
    if (store.socket == null || store.READY == false) {
        return <p>no connection established! :(</p>;
    }

    if (store.profile == null) {
        store.authenticate();
        return <p>no profile</p>;
    }

    return (
        <div className="chat">
            <div className="messages">
                {store.messages.map((x, i) => (
                    <div key={i} className="messageCard">
                        <img src={x.profile.picture} className="messageCardUserImage"></img>
                        <div className="messageCardContent">
                            <div className="messageCardHeader">
                                <div className="user">{x.profile.name}</div>
                                <div className="timestamp">
                                    {new Date(parseInt(x.timestamp)).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                            <div className="messageBox">{x.message}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

const store = new RootStore();

export const handleCredentialResponse = (response: any) => {
    store.connect(response.credential);
};

// TODO check username and that websocket connection is open before displaying chat?
const App: React.FC = observer(() => {
    return (
        <RootStoreContext.Provider value={store}>
            {store.profile == null ? <LoginScreen /> : <ChatUI />}
        </RootStoreContext.Provider>
    );
});

export default App;
