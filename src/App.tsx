import React, { createContext, useContext, useState } from 'react';
import './App.css';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
/* import jwt from 'jsonwebtoken'; */

/* MOBX */

let CONNECTED = false;
const CHANNELS = ['main', 'tech', 'social', 'support', 'random'];

type Profile = {
    name: string;
    email: string;
    picture: string;
};

type Message = {
    messageID: string;
    message: string;
    timestamp: string;
    userID: string;
    profile: Profile;
    channel: string;
};

class RootStore {
    _socket: WebSocket | undefined = undefined;
    _messages: Message[] = [];
    _uuid: string;
    _profile: Profile | undefined = undefined;
    _token: string | undefined = undefined;
    _READY = false;
    _channel = 'main';

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

    get channel() {
        return this._channel;
    }

    set channel(channel: string) {
        this._channel = channel;
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
            messageID: uuidv4(),
            message: message,
            timestamp: String(Date.now()),
            userID: this._uuid,
            profile: this._profile,
            channel: this._channel,
        };

        console.log('sending: ', x);
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

            if (message.messageID == null) {
                console.log('invalid message');
                return undefined;
            } else if (message.message == null) {
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
            } else if (message.channel == null) {
                console.log('invalid message');
                return undefined;
            }

            console.log(`Message from server *${message.messageID} | ${message.message}*`);

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
            <div className="loginScreenWelcome">
                <div className="loginScreenWelcomeText">
                    <div>
                        Welcome to <span className="loginScreenBranding">Chatter</span>
                    </div>
                    <div className="loginScreenTagline">real-time messaging</div>
                </div>
            </div>
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
            <div className="headerChannel">{`# ${store.channel}`}</div>
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
            <div className="channelList">
                {CHANNELS.map((channel, i) => (
                    <ChannelItem key={i} channel={channel} />
                ))}
            </div>
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

type ChannelItemProps = {
    channel: string;
};

const ChannelItem: React.FC<ChannelItemProps> = observer(({ channel }) => {
    const store = useContext(RootStoreContext);

    const className = channel == store.channel ? 'channelItem selected' : 'channelItem';

    return (
        <button className={className} onClick={() => (store.channel = channel)}>
            {`# ${channel}`}
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
                {store.messages
                    .filter((message) => {
                        return message.channel == store.channel;
                    })
                    .map((x) => (
                        <div key={x.messageID} className="messageCard">
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
    console.log('about to connect');
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
