import React from 'react';
import axios from 'axios';
import { Terminal } from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/lib/xterm.css';
import { TAB_HEIGHT } from './Tabs';

Terminal.applyAddon(fit);

export let openNewTerm: ((tabs: string[]) => Promise<string>) | null = null;
export let term: Terminal;

async function focus(pid: string) {
    term.clear();
    term.focus();
    await axios.post(`/terminals/pid/${pid}`);
}

function runRealTerminal(socket: WebSocket): void {
    term.loadAddon(new AttachAddon(socket));
}

const newTerm  = (
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
        });
        (window as any).term = term;  // Expose `term` to window for debugging purposes
        term.open(container);
        term.focus();
        openNewTerm = newTerm(setTabs);


        container.style.height = (window.innerHeight - TAB_HEIGHT) + 'px';
        (term as any).fit();

        const { data: list } = await axios.post(`/terminals/list`, {});
        if (!list.length) {
            const pid = await openNewTerm(tabs);
            setActiveTab(pid);
            openWS(pid);
        } else {
            setTabs(list);
            const [pid] = list;
            setActiveTab(pid);
            openWS(pid);
        }
    }
}

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
        focus(activeTab);
    }, [activeTab]);
    return (
        <div ref={ref => { if (ref) container = ref; }} />
    );
}
