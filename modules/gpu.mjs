import { main } from "../index.mjs";

const deviceDetails = {};

const discoveryStatus = document.getElementById("discovery");
const framebuffer = document.getElementById("framebuffer");
const ctx = framebuffer.getContext("2d");

export function loop(serialArray) {
  console.log(serialArray);
  for (const sentienceBuffer of serialArray) {
    const sentienceSplit = sentienceBuffer.split(".").map((i) => parseInt(i));

    const r = sentienceSplit[2] ?? 0;
    const g = sentienceSplit[3] ?? 0;
    const b = sentienceSplit[4] ?? 0;

    const x = sentienceSplit[0] ?? 0;
    const y = sentienceSplit[1] ?? 0;

    ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    ctx.fillRect(x + 1, y + 1, 1, 1);
  }
}

export async function init(decodedValue, deviceType, reader, writer, port) {
  const resDetails = deviceType
    .split("@")[1]
    .split("x")
    .map((i) => parseInt(i));
  const baudRate = parseInt(deviceType.split(".")[1].split("@")[0]);

  deviceType = "GPU";

  framebuffer.style.display = "inline";
  discoveryStatus.style.display = "hidden";

  ctx.canvas.width = resDetails[1];
  ctx.canvas.height = resDetails[0];
  console.log(deviceDetails);

  deviceDetails.width = resDetails[1];
  deviceDetails.height = resDetails[0];

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, deviceDetails.width, deviceDetails.height);

  if (baudRate != 115200) {
    console.log("INFO: Changing baud rate from 115200 to %s.", baudRate);

    reader.releaseLock();
    writer.releaseLock();
    await port.close();

    return await main(baudRate);
  }
}
