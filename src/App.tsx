import React, { createContext, useContext, useState } from 'react';
import './App.css';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
import { MdLocalFireDepartment, MdMessage, MdLock, MdGrid3X3 } from 'react-icons/md';
import { VscAccount, VscMenu, VscTriangleDown } from 'react-icons/vsc';
/* import jwt from 'jsonwebtoken'; */

/* MOBX */

const SERVER_URL = 'wss://chat.davidvarela.us';
const CHANNELS = new Map();
CHANNELS.set('main', { name: 'main', description: 'Welcome! This is the default channel.' });
CHANNELS.set('tech', { name: 'tech', description: 'All things tech.' });
CHANNELS.set('social', { name: 'social', description: 'Social media and events.' });
CHANNELS.set('support', { name: 'support', description: 'Ask away. We are here to help :)' });
CHANNELS.set('random', { name: 'random', description: 'Anything goes.' });

type Profile = {
    name: string;
    email: string;
    picture: string;
};

function isProfile(x: any): x is Profile {
    return x.name != null && x.email != null && x.picture != null;
}

type Message = {
    messageID: string;
    message: string;
    timestamp: string;
    userID: string;
    profile: Profile;
    channel: string;
};

function isMessage(x: any): x is Message {
    return (
        x.messageID != null &&
        x.message != null &&
        x.timestamp != null &&
        x.userID != null &&
        isProfile(x.profile) &&
        x.channel != null
    );
}

interface WebSocketMessage<T> {
    type: string;
    id: string;
    payload: T;
}

function isWebSocketMessage(x: any): x is WebSocketMessage<any> {
    return x.type != null && x.id != null && x.payload != null;
}

interface messageConf<T> {
    type: string;
    checker: (x: T) => boolean;
    handler: (x: T) => undefined;
}

class WebSocketStore {
    _url: string;
    _socket: WebSocket | undefined = undefined;
    _token: string | undefined = undefined;
    _OPEN = false;
    _CONNECTED = false;

    constructor(url: string) {
        makeAutoObservable(this);
        this._url = url;
    }

    get token() {
        return this._token;
    }
    set token(token: string | undefined) {
        this._token = token;
    }

    set socket(socket: WebSocket | undefined) {
        this._socket = socket;
    }

    get socket() {
        return this._socket;
    }

    get OPEN() {
        return this._OPEN;
    }

    set OPEN(open: boolean) {
        this._OPEN = open;
    }

    get isReady() {
        return this._socket != null && this.OPEN;
    }

    authenticate() {
        this.send('auth', { token: this.token });
    }

    disconnect() {
        this.socket = undefined;
    }

    send(dataType: string, payload: any) {
        if (!this.isReady) {
            console.log('[ws] cant send message with unconnected socket');
            return undefined;
        }

        const message = {
            id: uuidv4(),
            type: dataType,
            payload: payload,
        };

        //TODO should not need this extra guard
        if (this._socket != null) {
            console.log(`[ws] sent message: ${message.type} ${message.id}`);
            this._socket.send(JSON.stringify(message));
        }
    }

    connect<A, B>(token: string, configuration: (messageConf<A> | messageConf<B>)[]) {
        if (this._CONNECTED) {
            console.log('[ws] already connected');
            return undefined;
        }

        this._token = token;

        // Create WebSocket connection.
        this._socket = new WebSocket(this._url, ['access_token', this._token]);
        console.log('[ws] attempting websocket connection:', this._url);

        // Listen for messages
        this._socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (!isWebSocketMessage(message)) {
                console.log('malformed message: ', message);
                return undefined;
            }

            console.log(`[ws] received message: ${message.type} ${message.id}`);
            configuration.forEach((conf) => {
                if (conf.type == message.type) {
                    if (!conf.checker(message.payload)) {
                        console.log(`[ws] invalid ${conf.type}: `, message.payload);
                        return undefined;
                    }
                    conf.handler(message.payload);
                    return undefined;
                }
            });

            return undefined;
        });

        // Connection opened
        this._socket.addEventListener('open', (_) => {
            this.OPEN = true;

            console.log('[ws] websocket connection established');
            return undefined;
        });

        // Listen for possible errors
        this._socket.addEventListener('error', (event) => {
            console.log('[ws] connection error: ', event);
            this.disconnect();

            return undefined;
        });

        // deal with a closed connection
        this._socket.addEventListener('close', (event) => {
            console.log('[ws] connection closed: ', event);
            this.disconnect();

            return undefined;
        });

        this._CONNECTED = true;
        return undefined;
    }
}

class RootStore {
    _messages: Message[] = [];
    _uuid: string;
    _profile: Profile | undefined = undefined;
    _channel = 'main';
    ws: WebSocketStore;

