const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let currentShape = 'rectangle';
let startX, startY, isDrawing = false;
let shapes = [];
let undoStack = [];
let redoStack = [];
let eraserSize = 10;
let measureStartX, measureStartY, isMeasuring = false;
const SCALE = 60; // Fixed scale: 60 pixels per meter

function setShape(shape) {
    currentShape = shape;
    if (shape !== 'measure') {
        isMeasuring = false;
    }
}

function updateEraserSize(size) {
    eraserSize = size;
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes = [];
    undoStack = [];
    redoStack = [];
    sessionStorage.removeItem('shapes');
}

function saveShapes() {
    sessionStorage.setItem('shapes', JSON.stringify(shapes));
    console.log('Shapes saved:', shapes);
}

function loadShapes() {
    const savedShapes = sessionStorage.getItem('shapes');
    if (savedShapes) {
        shapes = JSON.parse(savedShapes);
        console.log('Shapes loaded:', shapes);
        redrawShapes();
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e.touches[0]);
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e.touches[0]);
});
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing(e.changedTouches[0]);
});

function getPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function startDrawing(event) {
    const pos = getPosition(event);
    startX = pos.x;
    startY = pos.y;
    isDrawing = true;

    if (currentShape === 'erase') {
        erase(startX, startY);
    } else if (currentShape === 'measure') {
        if (!isMeasuring) {
            measureStartX = startX;
            measureStartY = startY;
            isMeasuring = true;
        } else {
            let measurementInput = parseFloat(document.getElementById('measurementInput').value);
            if (isNaN(measurementInput)) {
                measurementInput = null; // No predefined measurement, use manual measurement
            }
            const direction = document.getElementById('directionInput').value;

            let measureEndX = measureStartX;
            let measureEndY = measureStartY;

            if (measurementInput !== null) {
                let distancePx = measurementInput * SCALE;

                if (direction === 'horizontal-right') {
                    measureEndX += distancePx;
                } else if (direction === 'horizontal-left') {
                    measureEndX -= distancePx;
                } else if (direction === 'vertical-up') {
                    measureEndY -= distancePx;
                } else if (direction === 'vertical-down') {
                    measureEndY += distancePx;
                }
            } else {
                // Manual measurement using mouse coordinates
                measureEndX = startX;
                measureEndY = startY;
            }

            shapes.push({ type: 'measure', startX: measureStartX, startY: measureStartY, endX: measureEndX, endY: measureEndY, distance: measurementInput });
            saveShapes();
            redrawShapes();
            isMeasuring = false;
        }
    }
}

function draw(event) {
    if (!isDrawing) return;

    const pos = getPosition(event);

    if (currentShape === 'erase') {
        erase(pos.x, pos.y);
    } else if (currentShape !== 'measure') {
        redrawShapes();
        drawShape(startX, startY, pos.x, pos.y, false);
    } else if (currentShape === 'measure' && isMeasuring) {
        redrawShapes();
        drawTemporaryMeasure(startX, startY, pos.x, pos.y);
    }
}

function stopDrawing(event) {
    if (!isDrawing || (currentShape === 'erase' && isDrawing)) {
        isDrawing = false;
        return;
    }

    const pos = getPosition(event);
    isDrawing = false;
    shapes.push({ type: currentShape, startX, startY, endX: pos.x, endY: pos.y });
    undoStack.push(JSON.parse(JSON.stringify(shapes))); // Push current state to undo stack
    redoStack = []; // Clear redo stack
    redrawShapes(); // Redraw shapes after adding the new shape
    saveShapes();
}

function drawShape(x1, y1, x2, y2, isPermanent) {
    ctx.lineWidth = 2; // Set the line width to 2px
    ctx.beginPath();
    switch (currentShape) {
        case 'rectangle':
        case 'square':
        case 'triangle':
        case 'line':
            ctx.strokeStyle = 'blue';
            break;
        default:
            ctx.strokeStyle = 'black';
            break;
    }
    switch (currentShape) {
        case 'rectangle':
            drawRectangle(x1, y1, x2 - x1, y2 - y1);
            break;
        case 'square':
            drawSquare(x1, y1, Math.min(x2 - x1, y2 - y1));
            break;
        case 'triangle':
            drawTriangle(x1, y1, x2, y2);
            break;
        case 'circle':
            drawCircle(x1, y1, Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)));
            break;
        case 'semiCircle':
            drawSemiCircle(x1, y1, x2, y2);
            break;
        case 'line':
            drawLine(x1, y1, x2, y2); // Corrected line case
            break;
        case 'measure':
            drawMeasure(x1, y1, x2, y2);
            break;
    }
    if (!isPermanent) {
        ctx.stroke();
    }
}

function drawLine(x1, y1, x2, y2) {
    ctx.moveTo(x1, y1); // Start the line at (x1, y1)
    ctx.lineTo(x2, y2); // Draw the line to (x2, y2)
}

function drawRectangle(x, y, width, height) {
    ctx.rect(x, y, width, height);
}

function drawSquare(x, y, size) {
    ctx.rect(x, y, size, size);
}

function drawTriangle(x1, y1, x2, y2) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1, y2);
    ctx.lineTo(x2, y2);
    ctx.closePath();
}

function drawCircle(x, y, radius) {
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
}

function drawSemiCircle(x1, y1, x2, y2) {
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.arc(x1, y1, radius, angle, angle + Math.PI);
}

