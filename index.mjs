if (!navigator.serial) {
  alert("Browser doesn't support serial!");
  throw new Error("nah fam");
}

const terminal = new Terminal();
const fitAddon = new FitAddon.FitAddon();
terminal.loadAddon(fitAddon);

let deviceType;
let port;

const button = document.getElementById("button");

const terminalElem = document.getElementById("terminal");
const framebuffer = document.getElementById("framebuffer");
const discoveryStatus = document.getElementById("discovery");

async function main(baud = 115200) {
  const textDecoder = new TextDecoder("utf-8");

  await port.open({ baudRate: baud });
  let sentienceBuffer = "";
  
  while (port.readable) {
    const reader = port.readable.getReader();
    const writer = port.writable.getWriter();

    const encoder = new TextEncoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break; // We done

        const decodedValue = textDecoder.decode(value);
        sentienceBuffer += decodedValue.replaceAll("\r", "").split("\n")[0]; // FIXME: Some data may be lost doing this. Too bad!

        if (deviceType == "CPU") {
          const decodedValueFixed = decodedValue.replaceAll("\r", "").replaceAll("\n", "\r\n");

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
        } else if (deviceType == "GPU") {
          for (const sentienceBuffer of decodedValue.split("\n")) {
            const sentienceSplit = sentienceBuffer.split(".").map((i) => parseInt(i));
            const ctx = framebuffer.getContext("2d");

            // This is purely for convienience.
            const currentMonochromeColor = sentienceSplit[2];
            const x = sentienceSplit[0];
            const y = sentienceSplit[1];
            
            ctx.fillStyle = "rgb("+currentMonochromeColor+","+currentMonochromeColor+","+currentMonochromeColor+")";
            ctx.fillRect(x+1, y+1, 1, 1);
          }
        }

        if (decodedValue.includes("\n")) {
          if (sentienceBuffer.includes("device_tree") && !deviceType) {
            const detectedDeviceType = sentienceBuffer.split("device_tree: ")[1];
            discoveryStatus.innerText = "Detected device type is " + detectedDeviceType;
            
            deviceType = detectedDeviceType;

            if (deviceType == "CPU") {
              terminal.style.display = "block";

              terminal.open(terminalElem);
              fitAddon.fit();

              const resizeObserver = new ResizeObserver(fitAddon.fit);
              resizeObserver.observe(terminalElem);

              terminal.onKey(async(key, ev) => {
                await writer.write(encoder.encode(key.key.replaceAll("\r", "\r\n")));
              });
            } else if (deviceType == "GPU") {
              reader.releaseLock();
              writer.releaseLock();
              await port.close();
              
              console.log("INFO: Changing baud rate from 115200 to 921600.");

              framebuffer.style.display = "inline";
              discoveryStatus.style.display = "hidden";
              const ctx = framebuffer.getContext("2d");

              ctx.canvas.width = 256;
              ctx.canvas.height = 256;
              ctx.fillStyle = "#000000";
              ctx.fillRect(0, 0, 256, 256);

              return await main(921600);
            }
          }

          sentienceBuffer = decodedValue.split("\n")[1];
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      reader.releaseLock();
    }
  }
}

button.addEventListener("click", () => {
  button.style.display = "none";
  discoveryStatus.style.display = "inline";
  
  const usbVendorId = 0x10c4;
  navigator.serial
    .requestPort({ filters: [{ usbVendorId }] })
    .then((portRecv) => {
      port = portRecv;

      discoveryStatus.innerText = "Please press the RST button.";
      main();
    })
    .catch((e) => {
      console.error(e);
      alert(e);

      // Reload to refresh the current state of things
      window.location.reload();
    });
});