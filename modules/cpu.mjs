const terminal = new Terminal();
const fitAddon = new FitAddon.FitAddon();
terminal.loadAddon(fitAddon);

const encoder = new TextEncoder();

const terminalElem = document.getElementById("terminal");

export function loop(decodedValue) {
  const decodedValueFixed = decodedValue
    .replaceAll("\r", "")
    .replaceAll("\n", "\r\n");

  const decodedCodes = decodedValueFixed.split("").map((i) => i.charCodeAt(0));
  let hasCheckFailed; // FIXME: is there a better way to do this?

  for (const code of decodedCodes) {
    if (code == 127) {
      terminal.write("\b \b");

      hasCheckFailed = true;
      continue;
    }
  }

  if (!hasCheckFailed) terminal.write(decodedValueFixed);
}

export function init(decodedValue, deviceType, reader, writer) {
  terminalElem.style.display = "block";
  deviceType = "CPU";

  terminal.open(terminalElem);
  fitAddon.fit();

  const resizeObserver = new ResizeObserver(fitAddon.fit);
  resizeObserver.observe(terminalElem);

  terminal.onKey(async (key, ev) => {
    await writer.write(encoder.encode(key.key.replaceAll("\r", "\r\n")));
  });
}
