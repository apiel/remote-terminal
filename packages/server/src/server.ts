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
        if (webSockets.length) {
            webSockets.forEach(ws => ws.send(logs[terminals[activePid].pid]));
        }
        res.send('ok');
        res.end();
    });

    app.all('/terminals/list', (req: Request, res: Response) => {
        res.send(Object.keys(terminals));
        res.end();
    });

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

    app.all('/terminals/new', (req: Request, res: Response) => {
        const cols = parseInt(req.query.cols, 10);
        const rows = parseInt(req.query.rows, 10);

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
        res.send(term.pid.toString());
        res.end();
    });

    // app.post('/terminals/:pid/size', (req, res) => {
    //     const pid = parseInt(req.params.pid, 10);
    //         cols = parseInt(req.query.cols),
    //         rows = parseInt(req.query.rows),
    //         term = terminals[pid];

    //     term.resize(cols, rows);
    //     console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
    //     res.end();
    // });

    (app as any).ws('/terminals/:pid', (ws: Ws, req: any) => {
        webSockets.push(ws);
        activePid = parseInt(req.params.pid, 10);

        info('Connected to terminal ', terminals[activePid].pid);
        ws.send(logs[terminals[activePid].pid]);

        ws.on('message', (msg: string) => {
            if (msg[0] === '@') {
                // console.log('receive coordinates', msg);
                webSockets.forEach(ws => buffer(ws, 5)(msg)); // we could filter out the current ws
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
