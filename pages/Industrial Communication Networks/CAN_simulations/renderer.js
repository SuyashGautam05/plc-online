// Notyf is loaded via <script src=".../notyf.min.js"> in index.html
// Never use require() here — this must also run safely if nodeIntegration is off

let notyf = null;

function initNotyf() {
    if (typeof Notyf !== 'undefined') {
        notyf = new Notyf({
            duration: 2500,
            position: { x: 'right', y: 'top' },
            ripple: true,
            dismissible: false
        });
    } else {
        notyf = {
            error:   (msg) => console.warn('[Error]', msg),
            success: (msg) => console.info('[Success]', msg)
        };
    }
}

// Double rAF: ensures the browser has fully painted layout before
// getBoundingClientRect() is called, so wires land in the right spot
function initWires() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            drawConnections();
        });
    });
}

function playVideo(videoId, nodeId, element) {
    var video = document.getElementById(videoId);
    var button = document.querySelector(`#${nodeId}`).parentElement.querySelector('button');
    var isDisconnected = button && button.classList.contains('disconnected');

    if (isDisconnected) {
        notyf.error(`${nodeId} not connected!`);
        element.style.backgroundColor = '#4681f4';
        element.setAttribute('data-active', 'false');
        if (video.dataset.playing === 'true') {
            video.pause();
            video.currentTime = 0;
            video.style.borderColor = "#000";
            video.dataset.playing = 'false';
            video.onended = null;
        }
        return;
    }

    if (element.getAttribute('data-active') === 'true') {
        element.style.backgroundColor = '#4681f4';
        element.setAttribute('data-active', 'false');
        // Stop the video
        video.pause();
        video.currentTime = 0;
        video.style.borderColor = "#000";
        video.dataset.playing = 'false';
        video.onended = null;
        button.style.backgroundColor = '#5dbea3';
    } else {
        element.style.backgroundColor = '#5dbea3';
        element.setAttribute('data-active', 'true');
        // Start the video
        video.style.borderColor = "#5dbea3";
        video.controls = false;
        video.play();
        video.dataset.playing = 'true';
        video.onended = function() {
            video.currentTime = 0;
            video.play();
        };
        button.style.backgroundColor = '#c7c9c8';
    }
}

function getEndpoints(nodeId) {
    const node = document.querySelector(`#${nodeId}`);
    
    const canH = node.querySelector('.node-end:first-child');
    const canHRect = canH.getBoundingClientRect();
    const canHX = canHRect.left + canHRect.width / 2;
    const canHY = canHRect.bottom - canHRect.height / 4;
  
    const canL = node.querySelector('.node-end:last-child');  
    const canLRect = canL.getBoundingClientRect();
    const canLX = canLRect.left + canLRect.width / 2;
    const canLY = canLRect.bottom - canLRect.height / 4;
  
    return {
      canH: { x: canHX, y: canHY },
      canL: { x: canLX, y: canLY }
    };
}

function toggleConnection(event) {
    const button = event.target;
    const nodeId = button.parentElement.querySelector('.node').id;
    const videoId = getVideoIdForNode(nodeId);
    const video = document.getElementById(videoId);
    const controlSwitch = document.querySelector(`[onclick="playVideo('${videoId}', '${nodeId}', this)"]`);

    const isDisconnecting = !button.classList.contains('disconnected');
    button.classList.toggle('disconnected');
    button.textContent = isDisconnecting ? 'Disconnected' : 'Connected';

    if (isDisconnecting) {
        button.style.backgroundColor = 'red';
        // Stop the video if it's playing and reset control switch
        if (video && video.dataset.playing === 'true') {
            playVideo(videoId, nodeId, controlSwitch);
        }
        // Reset control switch state
        controlSwitch.style.backgroundColor = '#4681f4';
        controlSwitch.setAttribute('data-active', 'false');
    } else {
        button.style.backgroundColor = '#c7c9c8';
    }

    drawConnections();
}

