if (!navigator.serial) {
  alert("Browser doesn't support serial!");
  throw new Error("nah fam");
}

let deviceType = "";
let port;

const button = document.getElementById("button");
const discoveryStatus = document.getElementById("discovery");

import * as cpu from "./modules/cpu.mjs";
import * as gpu from "./modules/gpu.mjs";
import * as usb from "./modules/usb.mjs";

import * as stresser from "./modules/stresser.mjs";

export async function main(baud = 115200) {
  const textDecoder = new TextDecoder("utf-8");

  await port.open({ baudRate: baud });
  const serialArray = [];
  let serialBuffer = "";
  
  while (port.readable) {
    const reader = port.readable.getReader();
    const writer = port.writable.getWriter();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break; // We done

        const decodedValue = textDecoder.decode(value);
        serialBuffer += decodedValue;

        // Done this way so we can keep track of what data is complete and incomplete.
        const tempItemOp = serialBuffer.replaceAll("\n", "...MARK...\n").split("\n").map((i) => i.replace("...MARK...", "\n"));
        
        // FIXME: We probably shouldn't need to do this, and likely should remove it instead, but without clearing it out, everything breaks.
        serialBuffer = ""; // Nuke the current buffer, so we can fit new data into it.

        for (const item of tempItemOp) {
          if (item.endsWith("\n")) {
            const missingItemsForSerialBuffer = serialBuffer.split("\n");
            serialArray.push(missingItemsForSerialBuffer[0] + item);

            for (var i = 0; i < missingItemsForSerialBuffer.length-2; i++) serialArray.push(missingItemsForSerialBuffer[i]);
            serialBuffer = missingItemsForSerialBuffer[missingItemsForSerialBuffer.length-1];
          } else serialBuffer += item;
        }

        if (deviceType.startsWith("CPU")) {
          cpu.loop(decodedValue);
        } else if (deviceType.startsWith("GPU")) {
          gpu.loop(serialArray);
        } else if (deviceType.startsWith("STORAGE_CPU")) {
          usb.loop(serialArray);
        } else if (deviceType.startsWith("LOOPYSTRESSER_CPU")) {
          await stresser.loop(serialArray);
        }

        if (!deviceType && decodedValue.includes("\n") && serialArray[0]) {
          if (serialArray[0].includes("device_tree")) {
            const sentienceBuffer = serialArray[0];
            
            const detectedDeviceType = sentienceBuffer.split("device_tree: ")[1];
            discoveryStatus.innerText = "Detected device type is " + detectedDeviceType;
            
            deviceType = detectedDeviceType;

            if (deviceType.startsWith("CPU")) {
              await cpu.init(decodedValue, deviceType, reader, writer);
            } else if (deviceType.startsWith("GPU")) {
              await gpu.init(decodedValue, deviceType, reader, writer, port);
            } else if (deviceType.startsWith("STORAGE_CPU")) {
              await usb.init(decodedValue, deviceType, reader, writer);
            } else if (deviceType.startsWith("LOOPYSTRESSER_CPU")) {
              await stresser.init(decodedValue, deviceType, reader, writer, port);
            }
          }
        }

        serialArray.splice(0, serialArray.length-1); // Clean up our data
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