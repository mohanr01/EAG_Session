let screenshot = null;
let isHighlighting = false;
let ctx = null;
let lastX, lastY;
let lastHighlight = null;
let selectedText = null;

document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  const saveBtn = document.getElementById('saveBtn');
  const canvas = document.getElementById('canvas');
  const colorPicker = document.getElementById('colorPicker');
  const brushSize = document.getElementById('brushSize');
  const editor = document.getElementById('editor');
  const status = document.getElementById('status');
  const textAnalysis = document.getElementById('textAnalysis');
  const highlightedText = document.getElementById('highlightedText');
  const textMeaning = document.getElementById('textMeaning');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const textAnalysisBtn = document.getElementById('textAnalysisBtn');

  ctx = canvas.getContext('2d');

  // Listen for text selection from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'textSelected') {
      selectedText = request.text;
      highlightedText.textContent = selectedText;
      textAnalysis.style.display = 'block';
      analyzeBtn.disabled = false;
      status.textContent = 'Text selected! Click "Analyze Text" to get meaning.';
    }
  });

  // Handle text input changes
  highlightedText.addEventListener('input', () => {
    selectedText = highlightedText.textContent.trim();
    analyzeBtn.disabled = !selectedText;
    if (selectedText) {
      status.textContent = 'Click "Analyze Text" to get meaning.';
    } else {
      status.textContent = 'Enter or type text to analyze.';
    }
  });

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

  function startHighlighting(x, y) {
    highlightedArea = {
      startX: x,
      startY: y,
      endX: x,
      endY: y
    };
  }

  function updateHighlighting(x, y) {
    if (highlightedArea) {
      highlightedArea.endX = x;
      highlightedArea.endY = y;
      drawHighlight(x, y);
    }
  }

  function endHighlighting() {
    if (highlightedArea) {
      // Show text analysis section
      textAnalysis.style.display = 'block';
      highlightedText.textContent = 'Text captured. Click "Analyze Text" to get meaning.';
      analyzeBtn.disabled = false;
    }
    highlightedArea = null;
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
    startHighlighting(lastX, lastY);
    drawHighlight(lastX, lastY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isHighlighting) return;
    const pos = getMousePos(canvas, e);
    const x = pos.x;
    const y = pos.y;
    
    updateHighlighting(x, y);
    [lastX, lastY] = [x, y];
  });

  canvas.addEventListener('mouseup', () => {
    isHighlighting = false;
    endHighlighting();
  });

  canvas.addEventListener('mouseout', () => {
    isHighlighting = false;
    endHighlighting();
  });

  saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'screenshot.png';
    link.href = canvas.toDataURL();
    link.click();
    status.textContent = 'Screenshot saved!';
  });
  
  textAnalysisBtn.addEventListener('click', () => {
    if (textAnalysis.style.display === 'none') {
      textAnalysis.style.display = 'block';
      textAnalysisBtn.textContent = 'Hide Analysis';
    } else {
      textAnalysis.style.display = 'none';
      textAnalysisBtn.textContent = 'Text Analysis';
    }
  });

  analyzeBtn.addEventListener('click', async () => {
    selectedText = highlightedText.textContent.trim();
    if (!selectedText) return;
    
    status.textContent = 'Analyzing text...';
    analyzeBtn.disabled = true;

    try {
      // Get meaning using Gemini API
      const meaning = await getTextMeaning(selectedText);
      textMeaning.textContent = meaning;
      status.textContent = 'Analysis complete!';
    } catch (error) {
      status.textContent = 'Error analyzing text';
      console.error('Error:', error);
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  async function getTextMeaning(text) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAZSRRf2Mg_zRNwtV6PMLmsO2fPdh9x9Ic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Explain the meaning of this text: "${text}"`
            }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      throw new Error('Failed to get text meaning');
    }
  }

  // Initialize brush cursor
  updateBrushCursor();
}); 