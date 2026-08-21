let comparatorData = [];
let comparatorData2 = [];
let comparatorData3 = [];
let voltageData = [];
let currentData = [];
let powerData = [];
let timeData = [];
let voltageChart;
let currentVoltage = 0;
let currentAmpere = 0;
let speedPercentage  = 50;
let currentRotationSpeed = 0;
const maxRotationSpeed = 2600;
const acceleration = 7;
const decelerationRate = 7;
let animationFrameId = null
let toggleRotation = 0;
let dirToggleRotation = 0;
let motorToggle = true;
let directionToggle = true;
let directionMultiplier = 1;
let smoothedRpm = 0;

function drawLines() {
  let powerButton = document.getElementById('powerButton').getBoundingClientRect();
  let smps =  document.getElementById('speedControl').getBoundingClientRect();

  var powerXL = powerButton.left + window.scrollX;
  var powerY = powerButton.top + window.scrollY;
  var powerXR = powerButton.right + window.scrollX;

  var smpsPositionXL = smps.left + window.scrollX + 50;
  var smpsPositionY = smps.top + window.scrollY + 100;
  var smpsPositionXR = smps.right + window.scrollX - 50;

  document.getElementById('neutralCircle').setAttribute('cx', powerXL);
  document.getElementById('neutralCircle').setAttribute('cy', powerY - 60);

  document.getElementById('liveCircle').setAttribute('cx', powerXR);
  document.getElementById('liveCircle').setAttribute('cy', powerY - 60);

  document.getElementById('mainLine1').setAttribute('x1', powerXL);
  document.getElementById('mainLine1').setAttribute('y1', powerY);
  document.getElementById('mainLine1').setAttribute('x2', powerXL);
  document.getElementById('mainLine1').setAttribute('y2', powerY - 53.5);

  document.getElementById('mainLine2').setAttribute('x1', powerXR);
  document.getElementById('mainLine2').setAttribute('y1', powerY);
  document.getElementById('mainLine2').setAttribute('x2', powerXR);
  document.getElementById('mainLine2').setAttribute('y2', powerY - 53.5);
  

  document.getElementById('smpsLine1').setAttribute('x1', smpsPositionXL);
  document.getElementById('smpsLine1').setAttribute('y1', powerY);
  document.getElementById('smpsLine1').setAttribute('x2', smpsPositionXL);
  document.getElementById('smpsLine1').setAttribute('y2', smpsPositionY);

  document.getElementById('smpsLine2').setAttribute('x1', smpsPositionXR);
  document.getElementById('smpsLine2').setAttribute('y1', powerY);
  document.getElementById('smpsLine2').setAttribute('x2', smpsPositionXR);
  document.getElementById('smpsLine2').setAttribute('y2', smpsPositionY);

  document.getElementById('main-smpsN').setAttribute('x', powerXL - 5);
  document.getElementById('main-smpsN').setAttribute('y', powerY - 75);

  document.getElementById('main-smpsL').setAttribute('x', powerXR - 5);
  document.getElementById('main-smpsL').setAttribute('y', powerY - 75);

}

