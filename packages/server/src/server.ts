#!/usr/bin/env node

import { info, error, success } from 'logol';
import { spawn } from 'node-pty';
import * as express from 'express';
import * as expressWs from 'express-ws';
import * as Ws from 'ws';
import { Response, Request } from 'express-serve-static-core';
// import * as bodyParser from 'body-parser';

const port = 3005;

const terminals = {};
const logs = {};
let activePid: number;
const webSockets: Ws[] = [];

async function start() {
    info('Starting server.');
    const app = express();
    expressWs(app);

    // app.use(bodyParser.json());

    // if (staticFolder) {
    //     info('Add static folder', staticFolder);
    //     app.use(express.static(staticFolder));
    //     app.get('*', (req, res) =>
    //         res.sendFile(join(staticFolder, 'index.html'), {
    //             root: process.cwd(),
    //         }),
    //     );
    // }

    app.all('/terminals/pid/:pid', (req: Request, res: Response) => {
        activePid = parseInt(req.params.pid, 10);
        sendList();
        if (webSockets.length) {
            webSockets.forEach(ws => {
                ws.send(`@c\n\r`);
                ws.send(logs[terminals[activePid].pid]);
            });
        }
        res.send('ok');
        res.end();
    });

    function sendList() {
        if (webSockets.length) {
            const list = Object.keys(terminals);
            const data = JSON.stringify({
                active: activePid,
                list,
            });
            webSockets.forEach(ws => {
                ws.send(`@t${data}\n\r`);
            });
        }
    }

    // string message buffering
    function buffer(socket, timeout: number) {
        let s = '';
        let sender = null;
        return (data) => {
            s += data;
            if (!sender) {
                sender = setTimeout(() => {
                    socket.send(s);
                    s = '';
                    sender = null;
                }, timeout);
            }
        };
    }

    function newTerm(cols?: number, rows?: number) {
        const term = spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
            name: 'xterm-color',
            cols: cols || 80,
            rows: rows || 24,
            cwd: process.env.PWD,
            env: process.env,
            encoding: 'utf8',
        });

        info('Created terminal with PID: ', term.pid);
        terminals[term.pid] = term;
        logs[term.pid] = '';
        term.on('data', (data) => {
            logs[term.pid] += data;
            if (webSockets.length && activePid === term.pid) {
                webSockets.forEach(ws => buffer(ws, 5)(data));
            }
        });
        activePid = term.pid;
        sendList();
        return term.pid;
    }

    (app as any).ws('/terminals', (ws: Ws, req: any) => {
        webSockets.push(ws);

        if (!Object.keys(terminals).length) {
            newTerm();
        } else {
            sendList();
        }

        info('Connected to terminal ', terminals[activePid].pid);
        ws.send(logs[terminals[activePid].pid]);

        ws.on('message', (msg: string) => {
            if (msg[0] === '@') {
                if (msg === '@new') {
                    newTerm();
                } else {
                    if (msg[1] === 'f') { // fit screen
                        const [cols, rows] = msg.substring(2).split(':');
                        for (const pid in terminals) {
                            terminals[pid].resize(parseInt(cols, 10), parseInt(rows, 10));
                        }
                    }
                    webSockets.forEach(ws => buffer(ws, 5)(msg)); // we could filter out the current ws
                }
            } else {
                terminals[activePid].write(msg);
            }
        });
        ws.on('close', () => {
            const index = webSockets.indexOf(ws);
            webSockets.splice(index, 1);
            info('Close websocket connection');
        });
    });

    app.use((
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        error(err);
        res.status(500).send(err.message);
    });

    app.listen(port, () => {
        success(`Server listening on port ${port}!`);
    });
}

start();
