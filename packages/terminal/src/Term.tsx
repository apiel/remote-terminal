import React from 'react';
import axios from 'axios';
import { Terminal, IEvent } from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/lib/xterm.css';
import { TAB_HEIGHT } from './Tabs';

Terminal.applyAddon(fit);

export let term: Terminal;
export let termContainer: HTMLDivElement;

let cursor: HTMLDivElement | null = null;
let ws: WebSocket;

async function focus(pid: string) {
    term.clear();
    term.focus();
    await axios.post(`/terminals/pid/${pid}`);
}

function runRealTerminal(socket: WebSocket): void {
    term.loadAddon(new AttachAddon(socket));
}

export const openNewTerm = () => {
    if (ws) {
        ws.send(`@new`);
    }
};


const openWS = () => {
    const { protocol, port, hostname } = window.location;
    const wsProtocol = (protocol === 'https:') ? 'wss:' : 'ws:';
    // ${port || 80}
    const socketURL = `${wsProtocol}//${hostname}:3005/terminals`;
    ws = new WebSocket(socketURL);
    ws.onopen = () => runRealTerminal(ws);
    ws.onclose = () => term.writeln('\r\n\r\nxterm.js close\r\n');
    ws.onerror = () => term.writeln('\r\n\r\nxterm.js close\r\n');
    return ws;
}

const trackMouse = (socket: WebSocket) => {
    document.onmousemove = (ev: MouseEvent) => {
        // console.log('mousemove', ev.x, ev.y);
        socket.send(`@${ev.x}:${ev.y}`);
    };
}

const getViewPort = () => {
    const viewports = document.getElementsByClassName('xterm-viewport');
    if (viewports.length) {
        return viewports[0] as HTMLDivElement; // there might be better way to get viewport
    }
}

let trackScrollActive = false;
const trackScroll = (socket: WebSocket) => {
    const viewport = getViewPort();
    if (viewport) {
        viewport.onscroll = (ev: Event) => {
            if (trackScrollActive) {
                // console.log('scroll', viewport.scrollTop);
                socket.send(`@s${viewport.scrollTop}`);
            }
        };
    }
}
const toggleTrackScroll = (state: boolean) => {
    trackScrollActive = state;
    // console.log('toggleTrackScroll', trackScrollActive);
}

const trackSelection = (socket: WebSocket) => {
    term.onSelectionChange(() => {
        // term.cols*(term._core.selectionManager.selectionEnd[1]-term._core.selectionManager.selectionStart[1]) + term._core.selectionManager.selectionEnd[0] - term._core.selectionManager.selectionStart[0]
        const end = (term as any)._core.selectionManager.selectionEnd;
        const start = (term as any)._core.selectionManager.selectionStart;
        if (end && start && end.length === 2 && start.length === 2) {
            const length = term.cols * (end[1] - start[1]) + end[0] - start[0];
            const selection = [...start, length];
            socket.send(`@a${selection.join(':')}`);
        }
    });
}

const customWrite = (
    setTabs: React.Dispatch<React.SetStateAction<string[]>>,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
) => {
    const write = term.write.bind(term);
    term.write = (data: string) => {
        // console.log('receive data', data);
        if (data[0] === '@') {
            if (data[1] === 'a') { // selection
                const selection = data.substring(2).split(':').map(v => parseInt(v, 10));
                console.log('select', selection);
                (term as any)._core.selectionManager.setSelection(...selection);
            } else if (data[1] === 'c') {
                term.clear();
            } else if (data[1] === 'f') { // fit screen
                const [width, height] = data.substring(2).split(':');
                console.log('fit screen', width, height);
                termContainer.style.width = width;
                termContainer.style.height = height;
                (term as any).fit();
            } else if (data[1] === 's') { // scroll
                // console.log('scroll', data);
                const viewport = getViewPort();
                if (viewport) {
                    const value = parseInt(data.substring(2), 10);
                    // console.log('scrollTop', value);
                    viewport.scrollTop = value;
                }
            } else if (data[1] === 't') { // tab
                const tabs = JSON.parse(data.substring(2));
                setTabs(tabs.list);
                setActiveTab(tabs.active.toString());
            } else { // ToDo: take care that the cursor dont get out of the frame
                const [x, y] = data.substring(1).split(':');
                // console.log('receive coordinate', x, y);
                if (cursor) {
                    const left = Math.min(window.innerWidth - 10, parseInt(x, 10) + 2);
                    const top = Math.min(window.innerHeight - 10, parseInt(y, 10) + 2);
                    cursor.style.left = `${left}px`;
                    cursor.style.top = `${top}px`;
                }
            }
        } else {
            write(data);
        }
    };
}

export const fitScreen = () => {
    if (termContainer) {
        termContainer.style.width = window.innerWidth + 'px';
        termContainer.style.height = (window.innerHeight - TAB_HEIGHT) + 'px';
        (term as any).fit();
        (term as any).focus();
        if (ws) {
            ws.send(`@f${termContainer.style.width}:${termContainer.style.height}`);
        }
    }
}

const setContainer = (
    tabs: string[],
    setTabs: React.Dispatch<React.SetStateAction<string[]>>,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
) => async (container: HTMLDivElement) => {
    if (container) {
        termContainer = container;
        (window as any).termContainer = termContainer;
        console.log('Load terminal container');
        const windowsMode = ['Windows', 'Win16', 'Win32', 'WinCE'].indexOf(navigator.platform) >= 0;
        term = new Terminal({
            windowsMode,
            cursorBlink: true,
        });
        (window as any).term = term;  // Expose `term` to window for debugging purposes
        term.open(container);
        term.focus();
        customWrite(setTabs, setActiveTab);

        fitScreen();

        const socket = openWS();
        trackMouse(socket);
        trackScroll(socket);
        setTimeout(() => toggleTrackScroll(true), 3000);
        trackSelection(socket);
    }
}

const Cursor = () => <div className="cursor" ref={ref => { if (ref) cursor = ref; }} />;

interface Props {
    tabs: string[],
    setTabs: React.Dispatch<React.SetStateAction<string[]>>,
    activeTab: string,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
}
export const Term = ({ tabs, setTabs, activeTab, setActiveTab }: Props) => {
    let container: HTMLDivElement | null = null;
    React.useEffect(() => {
        if (container) {
            setContainer(tabs, setTabs, setActiveTab)(container);
        }
    }, [container]);
    React.useEffect(() => {
        console.log('activeTab', activeTab);
        if (activeTab && activeTab.length) {
            focus(activeTab);
        }
    }, [activeTab]);
    return (
        <>
            <Cursor />
            <div ref={ref => { if (ref) container = ref; }} className="term-container" />
        </>
    );
}
