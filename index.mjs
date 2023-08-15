if (!navigator.serial) {
  alert("Browser doesn't support serial!");
  throw new Error("nah fam");
}

const terminal = new Terminal();
const fitAddon = new FitAddon.FitAddon();
terminal.loadAddon(fitAddon);

const deviceDetails = {};
let deviceType;
let port;

const button = document.getElementById("button");

const terminalElem = document.getElementById("terminal");
const framebuffer = document.getElementById("framebuffer");
const discoveryStatus = document.getElementById("discovery");

const ctx = framebuffer.getContext("2d");

function removeAndCapture(text) {
  let periodsCount = 0;
  let index = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '.') {
      periodsCount++;
      if (periodsCount === 5) {
        index = i;
        break;
      }
    }
  }

  if (index !== -1) {
    const beforeFivePeriods = text.substring(0, index + 1) ?? "";
    const removedData = text.substring(index + 1) ?? "";
    return { shortenedText: beforeFivePeriods, removedData };
  } else {
    return { shortenedText: text, removedData: '' };
  }
}


async function main(baud = 115200) {
  const textDecoder = new TextDecoder("utf-8");

  await port.open({ baudRate: baud });
  let sentienceBuffer = ""; // FIXME: make this more compatible?
  let tempUnfinishedBuffer; // FIXME: could this be used as sentienceBuffer instead?

  const gpuSentienceBuffer = [];
  const gpuUnfinishedBits = [];
  
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

        if (deviceType == "GPU") {
          const tempDecodedData = decodedValue.replaceAll("\r", "").split("\n");
          gpuSentienceBuffer.push(...tempDecodedData.filter((i) => i.split(".").length == 5)); // We drop the corrupted bits, for now.
          gpuUnfinishedBits.push(...tempDecodedData.filter((i) => i.split(".").length != 5));
  
          // Time to become a janitor (thank goodness I have a maid outfit...)
          
          while (gpuUnfinishedBits.length != 0) {
            const bit = gpuUnfinishedBits[0];
            gpuUnfinishedBits.splice(0, 1);
            
            tempUnfinishedBuffer += bit;

            if (tempUnfinishedBuffer.split(".").length > 6) { // Maths.
              console.warn("JanitorMaid: Successfully performed loose data recovery. Data: %s", tempUnfinishedBuffer);
              const trimmedData = removeAndCapture(tempUnfinishedBuffer);
              gpuSentienceBuffer.push(trimmedData.shortenedText);
              gpuUnfinishedBits.unshift(trimmedData.removedData ?? "");
              tempUnfinishedBuffer = "";
            }
          }

          if (tempUnfinishedBuffer != "") {
            console.error("JanitorMaid: FAILED cleanup opts!");
          }
        }

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
          while (gpuSentienceBuffer.length != 0) {
            const sentienceBuffer = gpuSentienceBuffer[0];

            //console.log("THE NUMBER #9 [LEAKED]:", sentienceBuffer);
            const sentienceSplit = sentienceBuffer.split(".").map((i) => parseInt(i));

            // This is purely for convienience.
            const r = sentienceSplit[2] ?? 0;
            const g = sentienceSplit[3] ?? 0;
            const b = sentienceSplit[4] ?? 0;
            
            const x = sentienceSplit[0] ?? 0;
            const y = sentienceSplit[1] ?? 0;
            
            ctx.fillStyle = "rgb("+r+","+g+","+b+")";
            ctx.fillRect(x+1, y+1, 1, 1);

            gpuSentienceBuffer.splice(0, 1);
          }
        }

        if (decodedValue.includes("\n")) {
          if (sentienceBuffer.includes("device_tree") && !deviceType) {
            const detectedDeviceType = sentienceBuffer.split("device_tree: ")[1];
            discoveryStatus.innerText = "Detected device type is " + detectedDeviceType;
            
            deviceType = detectedDeviceType;

            if (deviceType.startsWith("CPU")) {
              terminal.style.display = "block";
              deviceType = "CPU";

              terminal.open(terminalElem);
              fitAddon.fit();

              const resizeObserver = new ResizeObserver(fitAddon.fit);
              resizeObserver.observe(terminalElem);

              terminal.onKey(async(key, ev) => {
                await writer.write(encoder.encode(key.key.replaceAll("\r", "\r\n")));
              });
            } else if (deviceType.startsWith("GPU")) {
              const resDetails = deviceType.split("@")[1].split("x").map((i) => parseInt(i));
              deviceType = "GPU";

              reader.releaseLock();
              writer.releaseLock();
              await port.close();
              
              console.log("INFO: Changing baud rate from 115200 to 921600.");
              framebuffer.style.display = "inline";
              discoveryStatus.style.display = "hidden";

              ctx.canvas.width = resDetails[1];
              ctx.canvas.height = resDetails[0];

              console.log("width: %s; height: %s", resDetails[1], resDetails[0]);
              if (resDetails[1] == 15630) console.log("Welcome to the 8k tech demo!");

              deviceDetails.width = resDetails[1];
              deviceDetails.height = resDetails[0];
              
              ctx.fillStyle = "#000000";
              ctx.fillRect(0, 0, deviceDetails.width, deviceDetails.height);

              return await main(921600);
            }
          }

          sentienceBuffer = decodedValue.replaceAll("\r", "").split("\n");
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