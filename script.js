/* ============================================
   SETTINGS AND CONFIGURATION
   ============================================ */

// Google Sheets CSV URL - Replace with your actual Google Sheets CSV export URL
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRrQmSEotq71FqYpE7oxahUwUt4OV_fouWiz33QKJPUECgZC_h_LT033MZ7I3_8ipYpIt3d3vlzStxS/pub?gid=0&single=true&output=csv";

// CORS Proxy - Set to empty string "" if you don't need a proxy (e.g., if hosting server-side)
// Common options: "https://api.allorigins.win/raw?url=" or "https://corsproxy.io/?"
// Try multiple proxies as fallback
const corsProxies = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?",
    "https://api.codetabs.com/v1/proxy?quest="
];
let currentProxyIndex = 0;

// Reload Settings
const reloadInterval = 3600000; // 300 seconds in milliseconds

// Scroll Settings
const scrollSpeed = 12; // seconds for full scroll animation
const scrollDelay = 2; // seconds to wait before restarting scroll

// Row Colors
const rowCol = "#00000050"; // Primary row color
const rowAlt = "#0000002c"; // Alternating row color

// Table Header Styles
const tableHeaderFont = "Arial, sans-serif";
const tableHeaderSize = "3.1em";
const tableHeaderColor = "#000";

// Table Content Styles
const tableContentFont = "Arial, sans-serif";
const tableContentSize = "2.7em";
const tableContentColor = "#000000";

// Column Widths (0-11 for 12 columns max)
const columnWidths = [
    "300px", // column0Width
    "280px", // column1Width
    "150px", // column2Width
    "360px", // column3Width
    "150px", // column4Width
    "360px", // column5Width
    "150px", // column6Width
    "150px", // column7Width
    "150px", // column8Width
    "150px", // column9Width
    "150px", // column10Width
    "150px"  // column11Width
];

// Text Alignment per Column (left, center, right)
const columnAlignments = [
    "center",   // column0Align
    "center",   // column1Align
    "center", // column2Align
    "center", // column3Align
    "center",  // column4Align
    "center",   // column5Align
    "center",   // column6Align
    "center", // column7Align
    "center", // column8Align
    "center",  // column9Align
    "center",   // column10Align
    "center"    // column11Align
];

/* ============================================
   GLOBAL VARIABLES
   ============================================ */

let tableData = [];
let scrollAnimation = null;
let scrollTimeout = null;

/* ============================================
   CSV PARSING FUNCTION
   ============================================ */

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const rows = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        rows.push(values);
    }
    
    return rows;
}

/* ============================================
   TABLE RENDERING FUNCTION
   ============================================ */

function renderTable(data) {
    if (data.length === 0) return;
    
    const headerRow = data[0];
    const bodyRows = data.slice(1);
    
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    // Clear existing content
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Create header row
    const headerTr = document.createElement('tr');
    headerRow.forEach((cell, index) => {
        const th = document.createElement('th');
        th.textContent = cell;
        th.className = `column${index} align${index}`;
        if (columnWidths[index]) {
            th.style.width = columnWidths[index];
        }
        if (columnAlignments[index]) {
            th.style.textAlign = columnAlignments[index];
        }
        headerTr.appendChild(th);
    });
    tableHeader.appendChild(headerTr);
    
    // Create body rows
    bodyRows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        row.forEach((cell, colIndex) => {
            const td = document.createElement('td');
            td.textContent = cell;
            td.className = `column${colIndex} align${colIndex}`;
            if (columnWidths[colIndex]) {
                td.style.width = columnWidths[colIndex];
            }
            if (columnAlignments[colIndex]) {
                td.style.textAlign = columnAlignments[colIndex];
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    
    // Start scrolling after rendering
    setTimeout(() => {
        startScrollAnimation();
    }, 100);
}

/* ============================================
   SCROLL ANIMATION FUNCTION
   ============================================ */

function startScrollAnimation() {
    const tableBody = document.getElementById('tableBody');
    const tableContainer = document.querySelector('.tableContainer');
    
    if (!tableBody || tableBody.children.length === 0) return;
    
    // Clear any existing timeouts
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }
    if (scrollAnimation) {
        cancelAnimationFrame(scrollAnimation);
    }
    
    // Calculate scroll distance
    const tableHeight = tableBody.offsetHeight;
    const containerHeight = tableContainer.offsetHeight;
    const headerHeight = document.getElementById('tableHeader').offsetHeight;
    const scrollableHeight = containerHeight - headerHeight;
    
    if (tableHeight <= scrollableHeight) {
        // Table fits in container, no scrolling needed
        return;
    }
    
    const scrollDistance = tableHeight - scrollableHeight;
    
    // Calculate duration based on time per row
    const numRows = tableBody.children.length;
    const averageRowHeight = tableHeight / numRows;
    const visibleRows = scrollableHeight / averageRowHeight;
    const rowsToScroll = numRows - visibleRows;
    
    // Get time per row from CSS variable
    const styles = getComputedStyle(document.documentElement);
    const timePerRowRaw = styles.getPropertyValue('--scrollSpeedPerRowSeconds').trim();
    const timePerRow = parseFloat(timePerRowRaw) || 20; // Default to 20 seconds if not found
    
    // Calculate total duration: rows to scroll * time per row
    const duration = rowsToScroll * timePerRow * 1000; // Convert to milliseconds
    
    const startTime = Date.now();
    
    // Reset position
    tableBody.style.transform = 'translateY(0)';
    tableBody.classList.add('scrollableBody');
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // Still scrolling
            const currentY = -scrollDistance * progress;
            tableBody.style.transform = `translateY(${currentY}px)`;
            tableBody.style.transition = 'none';
            scrollAnimation = requestAnimationFrame(animate);
        } else {
            // Reached bottom
            tableBody.style.transform = `translateY(-${scrollDistance}px)`;
            
            // Wait for scrollDelay, then jump to top
            scrollTimeout = setTimeout(() => {
                tableBody.style.transition = 'none';
                tableBody.style.transform = 'translateY(0)';
                
                // Force reflow
                tableBody.offsetHeight;
                
                // Wait for scrollDelay again, then restart
                scrollTimeout = setTimeout(() => {
                    startScrollAnimation();
                }, scrollDelay * 1000);
            }, scrollDelay * 1000);
        }
    }
        animate();
}

