// Notyf is loaded via <script src="./shared/js/notyf.min.js"> in index.html
// Never use require() — this runs in a browser / Electron renderer context

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

// Double rAF: ensures browser has fully painted layout before
// getBoundingClientRect() is called — critical fix for Electron
function initWires() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            drawConnections();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initNotyf();
    initWires();
});

// Re-draw after all assets (images/videos) load — they can shift layout
window.addEventListener('load', () => {
    initWires();
});

window.addEventListener('resize', () => {
    drawConnections();
});

// ─────────────────────────────────────────────
// Play / stop video for a switch button
// ─────────────────────────────────────────────
function playVideo(videoId, nodeId, element) {
    const video  = document.getElementById(videoId);
    const button = document.querySelector(`#${nodeId}`).parentElement.querySelector('button');
    const isDisconnected = button && button.classList.contains('disconnected');

    if (isDisconnected) {
        notyf.error(`${nodeId} not connected!`);
        element.style.backgroundColor = '#4681f4';
        element.setAttribute('data-active', 'false');
        if (video.dataset.playing === 'true') {
            video.pause();
            video.currentTime = 0;
            video.style.borderColor = '#000';
            video.dataset.playing = 'false';
            video.onended = null;
        }
        return;
    }

    if (element.getAttribute('data-active') === 'true') {
        element.style.backgroundColor = '#4681f4';
        element.setAttribute('data-active', 'false');
        video.pause();
        video.currentTime = 0;
        video.style.borderColor = '#000';
        video.dataset.playing = 'false';
        video.onended = null;
        button.style.backgroundColor = '#5dbea3';
    } else {
        element.style.backgroundColor = '#5dbea3';
        element.setAttribute('data-active', 'true');
        video.style.borderColor = '#5dbea3';
        video.controls = false;
        video.play();
        video.dataset.playing = 'true';
        video.onended = () => {
            video.currentTime = 0;
            video.play();
        };
        button.style.backgroundColor = '#c7c9c8';
    }
}

// ─────────────────────────────────────────────
// Toggle a node connection on / off
// ─────────────────────────────────────────────
function toggleConnection(eventOrButton) {
    const button = eventOrButton instanceof Event
        ? eventOrButton.target
        : eventOrButton;

    const nodeId        = button.parentElement.querySelector('.node').id;
    const videoId       = getVideoIdForNode(nodeId);
    const video         = document.getElementById(videoId);
    const controlSwitch = document.querySelector(
        `[onclick="playVideo('${videoId}', '${nodeId}', this)"]`
    );

    const isDisconnecting = !button.classList.contains('disconnected');
    button.classList.toggle('disconnected');
    button.textContent = isDisconnecting ? 'Disconnected' : 'Connected';

    if (isDisconnecting) {
        button.style.backgroundColor = 'red';
        if (video && video.dataset.playing === 'true') {
            playVideo(videoId, nodeId, controlSwitch);
        }
        if (controlSwitch) {
            controlSwitch.style.backgroundColor = '#4681f4';
            controlSwitch.setAttribute('data-active', 'false');
        }
    } else {
        button.style.backgroundColor = '#5dbea3';
    }

    drawConnections();
}

// ─────────────────────────────────────────────
// Map node id → video id
// ─────────────────────────────────────────────
function getVideoIdForNode(nodeId) {
    switch (nodeId) {
        case 'node-1': return 'hornVideo';
        case 'node-2': return 'wiperVideo';
        case 'node-3': return 'fanVideo';
        case 'node-4': return 'indicatorVideo';
        default:       return null;
    }
}

