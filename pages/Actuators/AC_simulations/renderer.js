// Electron zoom — only runs inside Electron, skipped in browser
try {
  const { webFrame, ipcRenderer } = require('electron');
  ipcRenderer.invoke('get-screen-info').then(({ width, height }) => {
    webFrame.setZoomFactor(width / 1838);
  }).catch(() => {});
} catch (e) {
  // Running in browser — no zoom adjustment needed
}

let currentTorqueChart;
let torqueRPMChart;
let currentRPMChart;
let currentVoltage = 0;
let currentAmpere = 0;
let speedPercentage  = 0;
let currentRotationSpeed = 0;
let animationFrameId = null
let dirToggleRotation = 0;
let motorToggle = true;
let directionToggle = true;
let directionMultiplier = 1;

function drawLines() {
  let powerButton = document.getElementById('powerButton').getBoundingClientRect();
  let smps = document.getElementById('speedControl').getBoundingClientRect();
  let circuitImage = document.getElementById('motor').getBoundingClientRect();

  let circuitHeight = circuitImage.bottom - circuitImage.top;
  let circuitT = circuitImage.top + window.scrollX + (circuitHeight * 0.2);
  let circuitM = circuitImage.top + window.scrollX + (circuitHeight * 0.4);
  let circuitB = circuitImage.top + window.scrollX + (circuitHeight * 0.6);
  
  var smpsPositionXL = powerButton.left + window.scrollX;
  var powerButtonY = powerButton.top + window.scrollY;
  var smpsPositionXR = powerButton.right + window.scrollX;
  var smpsPositionY = smps.top + window.scrollY;

  document.getElementById('mainLine1').setAttribute('x1', smpsPositionXL);
  document.getElementById('mainLine1').setAttribute('y1', powerButtonY - 75);
  document.getElementById('mainLine1').setAttribute('x2', smpsPositionXL);
  document.getElementById('mainLine1').setAttribute('y2', circuitB -50);


  document.getElementById('mainLine2').setAttribute('x1', smpsPositionXR);
  document.getElementById('mainLine2').setAttribute('y1', powerButtonY - 75);
  document.getElementById('mainLine2').setAttribute('x2', smpsPositionXR);
  document.getElementById('mainLine2').setAttribute('y2', circuitT);

  document.getElementById('mainLine3').setAttribute('x1', smpsPositionXL + (smpsPositionXR - smpsPositionXL)/2 );
  document.getElementById('mainLine3').setAttribute('y1', powerButtonY - 75);
  document.getElementById('mainLine3').setAttribute('x2', smpsPositionXL + (smpsPositionXR - smpsPositionXL)/2);
  document.getElementById('mainLine3').setAttribute('y2', circuitM);

  document.getElementById('horizontalLine1').setAttribute('x1', smpsPositionXL + 95);
  document.getElementById('horizontalLine1').setAttribute('y1', circuitT);
  document.getElementById('horizontalLine1').setAttribute('x2', smpsPositionXR + 240);
  document.getElementById('horizontalLine1').setAttribute('y2',circuitT);

  document.getElementById('horizontalLine2').setAttribute('x1', smpsPositionXL + 1);
  document.getElementById('horizontalLine2').setAttribute('y1', circuitB -50);
  document.getElementById('horizontalLine2').setAttribute('x2', smpsPositionXR + 240);
  document.getElementById('horizontalLine2').setAttribute('y2', circuitB - 50);


  document.getElementById('horizontalLine3').setAttribute('x1', smpsPositionXL + 330);
  document.getElementById('horizontalLine3').setAttribute('y1', circuitM);
  document.getElementById('horizontalLine3').setAttribute('x2', smpsPositionXR - 46);
  document.getElementById('horizontalLine3').setAttribute('y2', circuitM);

  document.getElementById('neutralCircle').setAttribute('cx', smpsPositionXL);
  document.getElementById('neutralCircle').setAttribute('cy', powerButtonY - 75);

  document.getElementById('liveCircle').setAttribute('cx', smpsPositionXR);
  document.getElementById('liveCircle').setAttribute('cy', powerButtonY - 75);

  document.getElementById('liveCircle2').setAttribute('cx', smpsPositionXL + (smpsPositionXR - smpsPositionXL)/2);
  document.getElementById('liveCircle2').setAttribute('cy', powerButtonY - 75);
  
  document.getElementById('main-smpsN').setAttribute('x', smpsPositionXL - 5);
  document.getElementById('main-smpsN').setAttribute('y', powerButtonY - 90);

  document.getElementById('main-smpsL').setAttribute('x', smpsPositionXR - 5);
  document.getElementById('main-smpsL').setAttribute('y', powerButtonY - 90);

  document.getElementById('main-smpsT').setAttribute('x', smpsPositionXL + (smpsPositionXR - smpsPositionXL)/2 - 4);
  document.getElementById('main-smpsT').setAttribute('y', powerButtonY - 90);

}

