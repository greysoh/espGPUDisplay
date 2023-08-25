import { main } from "../index.mjs";

const terminal = new Terminal();
const fitAddon = new FitAddon.FitAddon();
terminal.loadAddon(fitAddon);

const encoder = new TextEncoder();

const terminalElem = document.getElementById("terminal");

export function loop(decodedValue) {
  console.log(decodedValue);
  if (!decodedValue.endsWith("\n")) return;
  console.log(true);

  if (decodedValue.startsWith("LIST ")) {
    const meow = decodedValue.replace("LIST ", "");
    terminal.write("\r\n - " + meow);
  }
}

export async function init(decodedValue, deviceType, reader, writer) {
  terminalElem.style.display = "block";
  deviceType = "CPU";

  terminal.open(terminalElem);
  fitAddon.fit();

  terminal.write("Porta USB Client (WIP) v0.0.1 by greysoh\r\n\nSending BITE response...");
  await writer.write(encoder.encode("BITE\n"));
  await new Promise((i) => setTimeout(i, 100));

  terminal.write("\r\nSending directory listing request...");
  await writer.write(encoder.encode("list /\n"));
}