function drawMeasure(x1, y1, x2, y2) {
    ctx.lineWidth = 2; // Ensure the line width is 2px
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    const distancePx = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    let distanceM = (distancePx / SCALE).toFixed(2);
    if (isNaN(distanceM) || distanceM == 0) {
        distanceM = '0';
    }
    ctx.fillText(`${distanceM}m`, (x1 + x2) / 2, (y1 + y2) / 2);

    // Draw measurement points
    ctx.beginPath();
    ctx.arc(x1, y1, 3, 0, 2 * Math.PI);
    ctx.arc(x2, y2, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
}

function drawTemporaryMeasure(x1, y1, x2, y2) {
    drawMeasure(x1, y1, x2, y2);
}

function redrawShapes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach(shape => {
        ctx.lineWidth = 2; // Set the line width to 2px for redrawn shapes
        ctx.beginPath();
        if (shape.type === 'erase') {
            ctx.fillStyle = 'white';
            ctx.fillRect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size);
        } else {
            ctx.strokeStyle = shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'triangle' || shape.type === 'line' ? 'blue' : 'black';
            switch (shape.type) {
                case 'rectangle':
                    drawRectangle(shape.startX, shape.startY, shape.endX - shape.startX, shape.endY - shape.startY);
                    break;
                case 'square':
                    drawSquare(shape.startX, shape.startY, Math.min(shape.endX - shape.startX, shape.endY - shape.startY));
                    break;
                case 'triangle':
                    drawTriangle(shape.startX, shape.startY, shape.endX, shape.endY);
                    break;
                case 'circle':
                    drawCircle(shape.startX, shape.startY, Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2)));
                    break;
                case 'semiCircle':
                    drawSemiCircle(shape.startX, shape.startY, shape.endX, shape.endY);
                    break;
                case 'line':
                    drawLine(shape.startX, shape.startY, shape.endX, shape.endY);
                    break;
                case 'measure':
                    drawMeasure(shape.startX, shape.startY, shape.endX, shape.endY);
                    break;
            }
            ctx.stroke();
        }
    });
    saveShapes(); // Save shapes after redrawing
}

function erase(x, y) {
    shapes.push({ type: 'erase', x, y, size: eraserSize });
    undoStack.push(JSON.parse(JSON.stringify(shapes))); // Push current state to undo stack
    redoStack = []; // Clear redo stack
    ctx.fillStyle = 'white';
    ctx.fillRect(x - eraserSize / 2, y - eraserSize / 2, eraserSize, eraserSize);
    saveShapes();
}

function undo() {
    if (undoStack.length > 0) {
        redoStack.push(JSON.parse(JSON.stringify(shapes))); // Save current state to redo stack
        shapes = undoStack.pop();
        sessionStorage.setItem('shapes', JSON.stringify(shapes));
        redrawShapes();
    }
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push(JSON.parse(JSON.stringify(shapes))); // Save current state to undo stack
        shapes = redoStack.pop();
        sessionStorage.setItem('shapes', JSON.stringify(shapes));
        redrawShapes();
    }
}

function saveDrawing() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Set the background color to white
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the shapes on the temporary canvas
    shapes.forEach(shape => {
        tempCtx.lineWidth = 2; // Ensure the line width is 2px in the saved image
        tempCtx.beginPath();
        if (shape.type === 'erase') {
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size);
        } else {
            tempCtx.strokeStyle = shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'triangle' || shape.type === 'line' ? 'blue' : 'black';
            switch (shape.type) {
                case 'rectangle':
                    tempCtx.rect(shape.startX, shape.startY, shape.endX - shape.startX, shape.endY - shape.startY);
                    break;
                case 'square':
                    tempCtx.rect(shape.startX, shape.startY, Math.min(shape.endX - shape.startX, shape.endY - shape.startY));
                    break;
                case 'triangle':
                    tempCtx.moveTo(shape.startX, shape.startY);
                    tempCtx.lineTo(shape.startX, shape.endY);
                    tempCtx.lineTo(shape.endX, shape.endY);
                    tempCtx.closePath();
                    break;
                case 'circle':
                    tempCtx.arc(shape.startX, shape.startY, Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2)), 0, 2 * Math.PI);
                    break;
                case 'semiCircle':
                    const radius = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2));
                    const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);
                    tempCtx.arc(shape.startX, shape.startY, radius, angle, angle + Math.PI);
                    break;
                case 'line':
                    tempCtx.moveTo(shape.startX, shape.startY);
                    tempCtx.lineTo(shape.endX, shape.endY);
                    break;
                case 'measure':
                    tempCtx.moveTo(shape.startX, shape.startY);
                    tempCtx.lineTo(shape.endX, shape.endY);
                    tempCtx.stroke();
                    tempCtx.font = '12px Arial';
                    tempCtx.fillStyle = 'black';
                    let distanceM = shape.distance;
                    if (distanceM === null) {
                        const distancePx = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2));
                        distanceM = (distancePx / SCALE).toFixed(2);
                    }
                    if (!distanceM || distanceM === "NaN") {
                        distanceM = '0';
                    }
                    tempCtx.fillText(`${distanceM}m`, (shape.startX + shape.endX) / 2, (shape.startY + shape.endY) / 2);

                    // Draw measurement points
                    tempCtx.beginPath();
                    tempCtx.arc(shape.startX, shape.startY, 3, 0, 2 * Math.PI);
                    tempCtx.arc(shape.endX, shape.endY, 3, 0, 2 * Math.PI);
                    tempCtx.fillStyle = 'red';
                    tempCtx.fill();
                    break;
            }
            tempCtx.stroke();
        }
    });

    // Convert the temporary canvas to an image
    const dataURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'drawing.png';
    link.click();
}

window.onload = () => {
    loadShapes();
    resizeCanvas();
};

window.onresize = resizeCanvas;

function resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    redrawShapes();
}