function getVideoIdForNode(nodeId) {
    switch (nodeId) {
        case 'node-1': return 'hornVideo';
        case 'node-2': return 'wiperVideo';
        case 'node-3': return 'fanVideo';
        case 'node-4': return 'indicatorVideo';
        default: return null;
    }
}

  
function drawConnections() {
    const svg = document.getElementById('connections');
    const nodes = [getEndpoints('main-node'), getEndpoints('node-1'), getEndpoints('node-2'), getEndpoints('node-3'), getEndpoints('node-4')];
    const rightColRect = document.querySelector('#app .top-row').getBoundingClientRect();
    const rowCenter = rightColRect.bottom;
    const offsetY = 1 * (rowCenter - nodes[1].canH.y) / 4;
    const strokeWidth = 3;
    let lines = '';
  
    // Node Connections
    let lastConnectedNode = nodes.length - 1;
    for (let i = nodes.length - 1; i >= 0; i--) {
        const button = document.querySelector(`#node-${i}`)?.parentElement?.querySelector('button');
        const isDisconnected = button && button.classList.contains('disconnected');
        if (!isDisconnected) {
            lastConnectedNode = i;
            break;
        }
    }
  
    for (let i = 0; i < nodes.length; i++) {
        const currentNode = nodes[i];
        const nextNode = nodes[(i + 1) % nodes.length];
    
        let isDisconnected = false;
        if (i > 0) {
            const button = document.querySelector(`#node-${i}`)?.parentElement?.querySelector('button');
            isDisconnected = button && button.classList.contains('disconnected');
        }
  
        // Vertical lines
        if (!isDisconnected || i === 0) {
            lines += `
                <line x1="${currentNode.canH.x}" y1="${currentNode.canH.y}" x2="${currentNode.canH.x}" y2="${rowCenter}" stroke="red" stroke-width="${strokeWidth}" />        
                <line x1="${currentNode.canL.x}" y1="${currentNode.canL.y}" x2="${currentNode.canL.x}" y2="${rowCenter - offsetY}" stroke="blue" stroke-width="${strokeWidth}" />
            `;  
        }
  
        // Horizontal connection line
        if (i < lastConnectedNode) {
            lines += `
                <line x1="${currentNode.canH.x}" y1="${rowCenter}" x2="${nextNode.canH.x}" y2="${rowCenter}" stroke="red" stroke-width="${strokeWidth}" />
                <line x1="${currentNode.canL.x}" y1="${rowCenter - offsetY - 25}" x2="${nextNode.canL.x}" y2="${rowCenter - offsetY}" stroke="blue" stroke-width="${strokeWidth}" />
            `;
        }
    }

    for (let i = 1; i <= 4; i++) {
        const button = document.querySelector(`#node-${i}`)?.parentElement?.querySelector('button');
        const isConnected = button && !button.classList.contains('disconnected');
        if (isConnected) {
            const node = document.getElementById(`node-${i}`);
            const video = document.getElementById(getVideoIdForNode(`node-${i}`));
            if (node && video) {
                const nodeRect = node.getBoundingClientRect();
                const videoRect = video.getBoundingClientRect();
                console.log(videoRect);
                lines += `
                    <line x1="${(nodeRect.left + nodeRect.right) / 2}" y1="${nodeRect.top}" 
                          x2="${(videoRect.left + videoRect.right) / 2}" y2="${videoRect.bottom}" 
                          stroke="black" stroke-width="${strokeWidth}" />
                `;
            }
        }
    }

    // Connect MAIN NODE to User Control Switches
    const mainNode = document.getElementById('main-node');
    const switchContainer = document.querySelector('.switch-container');
    if (mainNode && switchContainer) {
        const mainNodeRect = mainNode.getBoundingClientRect();
        const switchContainerRect = switchContainer.getBoundingClientRect();
        lines += `
            <line x1="${(mainNodeRect.left + mainNodeRect.right)/2}" y1="${mainNodeRect.top}" 
                  x2="${(switchContainerRect.left + switchContainerRect.right)/2}" y2="${switchContainerRect.top + switchContainerRect.height}" 
                  stroke="black" stroke-width="${strokeWidth}" />
        `;
    }

    svg.innerHTML = lines;
}
  

document.addEventListener('DOMContentLoaded', () => {
    initNotyf();
    initWires();
});

// Re-draw after all assets (images/videos) load — they can shift layout
window.addEventListener('load', () => {
    initWires();
});

window.addEventListener('resize', function() {
    drawConnections();
});

// Add event listeners for connection toggle buttons
document.querySelectorAll('.toggle-connection').forEach(button => {
    button.addEventListener('click', toggleConnection);
});