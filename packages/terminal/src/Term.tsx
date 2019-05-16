import React from 'react';
import axios from 'axios';
import { Terminal } from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/dist/xterm.css';

const TAB_HEIGHT = 40;

Terminal.applyAddon(fit);

function runRealTerminal(term: Terminal, socket: WebSocket): void {
    term.loadAddon(new AttachAddon(socket));
}

const setContainer = async (container: HTMLDivElement) => {
    if (container) {
        console.log('Load terminal container');
        const windowsMode = ['Windows', 'Win16', 'Win32', 'WinCE'].indexOf(navigator.platform) >= 0;
        const term = new Terminal({
            windowsMode,
        });
        (window as any).term = term;  // Expose `term` to window for debugging purposes
        term.open(container);
        term.focus();

        container.style.height = (window.innerHeight - TAB_HEIGHT) + 'px';
        (term as any).fit();

        const { data: pid } = await axios.post(`/terminals?cols=${term.cols}&rows=${term.rows}`, {});
        console.log('pid', pid);
        const { protocol, port, hostname } = window.location;
        const wsProtocol = (protocol === 'https:') ? 'wss:' : 'ws:';
        // ${port || 80}
        const socketURL = `${wsProtocol}//${hostname}:3005/terminals/${pid}`;
        const socket = new WebSocket(socketURL);
        socket.onopen = () => runRealTerminal(term, socket);
        socket.onclose = () => term.writeln('\r\n\r\nxterm.js close\r\n');
        socket.onerror = () => term.writeln('\r\n\r\nxterm.js close\r\n');
    }
}

export const Term = () => {
    return (
        <div ref={setContainer} />
    );
}