document.addEventListener('DOMContentLoaded', () => {
  const powerButton = document.getElementById('powerButton');

  let isPowerOn = false;
  const knob = document.getElementById('knob');
  let isDragging = false;
  let startY = 0;
  let tireRotation = 0;
  let currentRotation = 0;
  const tire = document.getElementById('tire');
  const toggle = document.getElementById('toggle');
  const dirToggle = document.getElementById('toggle1');
  const pwmContainers = [
    document.getElementById('pwm-chart-container1'),
    document.getElementById('pwm-chart-container2'),
    document.getElementById('pwm-chart-container3')
];
const otherContainers = [
    document.getElementById('voltage-chart-container'),
    document.getElementById('current-chart-container'),
    document.getElementById('power-chart-container')
];

pwmContainers.forEach(container => {
    container.style.display = 'none'; 
});
otherContainers.forEach(container => {
    container.style.display = 'block';
});

  function calculateComparatorOutput(knobPercentage) {
    comparatorData = [];
    comparatorData2 = [];
    comparatorData3 = [];
    let transitionPoint = Math.PI * (knobPercentage / 100);

    for (let i = 0; i <= 7 * Math.PI; i += Math.PI / 20) {
        let cyclePosition = i % (2 * Math.PI);
        let stepValue = cyclePosition < transitionPoint ? 1 : 0;
        comparatorData.push(stepValue);

        // Phase shift by 2pi/3
        let phaseShiftedPosition2 = (i + 2 * Math.PI / 3) % (2 * Math.PI);
        let stepValue2 = phaseShiftedPosition2 < transitionPoint ? 1 : 0;
        comparatorData2.push(stepValue2);

        // Phase shift by 4pi/3
        let phaseShiftedPosition3 = (i + 4 * Math.PI / 3) % (2 * Math.PI);
        let stepValue3 = phaseShiftedPosition3 < transitionPoint ? 1 : 0;
        comparatorData3.push(stepValue3);
    }
}


  function getRotationDegrees(yMove) {
    const degreesPerPixel = 180 / 100;
    return yMove * degreesPerPixel;
  }

  function calculateRPM(knobPercentage) {
    return knobPercentage * maxRotationSpeed / 100;
  }

  function animateTire(timestamp) {
    let shouldAnimate = isPowerOn && motorToggle;
    const degreesPerRPM = 6;
  
    if (shouldAnimate) {
      let targetRotationSpeed = calculateRPM(speedPercentage);
  
      if (currentRotationSpeed < targetRotationSpeed) {
        currentRotationSpeed += acceleration;
      } else if (currentRotationSpeed > targetRotationSpeed) {
        currentRotationSpeed -= decelerationRate;
      }
    } else {
      if (currentRotationSpeed !== 0) {
        const step = decelerationRate * Math.sign(currentRotationSpeed);
        currentRotationSpeed -= step;
        // Clamp to 0 if we've overshot or are within one step
        if (Math.abs(currentRotationSpeed) < decelerationRate) {
          currentRotationSpeed = 0;
        }
      }
    }
    const degreesPerFrame = currentRotationSpeed * degreesPerRPM / 60 * directionMultiplier;
    tireRotation += degreesPerFrame;
    tire.style.transform = `rotate(${tireRotation}deg)`;

    if (currentRotationSpeed !== 0 || shouldAnimate) {
      animationFrameId = requestAnimationFrame(animateTire);
    } else {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      smoothedRpm = 0; // Ensure smoothedRpm fully resets to 0
    }
    smoothedRpm = smoothedRpm * 0.9 + currentRotationSpeed * 0.1;
  
    updateStats();
    updateVoltageLabel();
    updateCurrentLabel();
  }
  

  
  function updateVoltageLabel() {
    const maxVoltage = 24.2; 
    if (isPowerOn && motorToggle) {
      currentVoltage = (speedPercentage / 100) * maxVoltage * directionMultiplier;
    } else if (!motorToggle){
      currentVoltage = (currentRotationSpeed / maxRotationSpeed) * maxVoltage * directionMultiplier;
    } else {
      currentVoltage = 0;
    }
  
    document.getElementById('voltageLabel').innerText = `${currentVoltage.toFixed(2)}V`;
  }
  function updateCurrentLabel() {
    const maxCurrent = 1.5;
    if (isPowerOn && motorToggle) {
      currentAmpere = (speedPercentage / 100) * maxCurrent * directionMultiplier;
    } else if (!motorToggle){
      currentAmpere = (currentRotationSpeed / maxRotationSpeed) * maxCurrent * directionMultiplier;
    } else {
      currentAmpere = 0;
    }
    document.getElementById('currentLabel').innerText = `${currentAmpere.toFixed(2)}A`;
  }

  function updateKnob(value) {
    value = Math.max(-90, Math.min(90, value));
    knob.style.transform = `rotate(${value}deg)`;
    speedPercentage = (value + 90) / 180 * 100 * directionMultiplier;
    console.log(`Knob value: ${speedPercentage.toFixed(2)}%`);
    updateStats();
    updateVoltageLabel();

    calculateComparatorOutput(speedPercentage);
    comparatorChart.data.datasets[0].data = comparatorData;
    comparatorChart.update();

    comparatorChart2.data.datasets[0].data = comparatorData2;
    comparatorChart2.update();

    comparatorChart3.data.datasets[0].data = comparatorData3;
    comparatorChart3.update();
  }

  // function updateStats(){
  //   document.getElementById('knobPercentage').innerHTML = `${speedPercentage.toFixed(2)}%`;
  //   document.getElementById('rpm').innerHTML = `${currentRotationSpeed.toFixed()}RPM`;
  // }

  function updateStats(){
    document.getElementById('knobPercentage').innerHTML = `${speedPercentage.toFixed(2)}%`;
    document.getElementById('rpm').innerHTML = `${smoothedRpm.toFixed(0)}RPM`;
  }

  function togglePower() {
    isPowerOn = !isPowerOn;
    powerButton.style.backgroundColor = isPowerOn ? 'red' : 'white';
    powerButton.style.color = isPowerOn ? 'white' : 'black';
  
    if (isPowerOn) {
      const knobValue = (currentRotation + 90) / 180;
      speedPercentage = knobValue * 100;
  
      animateTire();
    } else {
      speedPercentage = 0;
    }
    updateStats();
    updateVoltageLabel();
    updateCurrentLabel();
  }

  toggle.addEventListener('click', () => {
    toggleRotation = toggleRotation === 0 ? -180 : 0;
    motorToggle = toggleRotation === 0;
  
    toggle.style.transform = `rotate(${toggleRotation}deg)`;
    console.log(motorToggle);
    if (motorToggle && isPowerOn) {
      const knobValue = (currentRotation + 90) / 180;
      speedPercentage = knobValue * 100;
      animateTire();
    } else {
      speedPercentage = 0;
    }
  });

  dirToggle.addEventListener('click', () => {
    pendingDirectionChange = true;
    directionToggle = !directionToggle;
    dirToggleRotation = directionToggle ? 0 : -180;
    dirToggle.style.transform = `rotate(${dirToggleRotation}deg)`;
    directionMultiplier *= 1;
    speedPercentage *= -1;
  });
  document.getElementById('graphSwitch').addEventListener('click', () => {
    // Check if PWM charts are currently hidden
    const isPwmHidden = pwmContainers.some(container => container.style.display === 'none');

    // Toggle display
    pwmContainers.forEach(container => {
        container.style.display = isPwmHidden ? 'block' : 'none';
    });
    otherContainers.forEach(container => {
        container.style.display = isPwmHidden ? 'none' : 'block';
    });
  });

  knob.addEventListener('mousedown', event => {
    isDragging = true;
    startY = event.clientY;
    document.body.style.userSelect = 'none';
    event.preventDefault();
  });

  document.addEventListener('mousemove', event => {
    if (isDragging) {
      const deltaY = event.clientY - startY;
      const newRotation = currentRotation - getRotationDegrees(deltaY);
      updateKnob(newRotation);
    }
  });

  document.addEventListener('mouseup', event => {
    if (isDragging) {
      const deltaY = event.clientY - startY;
      currentRotation -= getRotationDegrees(deltaY);
      currentRotation = Math.max(-90, Math.min(90, currentRotation));
      updateKnob(currentRotation);
      isDragging = false;
      document.body.style.userSelect = '';
    }
  });

  calculateComparatorOutput(50);

  

  const annotations = [];
  for (let i = 1; i <= 7; i++) {
    annotations.push({
      drawTime: "afterDatasetsDraw",
      type: 'line',
      mode: 'vertical',
      scaleID: 'x', // You may need to adjust this based on your chart's config
      value: i *12.5 * Math.PI, // Set the value at multiples of π
      borderColor: 'red',
      borderWidth: 0.5,
      label: {
        enabled: true,
        content: `${i}π`,
        position: 'top'
      }
    });
  }
  const comparatorOptions = {
    scales: {
      y: {
        min: 0, // Set minimum to 0
        max: 1   // Set maximum to 1
      }
    },
    plugins: {
      annotation: {
        annotations: annotations
      }
    },
    maintainAspectRatio: false
  };
  // Add these annotations to your chart's options
  comparatorOptions.plugins.annotation.annotations = annotations;

  const comparatorCtx = document.getElementById('comparatorChart1').getContext('2d');
  comparatorChart = new Chart(comparatorCtx, {
    type: 'line',
    data: {
      labels: comparatorData.map((_, index) => index), // Creating an array of indices for labels
      datasets: [{
        label: 'PWM 1',
        data: comparatorData,
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }]
    },
    options: comparatorOptions
  });

  const comparatorCtx2 = document.getElementById('comparatorChart2').getContext('2d');
  comparatorChart2 = new Chart(comparatorCtx2, {
    type: 'line',
    data: {
      labels: comparatorData2.map((_, index) => index), // Creating an array of indices for labels
      datasets: [{
        label: 'PWM 2',
        data: comparatorData2,
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }]
    },
    options: comparatorOptions
  });

  const comparatorCtx3 = document.getElementById('comparatorChart3').getContext('2d');
  comparatorChart3 = new Chart(comparatorCtx3, {
    type: 'line',
    data: {
      labels: comparatorData3.map((_, index) => index), // Creating an array of indices for labels
      datasets: [{
        label: 'PWM 3',
        data: comparatorData3,
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }]
    },
    options: comparatorOptions
  });
  const voltageCtx = document.getElementById('voltageChart').getContext('2d');
  voltageChart = new Chart(voltageCtx, {
    type: 'line',
    data: {
      labels: timeData,
      datasets: [{
        label: 'Voltage',
        data: voltageData,
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        xAxes: [{
          type: 'realtime',
          realtime: {
            duration: 20000,
            refresh: 1000,
          }
        }],
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      },
      maintainAspectRatio: false
    }
  });

  const currentCtx = document.getElementById('currentChart').getContext('2d');
  currentChart = new Chart(currentCtx, {
    type: 'line',
    data: {
      labels: timeData,
      datasets: [{
        label: 'Current',
        data: currentData,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        xAxes: [{
          type: 'realtime',
          realtime: {
            duration: 20000,
            refresh: 1000,
          }
        }],
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      },
      maintainAspectRatio: false
    }
  });

  const powerCtx = document.getElementById('powerChart').getContext('2d');
  powerChart = new Chart(powerCtx, {
    type: 'line',
    data: {
      labels: timeData,
      datasets: [{
        label: 'Power',
        data: powerData,
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        xAxes: [{
          type: 'realtime',
          realtime: {
            duration: 20000,
            refresh: 1000,
          }
        }],
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      },
      maintainAspectRatio: false
    }
  });

  setInterval(() => {
    const now = new Date().toLocaleTimeString();

    if (timeData.length > 30) {
      timeData.shift();
      voltageData.shift();
      currentData.shift();
      powerData.shift();
    }

    timeData.push(now);
    voltageData.push(currentVoltage * directionMultiplier);
    currentData.push(currentAmpere * directionMultiplier);
    powerData.push(currentAmpere * currentVoltage * directionMultiplier);

    voltageChart.update();
    currentChart.update();
    powerChart.update();
  }, 500);

  powerButton.addEventListener('click', togglePower);
  window.addEventListener('load', () => {
    currentRotation = 0; 
    speedPercentage = 50; 
    updateKnob(currentRotation);
  });
  drawLines();
  updateStats();
  updateVoltageLabel();
});

window.addEventListener('resize', drawLines);