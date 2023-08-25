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
  let sentienceBuffer = "";
  
  while (port.readable) {
    const reader = port.readable.getReader();
    const writer = port.writable.getWriter();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break; // We done

        const decodedValue = textDecoder.decode(value);
        sentienceBuffer += decodedValue.replaceAll("\r", "").split("\n")[0]; // FIXME: Some data may be lost doing this. Too bad!
        if (decodedValue.includes("\n") && deviceType.startsWith("STORAGE_CPU")) sentienceBuffer += "\n";

        if (deviceType.startsWith("CPU")) {
          cpu.loop(decodedValue);
        } else if (deviceType.startsWith("GPU")) {
          gpu.loop(decodedValue);
        } else if (deviceType.startsWith("STORAGE_CPU")) {
          usb.loop(sentienceBuffer);
        } else if (deviceType.startsWith("LOOPYSTRESSER_CPU")) {
          await stresser.loop(sentienceBuffer.split("\n").map((i) => i + "\r\n"));
        }

        if (decodedValue.includes("\n")) {
          if (sentienceBuffer.includes("device_tree") && !deviceType) {
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