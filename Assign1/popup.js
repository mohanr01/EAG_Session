let screenshot = null;
let isHighlighting = false;
let ctx = null;
let lastX, lastY;
let lastHighlight = null;

document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  const saveBtn = document.getElementById('saveBtn');
  const canvas = document.getElementById('canvas');
  const colorPicker = document.getElementById('colorPicker');
  const brushSize = document.getElementById('brushSize');
  const editor = document.getElementById('editor');
  const status = document.getElementById('status');

  ctx = canvas.getContext('2d');

  // Get mouse position relative to canvas
  function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    };
  }

  // Create brush cursor
  function updateBrushCursor() {
    const size = brushSize.value;
    const color = colorPicker.value + '60';
    const cursorCanvas = document.createElement('canvas');
    cursorCanvas.width = size;
    cursorCanvas.height = size;
    const cursorCtx = cursorCanvas.getContext('2d');
    
    // Create a circular cursor
    cursorCtx.beginPath();
    cursorCtx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    cursorCtx.strokeStyle = color;
    cursorCtx.lineWidth = 1;
    cursorCtx.stroke();
    
    const dataURL = cursorCanvas.toDataURL();
    canvas.style.cursor = `url(${dataURL}) ${size/2} ${size/2}, crosshair`;
  }

  function drawHighlight(x, y) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.45;
    
    ctx.beginPath();
    ctx.arc(x, y, brushSize.value/1.5, 0, Math.PI * 2);
    ctx.fillStyle = colorPicker.value;
    ctx.fill();
    
    ctx.restore();
  }

  // Update cursor when color or size changes
  colorPicker.addEventListener('input', updateBrushCursor);
  brushSize.addEventListener('input', updateBrushCursor);

  captureBtn.addEventListener('click', async () => {
    status.textContent = 'Capturing screenshot...';
    try {
      const response = await chrome.runtime.sendMessage({ action: 'captureScreen' });
      screenshot = new Image();
      screenshot.onload = () => {
        canvas.width = screenshot.width;
        canvas.height = screenshot.height;
        ctx.drawImage(screenshot, 0, 0);
        editor.style.display = 'block';
        saveBtn.disabled = false;
        status.textContent = 'Screenshot captured! Start highlighting...';
        updateBrushCursor();
        canvas.style.cursor = 'none';
      };
      screenshot.src = response.dataUrl;
    } catch (error) {
      status.textContent = 'Error capturing screenshot';
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    isHighlighting = true;
    const pos = getMousePos(canvas, e);
    [lastX, lastY] = [pos.x, pos.y];
    drawHighlight(lastX, lastY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isHighlighting) return;
    const pos = getMousePos(canvas, e);
    const x = pos.x;
    const y = pos.y;
    
    // Draw highlight at current position
    drawHighlight(x, y);
    
    // Update last position
    [lastX, lastY] = [x, y];
  });

  canvas.addEventListener('mouseup', () => {
    isHighlighting = false;
  });

  canvas.addEventListener('mouseout', () => {
    isHighlighting = false;
  });

  saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'screenshot.png';
    link.href = canvas.toDataURL();
    link.click();
    status.textContent = 'Screenshot saved!';
  });

  // Initialize brush cursor
  updateBrushCursor();
}); 