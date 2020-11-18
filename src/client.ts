import {Terminal} from 'xterm';
import {AttachAddon} from 'xterm-addon-attach';
import {FitAddon} from 'xterm-addon-fit';

const terminalContainer = document.getElementById('terminal-container');
const protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
const socketURL = protocol + location.hostname + (location.port ? (':' + location.port) : '') + '/terminal';

let fitAddon: FitAddon;
let attachAddon: AttachAddon;
let socket: WebSocket;
let terminal: Terminal;
let pid: string;

function createTerminal(): void {
  terminal = new Terminal({
    windowsMode: navigator.platform === 'Windows',
  });

  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  terminal.onResize((size: {cols: number, rows: number}) => {
    if (!pid) {
      return;
    }
    fetch('/terminal/resize?cols=' + size.cols + '&rows=' + size.rows, {method: 'POST'});
  });

  terminal.open(terminalContainer!);
  fitAddon.fit();
  terminal.focus();

  setTimeout(() => {
    const [cols, rows] = getTerminalColsAndRows();

    fetch(`/terminal?cols=${cols}&rows=${rows}`, {method: 'POST'}).then(res => {
      res.text().then(processId => {
        pid = processId;
        socket = new WebSocket(socketURL);
        socket.onopen = () => {
          attachAddon = new AttachAddon(socket);
          terminal.loadAddon(attachAddon);
        };
      });
    });
  }, 0);
}

function getTerminalColsAndRows(): [number, number] {
    const width = terminalContainer!.offsetWidth;
    const height = terminalContainer!.offsetHeight;
    // TODO: DANGER - using private terminal API :-(
    const terminalCore = (terminal as any)._core;
    const cols = Math.floor((width - terminalCore.viewport.scrollBarWidth) / terminalCore._renderService.dimensions.actualCellWidth);
    const rows = Math.floor(height / terminalCore._renderService.dimensions.actualCellHeight);

    return [cols, rows];
}

createTerminal();