/* ============================================
   CSV LOADING FUNCTION
   ============================================ */

async function loadCSV() {
    // Try each proxy in sequence
    for (let i = currentProxyIndex; i < corsProxies.length; i++) {
        try {
            const proxy = corsProxies[i];
            const fetchUrl = proxy + encodeURIComponent(csvUrl);
            
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            
            // Check if we got valid CSV data (not an error page)
            if (csvText && csvText.length > 0 && !csvText.includes('<!DOCTYPE')) {
                tableData = parseCSV(csvText);
                renderTable(tableData);
                currentProxyIndex = i; // Remember which proxy worked
                return; // Success!
            } else {
                throw new Error('Invalid response from proxy');
            }
        } catch (error) {
            console.error(`Proxy ${i} failed:`, error);
            // Try next proxy
            if (i < corsProxies.length - 1) {
                continue;
            }
        }
    }
    
    // All proxies failed - try direct access (might work if server allows)
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        tableData = parseCSV(csvText);
        renderTable(tableData);
        return;
    } catch (error) {
        console.error('Direct access also failed:', error);
        // Display error message
        const tableBody = document.getElementById('tableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: red;">Error loading data. All CORS proxies failed. Please check the CSV URL.</td></tr>`;
        }
    }
}

/* ============================================
   PAGE RELOAD FUNCTION
   ============================================ */

function scheduleReload() {
    setTimeout(() => {
        location.reload();
    }, reloadInterval);
}

/* ============================================
   INITIALIZATION
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Apply CSS variables from JavaScript settings
    const root = document.documentElement;
    root.style.setProperty('--scrollSpeed', `${scrollSpeed}s`);
    root.style.setProperty('--scrollDelay', `${scrollDelay}s`);
    root.style.setProperty('--rowCol', rowCol);
    root.style.setProperty('--rowAlt', rowAlt);
    root.style.setProperty('--tableHeaderFont', tableHeaderFont);
    root.style.setProperty('--tableHeaderSize', tableHeaderSize);
    root.style.setProperty('--tableHeaderColor', tableHeaderColor);
    root.style.setProperty('--tableContentFont', tableContentFont);
    root.style.setProperty('--tableContentSize', tableContentSize);
    root.style.setProperty('--tableContentColor', tableContentColor);
    
    // Apply column widths
    for (let i = 0; i < columnWidths.length; i++) {
        root.style.setProperty(`--column${i}Width`, columnWidths[i]);
    }
    
    // Apply column alignments
    for (let i = 0; i < columnAlignments.length; i++) {
        root.style.setProperty(`--column${i}Align`, columnAlignments[i]);
    }
    
    // Load CSV data
    loadCSV();
    
    // Schedule page reload
    scheduleReload();
});

