import React from 'react';
import axios from 'axios';
import { Terminal } from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/lib/xterm.css';
import { TAB_HEIGHT } from './Tabs';
import { ScrollBehaviorProperty } from 'csstype';

Terminal.applyAddon(fit);

export let openNewTerm: ((tabs: string[]) => Promise<string>) | null = null;
export let term: Terminal;

let cursor: HTMLDivElement | null = null;;

async function focus(pid: string) {
    term.clear();
    term.focus();
    await axios.post(`/terminals/pid/${pid}`);
}

function runRealTerminal(socket: WebSocket): void {
    term.loadAddon(new AttachAddon(socket));
}

const newTerm = (
    setTabs: React.Dispatch<React.SetStateAction<string[]>>,
) => async (
    tabs: string[],
    ) => {
        const { data: pid } = await axios.post(`/terminals/new?cols=${term.cols}&rows=${term.rows}`, {});
        setTabs([...tabs, pid]);
        return pid;
    }

const openWS = (pid: string) => {
    const { protocol, port, hostname } = window.location;
    const wsProtocol = (protocol === 'https:') ? 'wss:' : 'ws:';
    // ${port || 80}
    const socketURL = `${wsProtocol}//${hostname}:3005/terminals/${pid}`;
    const socket = new WebSocket(socketURL);
    socket.onopen = () => runRealTerminal(socket);
    socket.onclose = () => term.writeln('\r\n\r\nxterm.js close\r\n');
    socket.onerror = () => term.writeln('\r\n\r\nxterm.js close\r\n');
    return socket;
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
    console.log('toggleTrackScroll', trackScrollActive);
}


const customWrite = () => {
    const write = term.write.bind(term);
    term.write = (data: string) => {
        // console.log('receive data', data);
        if (data[0] === '@') {
            if (data[1] === 's') {
                console.log('scroll', data);
                const viewport = getViewPort();
                if (viewport) {
                    const value = parseInt(data.substring(2), 10);
                    console.log('scrollTop', value);
                    viewport.scrollTop = value;
                }
            } else { // ToDo: take care that the cursor dont get out of the frame
                const [x, y] = data.substring(1).split(':');
                // console.log('receive coordinate', x, y);
                if (cursor) {
                    cursor.style.left = `${parseInt(x, 10) + 2}px`;
                    cursor.style.top = `${parseInt(y, 10) + 2}px`;
                }
            }
        } else {
            write(data);
        }
    };
}

const setContainer = (
    tabs: string[],
    setTabs: React.Dispatch<React.SetStateAction<string[]>>,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
) => async (container: HTMLDivElement) => {
    if (container) {
        console.log('Load terminal container');
        const windowsMode = ['Windows', 'Win16', 'Win32', 'WinCE'].indexOf(navigator.platform) >= 0;
        term = new Terminal({
            windowsMode,
            cursorBlink: true,
        });
        (window as any).term = term;  // Expose `term` to window for debugging purposes
        term.open(container);
        term.focus();
        customWrite();
        openNewTerm = newTerm(setTabs);

        container.style.height = (window.innerHeight - TAB_HEIGHT) + 'px';
        (term as any).fit();

        const { data: list } = await axios.post(`/terminals/list`, {});
        let pid = !list.length ? await openNewTerm(tabs) : list[0];
        const socket = openWS(pid);
        setActiveTab(pid);
        trackMouse(socket);
        trackScroll(socket);
        setTimeout(() => toggleTrackScroll(true), 3000);
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
            <div ref={ref => { if (ref) container = ref; }} />
        </>
    );
}