    constructor(url: string) {
        makeAutoObservable(this);
        this.ws = new WebSocketStore(url);
        this._uuid = uuidv4();
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

    get channel() {
        return this._channel;
    }

    set channel(channel: string) {
        this._channel = channel;
    }

    pushMessage(x: Message) {
        this._messages.push(x);
        return undefined;
    }

    send(message: string) {
        if (this._profile == null) {
            console.log('refusing to send without profile');
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

        this.pushMessage(x);
        this.ws.send('message', x);

        return undefined;
    }

    connect(token: string) {
        const conf1: messageConf<Profile> = {
            type: 'profile',
            checker: isProfile,
            handler: (profile: Profile) => {
                console.log('setting profile: ', profile);
                this.profile = profile;
                return undefined;
            },
        };

        const conf2: messageConf<Message> = {
            type: 'message',
            checker: isMessage,
            handler: (message: Message) => {
                this.pushMessage(message);
                return undefined;
            },
        };

        const conf = [conf1, conf2];

        this.ws.connect<Profile, Message>(token, conf);
    }
}

/* APP */

const RootStoreContext = createContext<RootStore>(new RootStore(SERVER_URL));

const LoginScreen: React.FC = observer(() => {
    const store = useContext(RootStoreContext);

    if (store.profile == null && store.ws.isReady) {
        store.ws.authenticate();
    }

    return (
        <div className="loginScreen">
            <div className="loginHeader">
                <div className="loginHeaderContent">
                    <div className="loginHeaderBranding">Chatter</div>
                    <div className="loginHeaderMenu">
                        <a href="/" className="loginHeaderButton">
                            <div>Features</div>
                        </a>
                        <a href="/" className="loginHeaderButton">
                            <div>About</div>
                        </a>
                        <a href="/" className="loginHeaderButton">
                            <div>Contact</div>
                        </a>
                    </div>
                </div>
            </div>
            <div className="loginScreenWelcome">
                <div className="loginScreenWelcomeText">
                    <div>
                        Welcome to <span className="loginScreenBranding">Chatter</span>
                    </div>
                    <div className="loginScreenTagline">the future of communication</div>
                </div>
            </div>
            <div>
                <div className="features">
                    <div className="featureDisplayIcon">
                        <MdLocalFireDepartment />
                    </div>
                    <div className="featureDisplayIcon">
                        <MdGrid3X3 />
                    </div>
                    <div className="featureDisplayIcon">
                        <MdMessage />
                    </div>
                    <div className="featureDisplayIcon">
                        <MdLock />
                    </div>
                    <div className="featureDisplayTitle">Real-time Messaging</div>
                    <div className="featureDisplayTitle">Chat Rooms</div>
                    <div className="featureDisplayTitle">Direct Messaging</div>
                    <div className="featureDisplayTitle">Secure Authentication</div>
                    <div className="featureDisplayDescription">See messages instantly with WebSocket technology.</div>
                    <div className="featureDisplayDescription">Organize discussion into different channels.</div>
                    <div className="featureDisplayDescription">Message other people directly.</div>
                    <div className="featureDisplayDescription">Profiles are secured with Google log-in.</div>
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
                autoFocus
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
            <div className="headerText">
                <div className="headerChannel">{`#${store.channel}`}</div>
                <div className="headerChannelDescription">{CHANNELS.get(store.channel).description}</div>
            </div>
            <div className="headerMenu">
                <VscMenu />
            </div>
        </div>
    );
});

const ChatUI: React.FC = observer(() => {
    return (
        <div className="chatUI">
            <Sidebar />
            <div className="chatBox">
                <Header />
                <Chat />
                <SendDialog />
            </div>
        </div>
    );
});

const SidebarHeading: React.FC = observer(({ children }) => {
    return (
        <div className="sidebarHeading">
            <div>{children}</div>
            <div className="sidebar-menu">
                <VscTriangleDown></VscTriangleDown>
            </div>
        </div>
    );
});

const SidebarItem: React.FC = observer(({ children }) => {
    return (
        <div className="sidebar-item">
            <div>{children}</div>
            <div>
                <VscAccount />
            </div>
        </div>
    );
});

const Sidebar: React.FC = observer(() => {
    return (
        <div className="sidebar">
            <SidebarHeader />
            <div className="sidebar-section">
                <SidebarHeading>Channels</SidebarHeading>
                <div className="sidebar-list">
                    {Array.from(CHANNELS, ([name, channel]) => (
                        <ChannelItem key={name} channel={channel.name} />
                    ))}
                </div>
            </div>
            <div className="sidebar-section">
                <SidebarHeading>Direct Message</SidebarHeading>
                <div className="sidebar-list">
                    <SidebarItem>Alice Almond</SidebarItem>
                    <SidebarItem>Bob Bishop</SidebarItem>
                    <SidebarItem>Carlos Cortez</SidebarItem>
                </div>
            </div>
        </div>
    );
});

const SidebarHeader: React.FC = observer(() => {
    const store = useContext(RootStoreContext);

    return (
        <div className="sidebar-header">
            <div className="sidebarHeaderBranding">Chatter</div>
            <div className="sidebarHeaderStatus">
                <div className="headerProfile">{store.profile == null ? '' : `${store.profile.name}`}</div>
                <div className={store.ws.isReady ? 'greenDot' : 'redDot'}>
                    <VscAccount />
                </div>
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

//TODO disable message send until socket is ready
const Chat: React.FC = observer(() => {
    const store = useContext(RootStoreContext);

    return (
        <div className="chat">
            <div className="messages">
                {store.messages
                    .filter((message) => {
                        return message.channel == store.channel;
                    })
                    .map((x) => (
                        <div key={x.messageID} className="messageCard">
                            <img
                                src={x.profile.picture}
                                referrerPolicy="no-referrer"
                                className="messageCardUserImage"
                            ></img>
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

const store = new RootStore(SERVER_URL);

export const handleCredentialResponse = (response: any) => store.connect(response.credential);

const App: React.FC = observer(() => {
    return (
        <RootStoreContext.Provider value={store}>
            {store.profile == null ? <LoginScreen /> : <ChatUI />}
        </RootStoreContext.Provider>
    );
});

export default App;