function initializeCharts() {
  const currentTorqueCtx = document.getElementById('currentTorqueChart').getContext('2d');
  currentTorqueChart = new Chart(currentTorqueCtx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Torque',
        data: [],
        borderColor: 'blue',
        fill: false,
        showLine: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          title: { display: true, text: 'Current (A)' },
          min: 0,
          max: 4.5
        },
        y: { 
          title: { display: true, text: 'Torque (N/m)' },
          min: 0,
          max: 6.5
        }
      }
    }
  });

  const torqueRPMCtx = document.getElementById('torqueRPMChart').getContext('2d');
  torqueRPMChart = new Chart(torqueRPMCtx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'RPM',
        data: [],
        borderColor: 'green',
        fill: false,
        showLine: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          title: { display: true, text: 'Torque (N/m)' },
          min: 0,
          max: 6.5
        },
        y: { 
          title: { display: true, text: 'RPM' },
          min: 0,
          max: 5000
        }
      }
    }
  });

  const currentRPMCtx = document.getElementById('currentRPMChart').getContext('2d');
  currentRPMChart = new Chart(currentRPMCtx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'RPM',
        data: [],
        borderColor: 'red',
        fill: false,
        showLine: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          title: { display: true, text: 'Current (A)' },
          min: 0,
          max: 4.5
        },
        y: { 
          title: { display: true, text: 'RPM' },
          min: 0,
          max: 5000
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCharts();
  const powerButton = document.getElementById('powerButton');

  let isPowerOn = false;
  const knob = document.getElementById('knob');
  const knob2 = document.getElementById('knob2');
  let isDragging = false;
  let startY = 0;
  let tireRotation = 0;
  let currentRotation = 0;
  const tire = document.getElementById('tire');
  const dirToggle = document.getElementById('toggle');

  let targetRotationSpeed = 0;

  let pendingDirectionChange = false;

  let plottedPoints = {
    torqueRPM: {},
    currentRPM: {}
  };
  
  function updateCharts() {
  
    const dataPoints = [
      { current: 1.3, torque: 0, rpm: 1490 },
      { current: 1.4, torque: 0.6, rpm: 1478 },
      { current: 1.5, torque: 1.2, rpm: 1472 },
      { current: 1.6, torque: 1.9, rpm: 1468 },
      { current: 1.7, torque: 2.7, rpm: 1460 },
      { current: 1.8, torque: 3.4, rpm: 1455 },
      { current: 1.9, torque: 4.1, rpm: 1448 },
    ];
    
    currentTorqueChart.data.datasets[0].data = [];
    torqueRPMChart.data.datasets[0].data = [];
    currentRPMChart.data.datasets[0].data = [];
    const torqueRPMKey = `${speedPercentage.toFixed(2)}_${currentRotationSpeed.toFixed(0)}`;
  
    for (const point of dataPoints) {
      if (point.torque <= speedPercentage) {
      currentTorqueChart.data.datasets[0].data.push({ x: point.current, y: point.torque });
      torqueRPMChart.data.datasets[0].data.push({ x: point.torque, y: point.rpm });
      currentRPMChart.data.datasets[0].data.push({ x: point.current, y: point.rpm });
    }
  }
  
    currentTorqueChart.update();
    torqueRPMChart.update();
    currentRPMChart.update();
  }


  let maxRPM = 1490;
  let idealRPM = 1490;
  
  function updateKnob2(value) {
    value = Math.max(0, Math.min(50, value));
    const rotationDegrees = (value / 50) * 270 - 135;
    knob2.style.transform = `rotate(${rotationDegrees}deg)`;
    speedPercentage2 = value;
  
    idealRPM = 1490 * (speedPercentage2 / 50);
    maxRPM = idealRPM;
  
    // Calculate base current based on knob2 position
    let baseCurrentAmpere = (speedPercentage2 / 50) * 1.3;
  
    updateVoltageLabel();
    updateKnob(speedPercentage);  // This will now update the current
    updateRPMLabel();
  }
  
  function updateKnob(value) {
    value = Math.max(0, Math.min(4.1, value));
    const rotationDegrees = (value / 4.1) * 270 - 135;
    knob.style.transform = `rotate(${rotationDegrees}deg)`;

    const knob1Percentage = value / 4.1;
    
    // Calculate base current from knob2
    let baseCurrentAmpere = (speedPercentage2 / 50) * 1.3;
    
    // Adjust current based on knob1 position
    currentAmpere = baseCurrentAmpere * (1 + (0.46 * knob1Percentage));
  
    currentAmpere *= directionMultiplier;
  
    const torquePercentage = knob1Percentage;
    
    // Calculate RPM based on torque percentage and ideal RPM
    const minRPMAtMaxTorque = idealRPM * 0.97;
    targetRotationSpeed = idealRPM - torquePercentage * (idealRPM - minRPMAtMaxTorque);
  
    speedPercentage = value;
    targetRotation = value;
    currentRotation = knob1Percentage;
  
    updateStats();
    updateCharts();
    updateCurrentLabel();
    updateRPMLabel();
  }
  
  function updateRPMLabel() {
    document.getElementById('knobPercentage2').innerHTML = `${speedPercentage2.toFixed(2)}Hz`;
    document.getElementById('rpm').innerHTML = `${Math.abs(currentRotationSpeed).toFixed(0)}RPM`;
  }
  
  // let maxRPM = 1490;
  // let idealRPM = 1490;
  
  // function updateKnob2(value) {
  //   value = Math.max(0, Math.min(50, value));
  //   const rotationDegrees = (value / 50) * 270 - 135;
  //   knob2.style.transform = `rotate(${rotationDegrees}deg)`;
  //   speedPercentage2 = value;
  
  //   idealRPM = 1490 * (speedPercentage2 / 50);
  //   maxRPM = idealRPM;
  
  //   // Calculate base current based on knob2 position
  //   let baseCurrentAmpere = (speedPercentage2 / 50) * 1.3;
  
  //   updateVoltageLabel();
  //   updateKnob(speedPercentage);  // This will now update the current
  //   updateRPMLabel();
  // }
  
  // function updateKnob(value) {
  //   value = Math.max(0, Math.min(4.1, value));
  //   const rotationDegrees = (value / 4.1) * 270 - 135;
  //   knob.style.transform = `rotate(${rotationDegrees}deg)`;
  
  //   const knob1Percentage = value / 4.1;
    
  //   // Calculate base current from knob2
  //   let baseCurrentAmpere = (speedPercentage2 / 50) * 1.3;
    
  //   // Adjust current based on knob1 position
  //   currentAmpere = baseCurrentAmpere * (1 + (0.46 * knob1Percentage));
  
  //   currentAmpere *= directionMultiplier;
  
  //   const torquePercentage = knob1Percentage;
    
  //   // Calculate RPM based on torque percentage and ideal RPM
  //   const minRPMAtMaxTorque = idealRPM * 0.97;
  //   targetRotationSpeed = idealRPM - torquePercentage * (idealRPM - minRPMAtMaxTorque);
  
  //   speedPercentage = value;
  //   targetRotation = value;
  //   currentRotation = knob1Percentage;
  
  //   updateStats();
  //   updateCharts();
  //   updateCurrentLabel();
  //   updateRPMLabel();
  // }
  
  // function updateRPMLabel() {
  //   document.getElementById('knobPercentage2').innerHTML = `${speedPercentage2.toFixed(2)}Hz`;
  //   document.getElementById('rpm').innerHTML = `${Math.abs(currentRotationSpeed).toFixed(0)}RPM`;
  // }
  
  function animateTire(timestamp) {
    let shouldAnimate = isPowerOn && motorToggle;
    const degreesPerRPM = 6;

    if (shouldAnimate) {
      const acceleration = 2; // Adjust this value to control the acceleration/deceleration rate
      const targetSpeed = targetRotationSpeed * directionMultiplier;

      if (Math.abs(currentRotationSpeed - targetSpeed) > acceleration) {
        if (currentRotationSpeed < targetSpeed) {
          currentRotationSpeed += acceleration;
        } else {
          currentRotationSpeed -= acceleration;
        }
      } else {
        currentRotationSpeed = targetSpeed;
      }
    } else {
      if (currentRotationSpeed !== 0) {
        const deceleration = 5; // Adjust this value to control the deceleration speed when power is off
        if (Math.abs(currentRotationSpeed) > deceleration) {
          currentRotationSpeed -= deceleration * Math.sign(currentRotationSpeed);
        } else {
          currentRotationSpeed = 0;
        }
      }
    }

    const degreesPerFrame = currentRotationSpeed * degreesPerRPM / 60;
    tireRotation += degreesPerFrame;
    tire.style.transform = `rotate(${tireRotation}deg)`;

    if (currentRotationSpeed !== 0 || shouldAnimate) {
      animationFrameId = requestAnimationFrame(animateTire);
    } else {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    updateRPMLabel();
    updateVoltageLabel();
    updateCurrentLabel();
  }

  dirToggle.addEventListener('click', () => {
    pendingDirectionChange = true;
    directionToggle = !directionToggle;
    dirToggleRotation = directionToggle ? 0 : 180;
    dirToggle.style.transform = `rotate(${dirToggleRotation}deg)`;
    directionMultiplier *= 1;

    if (!directionToggle) {
      currentTorqueChart.data.datasets[0].data = [];
      torqueRPMChart.data.datasets[0].data = [];
      currentRPMChart.data.datasets[0].data = [];
      currentTorqueChart.update();
      torqueRPMChart.update();
      currentRPMChart.update();
      plottedPoints = {
        torqueRPM: {},
        currentRPM: {}
      };
    }
  });



  // function updateVoltageLabel() {
  //   const constantVoltage = 220;
  //   if (isPowerOn) {
  //     currentVoltage = constantVoltage;
  //   } else {
  //     currentVoltage = 0;
  //   }
  
  //   document.getElementById('voltageLabel').innerText = `${currentVoltage.toFixed(2)}V`;
  // }
  
  // function updateCurrentLabel() {
  //   const minCurrent = 0.6;
  //   const maxCurrent = 4.1;
  //   if (isPowerOn && motorToggle) {
  //     const torqueLoad = speedPercentage;
  //     const currentRange = maxCurrent - minCurrent;
  //     currentAmpere = minCurrent + (currentRange * (torqueLoad / 5.9));
  //     currentAmpere *= directionMultiplier; // Multiply current by direction multiplier
  //   } else {
  //     currentAmpere = 0;
  //   }
  //   document.getElementById('currentLabel').innerText = `${currentAmpere.toFixed(2)}A`;
  // }

  function updateVoltageLabel() {
    const minVoltage = 0;
    const maxVoltage = 415;
    currentVoltage = isPowerOn && motorToggle ? (minVoltage + (maxVoltage - minVoltage) * (speedPercentage2 / 50)) : 0;
    document.getElementById('voltageLabel').innerText = `${currentVoltage.toFixed(2)}V`;
  }

  function updateCurrentLabel() {
    document.getElementById('currentLabel').innerText = `${currentAmpere.toFixed(2)}A`;
  }

  function updateStats() {
    document.getElementById('knobPercentage').innerHTML = `${speedPercentage.toFixed(2)}N/m`;
  }

  function togglePower() {
    isPowerOn = !isPowerOn;
    powerButton.style.backgroundColor = isPowerOn ? 'red' : 'white';
    powerButton.style.color = isPowerOn ? 'white' : 'black';

    // Change the motor image based on power state
  const motorImage = document.getElementById('motor');
    if (motorImage) {
      motorImage.src = isPowerOn ? 'img/InductionMotor.jpg' : 'img/threePhase.jpeg';
    }
  
    if (isPowerOn) {
      speedPercentage = currentRotation;
      currentRotationSpeed = 0; // Reset to 0 when powering on
      animateTire();
      updateCharts(); // Plot the graphs when power is turned on
    } else {
      speedPercentage = 0;
      updateCharts(); // Clear the graphs when power is turned off
    }
    updateStats();
    updateVoltageLabel();
    updateCurrentLabel();
  }

  knob.addEventListener('mousedown', startDragging);
  knob2.addEventListener('mousedown', startDragging);
  
  function startDragging(event) {
    isDragging = true;
    startY = event.clientY;
    currentKnob = event.target;
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }

  document.addEventListener('mousemove', event => {
    if (isDragging) {
      const deltaY = startY - event.clientY;
      if (currentKnob === knob) {
        const sensitivity = 0.01;
        const newValue = speedPercentage + deltaY * sensitivity;
        updateKnob(newValue);
      } else if (currentKnob === knob2) {
        const sensitivity = 0.1;
        const newValue = speedPercentage2 + deltaY * sensitivity;
        updateKnob2(newValue);
      }
      startY = event.clientY;
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      currentKnob = null;
      document.body.style.userSelect = '';
      updateCharts();
    }
  });

  powerButton.addEventListener('click', togglePower);

  window.addEventListener('load', () => {
    currentRotation = 0; 
    speedPercentage = 0; 
    speedPercentage2 = 0;
    updateKnob2(speedPercentage2);
    updateKnob(currentRotation);
  });
  drawLines();
  updateStats();
  updateVoltageLabel();
});

window.addEventListener('resize', drawLines);