// ─────────────────────────────────────────────
// Get CAN_H and CAN_L pin centre positions
// ─────────────────────────────────────────────
function getEndpoints(nodeId) {
    const node = document.querySelector(`#${nodeId}`);

    const canH     = node.querySelector('.node-end:first-child');
    const canHRect = canH.getBoundingClientRect();
    const canHX    = canHRect.left + canHRect.width  / 2;
    const canHY    = canHRect.bottom - canHRect.height / 4;

    const canL     = node.querySelector('.node-end:last-child');
    const canLRect = canL.getBoundingClientRect();
    const canLX    = canLRect.left + canLRect.width  / 2;
    const canLY    = canLRect.bottom - canLRect.height / 4;

    return {
        canH: { x: canHX, y: canHY },
        canL: { x: canLX, y: canLY }
    };
}

// ─────────────────────────────────────────────
// Draw all SVG wires
// ─────────────────────────────────────────────
function drawConnections() {
    const svg = document.getElementById('connections');
    const nodes = [
        getEndpoints('main-node'),
        getEndpoints('node-1'),
        getEndpoints('node-2'),
        getEndpoints('node-3'),
        getEndpoints('node-4')
    ];

    const rightColRect = document.querySelector('#app .top-row').getBoundingClientRect();
    const rowCenter    = rightColRect.bottom;
    const offsetY      = (rowCenter - nodes[1].canH.y) / 4;
    const sw           = 3;
    let lines          = '';

    // Find last connected node (1–4)
    let lastConnected = 0;
    for (let i = 4; i >= 1; i--) {
        const btn = document.querySelector(`#node-${i}`)?.parentElement?.querySelector('button');
        if (btn && !btn.classList.contains('disconnected')) {
            lastConnected = i;
            break;
        }
    }

    // Vertical drops + horizontal CAN bus lines
    for (let i = 0; i < nodes.length; i++) {
        const cur  = nodes[i];
        const next = nodes[i + 1];

        let disconnected = false;
        if (i > 0) {
            const btn = document.querySelector(`#node-${i}`)?.parentElement?.querySelector('button');
            disconnected = btn && btn.classList.contains('disconnected');
        }

        if (!disconnected || i === 0) {
            lines += `<line x1="${cur.canH.x}" y1="${cur.canH.y}" x2="${cur.canH.x}" y2="${rowCenter}" stroke="red" stroke-width="${sw}"/>`;
            lines += `<line x1="${cur.canL.x}" y1="${cur.canL.y}" x2="${cur.canL.x}" y2="${rowCenter - offsetY}" stroke="black" stroke-width="${sw}"/>`;
        }

        if (next && i < lastConnected) {
            lines += `<line x1="${cur.canH.x}" y1="${rowCenter}" x2="${next.canH.x}" y2="${rowCenter}" stroke="red" stroke-width="${sw}"/>`;
            lines += `<line x1="${cur.canL.x}" y1="${rowCenter - offsetY}" x2="${next.canL.x}" y2="${rowCenter - offsetY}" stroke="black" stroke-width="${sw}"/>`;
        }
    }

    // Node → video component wires
    for (let i = 1; i <= 4; i++) {
        const btn = document.querySelector(`#node-${i}`)?.parentElement?.querySelector('button');
        if (btn && !btn.classList.contains('disconnected')) {
            const node  = document.getElementById(`node-${i}`);
            const video = document.getElementById(getVideoIdForNode(`node-${i}`));
            if (node && video) {
                const nr = node.getBoundingClientRect();
                const vr = video.getBoundingClientRect();
                lines += `<line x1="${(nr.left + nr.right) / 2}" y1="${nr.top}" x2="${(vr.left + vr.right) / 2}" y2="${vr.bottom}" stroke="black" stroke-width="${sw}"/>`;
            }
        }
    }

    // Main node → switch container wire
    const mainNode        = document.getElementById('main-node');
    const switchContainer = document.querySelector('.switch-container');
    if (mainNode && switchContainer) {
        const mr = mainNode.getBoundingClientRect();
        const sr = switchContainer.getBoundingClientRect();
        lines += `<line x1="${(mr.left + mr.right) / 2}" y1="${mr.top}" x2="${(sr.left + sr.right) / 2}" y2="${sr.top + sr.height}" stroke="black" stroke-width="${sw}"/>`;
    }

    svg.innerHTML = lines;
}