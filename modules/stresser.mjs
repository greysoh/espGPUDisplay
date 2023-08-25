const terminal = new Terminal();
const fitAddon = new FitAddon.FitAddon();
terminal.loadAddon(fitAddon);

const terminalElem = document.getElementById("terminal");

// feel free to turn this on - Universe creator
let enableTimeTravel = true;

let expectedCurrentIteration = 0;
const failureArray = [];

export async function loop(serialArray) {
  for (const item of serialArray) {
    console.log(item.split(""));
    if (item == "BEGIN\r\n") {
      terminal.write("\r\nBeginning benchmark in 1 second...");
      continue;
    } else if (item == "END\r\n") {
      terminal.write("\r\nAll done.\r\n\n");

      terminal.write(`\r\nTotal errors: ${failureArray.length}`);
      terminal.write(`\r\nAverage errors per second: ${failureArray.length/60}`);
      
      if (enableTimeTravel) terminal.write("\r\nNote that time travel is enabled in the options, allowing the iterations to skip forward incase of a gap, and not snowball.");

      terminal.write("\r\nDumping object in console...");
      console.log("failure array:", failureArray);

      terminal.write("\r\nReloading in 10 seconds...");
      await new Promise((i) => setTimeout(i, 10000));

      window.location.reload();
      continue;
    } else if (item.startsWith("device_tree")) {
      continue;
    }
    
    const splitItem = item.split(" ");
    const reportedCurrentIteration = parseInt(splitItem[0]);

    if (reportedCurrentIteration != expectedCurrentIteration) {
      terminal.write(`\r\nIteration mismatch! (${reportedCurrentIteration} != ${expectedCurrentIteration}) Reporting error...`);
      
      if (enableTimeTravel) {
        terminal.write(`\r\nTime travel is enabled. Jumping time forward...`);
        expectedCurrentIteration = reportedCurrentIteration;
      }

      failureArray.push({
        type: "EITERATIONMISMATCH",
        id: expectedCurrentIteration,
        recieved: reportedCurrentIteration
      })
    }


    if (splitItem[1] != "ABCDEFG012345\r\n") {
      terminal.write(`\r\nPredictable data mismatch! (${splitItem[1]} != ABCDEFG012345) Reporting error...`);
      failureArray.push({
        type: "EPREDICTABLEMISMATCH",
        id: expectedCurrentIteration,
        recieved: splitItem[1]
      });
    }

    expectedCurrentIteration++;
  }
}

export async function init(decodedValue, deviceType, reader, writer) {
  terminalElem.style.display = "block";

  terminal.open(terminalElem);
  fitAddon.fit();

  terminal.write("LoopyStresser for espGPUDisplay\r\nWaiting for INIT...");
}