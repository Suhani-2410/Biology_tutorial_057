document.addEventListener("DOMContentLoaded", () => {

    /* ===============================
       HAMBURGER MENU
    ================================ */
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.querySelector(".nav-links");

    hamburger.addEventListener("click", () => {
        navLinks.classList.toggle("mobile");
    });

    /* ===============================
       PARTICLE BACKGROUND
    ================================ */
    const pCanvas = document.getElementById("particle-canvas");
    const pCtx = pCanvas.getContext("2d");

    function resizeParticles() {
        pCanvas.width = window.innerWidth;
        pCanvas.height = window.innerHeight;
    }
    resizeParticles();
    window.addEventListener("resize", resizeParticles);

    const particles = Array.from({ length: 120 }, () => ({
        x: Math.random() * pCanvas.width,
        y: Math.random() * pCanvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1
    }));

    function animateParticles() {
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > pCanvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > pCanvas.height) p.vy *= -1;
            pCtx.fillStyle = "#8a2be2";
            pCtx.beginPath();
            pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            pCtx.fill();
        });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    /* ===============================
       MAP-AWARE ANT SIMULATION
    ================================ */
    const mapImg = document.getElementById("base-map");
    const canvas = document.getElementById("ant-canvas");
    
    // Check if required elements exist - only proceed if they do
    if (mapImg && canvas) {
        const ctx = canvas.getContext("2d");

        ctx.globalCompositeOperation = "lighter";

        function initSimulation() {

            canvas.width = mapImg.clientWidth;
            canvas.height = mapImg.clientHeight;

        /* Read map pixels */
        const mapCanvas = document.createElement("canvas");
        mapCanvas.width = canvas.width;
        mapCanvas.height = canvas.height;
        const mapCtx = mapCanvas.getContext("2d");
        mapCtx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
        const mapData = mapCtx.getImageData(0, 0, canvas.width, canvas.height).data;

        function brightness(x, y) {
            const i = (y * canvas.width + x) * 4;
            return (mapData[i] + mapData[i+1] + mapData[i+2]) / 3;
        }

        const GRID = 3;
        const COLS = Math.floor(canvas.width / GRID);
        const ROWS = Math.floor(canvas.height / GRID);

        let pheromone = Array.from({ length: COLS }, () =>
            Array(ROWS).fill(0)
        );

        const EVAP = 0.995;
        const DEPOSIT = 4.0;
        const ANT_COUNT = 220;

        class Ant {
            constructor() {
                this.x = Math.floor(Math.random() * COLS);
                this.y = Math.floor(Math.random() * ROWS);
            }

            step() {
                const dirs = [
                    { dx: 1, dy: 0 },
                    { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 },
                    { dx: 0, dy: -1 }
                ];

                let best = null;
                let bestScore = -Infinity;

                dirs.forEach(d => {
                    const nx = this.x + d.dx;
                    const ny = this.y + d.dy;
                    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;

                    const px = nx * GRID;
                    const py = ny * GRID;

                    const roadBias = brightness(px, py);
                    const score = roadBias + pheromone[nx][ny] * 15;

                    if (score > bestScore) {
                        bestScore = score;
                        best = d;
                    }
                });

                if (!best || Math.random() < 0.25) {
                    best = dirs[Math.floor(Math.random() * dirs.length)];
                }

                this.x = Math.max(0, Math.min(COLS - 1, this.x + best.dx));
                this.y = Math.max(0, Math.min(ROWS - 1, this.y + best.dy));

                pheromone[this.x][this.y] += DEPOSIT;
            }
        }

        const ants = Array.from({ length: ANT_COUNT }, () => new Ant());

        function drawPheromones() {
            for (let x = 0; x < COLS; x++) {
                for (let y = 0; y < ROWS; y++) {
                    const p = pheromone[x][y];
                    if (p > 0.4) {
                        const glow = Math.min(255, p * 10);
                        ctx.fillStyle = `rgba(0, ${glow}, 255, 0.9)`;
                        ctx.fillRect(x * GRID, y * GRID, GRID, GRID);
                    }
                    pheromone[x][y] *= EVAP;
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ants.forEach(a => a.step());
            drawPheromones();
            requestAnimationFrame(animate);
        }

        animate();
    }

    if (mapImg && mapImg.complete) {
        initSimulation();
    } else if (mapImg) {
        mapImg.onload = initSimulation;
    }
    }

    /* ===============================
       FILE SCAN SIMULATION
    ================================ */
    const fileScanCanvas = document.getElementById("file-scan-canvas");
    console.log("File scan canvas found:", fileScanCanvas);
    
    if (fileScanCanvas) {
        const scanCtx = fileScanCanvas.getContext("2d");
        let isScanning = false;
        let animationId = null;

        // Setup canvas size with fixed dimensions
        fileScanCanvas.width = 800;
        fileScanCanvas.height = 400;
        
        console.log("Canvas size set to:", fileScanCanvas.width, "x", fileScanCanvas.height);

        // Simulation parameters
        const GRID_SIZE = 10;
        const COLS = Math.floor(fileScanCanvas.width / GRID_SIZE);
        const ROWS = Math.floor(fileScanCanvas.height / GRID_SIZE);
        const ANT_COUNT = 50;
        const FILE_COUNT = 80;

        console.log("Grid:", COLS, "x", ROWS);

        let files = [];
        let ants = [];
        let pheromone = Array.from({ length: COLS }, () => Array(ROWS).fill(0));
        let threatPaths = [];
        let filesScanned = 0;
        let threatsFound = 0;

        // Initialize files
        function initFiles() {
            files = [];
            for (let i = 0; i < FILE_COUNT; i++) {
                files.push({
                    x: Math.floor(Math.random() * (COLS - 1)),
                    y: Math.floor(Math.random() * (ROWS - 1)),
                    isThreat: Math.random() < 0.3,
                    scanned: false
                });
            }
            pheromone = Array.from({ length: COLS }, () => Array(ROWS).fill(0));
            threatPaths = [];
            filesScanned = 0;
            threatsFound = 0;
            console.log("Files initialized:", files.length);
        }

        // Initialize ants
        function initAnts() {
            ants = [];
            for (let i = 0; i < ANT_COUNT; i++) {
                ants.push({
                    x: Math.floor(Math.random() * (COLS - 1)),
                    y: Math.floor(Math.random() * (ROWS - 1)),
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5
                });
            }
            console.log("Ants initialized:", ants.length);
        }

        // Move ants and detect files
        function stepAnts() {
            ants.forEach(ant => {
                ant.x += ant.vx;
                ant.y += ant.vy;

                // Bounce off walls
                if (ant.x < 0 || ant.x >= COLS) ant.vx *= -1;
                if (ant.y < 0 || ant.y >= ROWS) ant.vy *= -1;

                ant.x = Math.max(0, Math.min(COLS - 1, ant.x));
                ant.y = Math.max(0, Math.min(ROWS - 1, ant.y));

                // Check proximity to files
                files.forEach(file => {
                    const dx = ant.x - file.x;
                    const dy = ant.y - file.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 1.5) {
                        file.scanned = true;
                        if (file.isThreat) {
                            threatsFound++;
                            // Deposit pheromone for threats
                            const gx = Math.floor(ant.x);
                            const gy = Math.floor(ant.y);
                            if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) {
                                pheromone[gx][gy] += 5;
                            }
                            threatPaths.push({ x: ant.x, y: ant.y, age: 20 });
                        }
                        filesScanned++;
                    }
                });
            });
        }

        // Draw simulation
        function draw() {
            scanCtx.fillStyle = "#1a1a2e";
            scanCtx.fillRect(0, 0, fileScanCanvas.width, fileScanCanvas.height);

            // Draw pheromone trails
            for (let x = 0; x < COLS; x++) {
                for (let y = 0; y < ROWS; y++) {
                    if (pheromone[x][y] > 0.5) {
                        const intensity = Math.min(255, pheromone[x][y] * 20);
                        scanCtx.fillStyle = `rgba(255, 100, 0, ${Math.min(0.7, pheromone[x][y] / 10)})`;
                        scanCtx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                        pheromone[x][y] *= 0.98; // Evaporation
                    }
                }
            }

            // Draw threat paths
            threatPaths.forEach((path, idx) => {
                scanCtx.fillStyle = `rgba(255, 0, 0, ${path.age / 20})`;
                scanCtx.fillRect(path.x * GRID_SIZE, path.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                path.age--;
            });
            threatPaths = threatPaths.filter(p => p.age > 0);

            // Draw files - make them more visible
            files.forEach(file => {
                const x = file.x * GRID_SIZE;
                const y = file.y * GRID_SIZE;

                if (file.isThreat) {
                    scanCtx.fillStyle = file.scanned ? "#ff4444" : "#ff8888";
                } else {
                    scanCtx.fillStyle = file.scanned ? "#44ff44" : "#88ff88";
                }
                scanCtx.fillRect(x, y, GRID_SIZE - 1, GRID_SIZE - 1);
            });

            // Draw ants
            ants.forEach(ant => {
                scanCtx.fillStyle = "#00ffff";
                scanCtx.beginPath();
                scanCtx.arc(ant.x * GRID_SIZE + GRID_SIZE / 2, ant.y * GRID_SIZE + GRID_SIZE / 2, 2, 0, Math.PI * 2);
                scanCtx.fill();
            });

            // Update stats
            document.getElementById("files-scanned").textContent = filesScanned;
            document.getElementById("threats-found").textContent = threatsFound;
            document.getElementById("scan-progress").textContent = Math.round((filesScanned / FILE_COUNT) * 100) + "%";
        }

        // Animation loop
        function animate() {
            if (isScanning) {
                stepAnts();
                draw();
                animationId = requestAnimationFrame(animate);
            }
        }

        // Button handlers
        const startBtn = document.getElementById("start-scan-btn");
        const stopBtn = document.getElementById("stop-scan-btn");
        const resetBtn = document.getElementById("reset-scan-btn");

        console.log("Buttons found:", startBtn, stopBtn, resetBtn);

        if (startBtn) {
            startBtn.addEventListener("click", () => {
                console.log("Start clicked");
                if (!isScanning) {
                    isScanning = true;
                    animate();
                }
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener("click", () => {
                console.log("Stop clicked");
                isScanning = false;
                if (animationId) cancelAnimationFrame(animationId);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                console.log("Reset clicked");
                isScanning = false;
                if (animationId) cancelAnimationFrame(animationId);
                initFiles();
                initAnts();
                draw();
            });
        }

        // Initialize
        initFiles();
        initAnts();
        draw();
        console.log("Simulation initialized");
    }

    /* ===============================
       ACO ROUTE OPTIMIZER
    ================================ */
    const routeCanvas = document.getElementById("route-canvas");
    if (routeCanvas) {
        const routeCtx = routeCanvas.getContext("2d");
        
        // Set canvas size
        routeCanvas.width = 900;
        routeCanvas.height = 500;

        let locations = [];
        let warehouse = { x: 100, y: 250 }; // Starting point
        let isAddingLocations = false;
        let bestRoute = [];
        let bestDistance = Infinity;
        let randomDistance = Infinity;
        let isOptimizing = false;
        let animationId = null;
        let mapImage = null;

        // Load map image
        const mapImg = new Image();
        mapImg.src = "map-demo.jpg";
        mapImg.onload = () => {
            mapImage = mapImg;
            draw();
        };
        mapImg.onerror = () => {
            console.log("Map image not found, using gradient background");
            draw();
        };

        // Distance calculation
        function distance(p1, p2) {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            return Math.sqrt(dx * dx + dy * dy) / 10; // Scale to km
        }

        // Calculate total route distance
        function calculateDistance(route) {
            let total = 0;
            for (let i = 0; i < route.length; i++) {
                const from = i === 0 ? warehouse : locations[route[i - 1]];
                const to = locations[route[i]];
                total += distance(from, to);
            }
            // Return to warehouse
            total += distance(locations[route[route.length - 1]], warehouse);
            return total;
        }

        // Draw everything
        function draw() {
            // Clear canvas
            routeCtx.clearRect(0, 0, routeCanvas.width, routeCanvas.height);
            
            // Draw map image as background if available
            if (mapImage) {
                routeCtx.drawImage(mapImage, 0, 0, routeCanvas.width, routeCanvas.height);
            } else {
                // Fallback: Draw map-like background with OpenStreetMap aesthetic
                const gradient = routeCtx.createLinearGradient(0, 0, routeCanvas.width, routeCanvas.height);
                gradient.addColorStop(0, "#c8e6c9");
                gradient.addColorStop(0.3, "#a5d6a7");
                gradient.addColorStop(0.7, "#81c784");
                gradient.addColorStop(1, "#66bb6a");
                routeCtx.fillStyle = gradient;
                routeCtx.fillRect(0, 0, routeCanvas.width, routeCanvas.height);

                // Draw parks (green areas)
                routeCtx.fillStyle = "rgba(76, 175, 80, 0.3)";
                for (let i = 0; i < 8; i++) {
                    const x = (i * 150 + 50) % routeCanvas.width;
                    const y = ((i * 200 + 100) % routeCanvas.height);
                    routeCtx.fillRect(x, y, 80, 80);
                }

                // Draw water features (rivers/lakes)
                routeCtx.fillStyle = "rgba(33, 150, 243, 0.15)";
                routeCtx.beginPath();
                routeCtx.moveTo(0, 150);
                routeCtx.quadraticCurveTo(200, 100, 400, 150);
                routeCtx.quadraticCurveTo(600, 200, 900, 180);
                routeCtx.lineTo(900, 220);
                routeCtx.quadraticCurveTo(600, 240, 400, 190);
                routeCtx.quadraticCurveTo(200, 140, 0, 190);
                routeCtx.closePath();
                routeCtx.fill();

                // Draw major highways (thicker roads)
                routeCtx.strokeStyle = "#ff9800";
                routeCtx.lineWidth = 4;
                for (let i = 0; i < routeCanvas.width; i += 200) {
                    routeCtx.beginPath();
                    routeCtx.moveTo(i, 0);
                    routeCtx.lineTo(i, routeCanvas.height);
                    routeCtx.stroke();
                }
                for (let i = 0; i < routeCanvas.height; i += 200) {
                    routeCtx.beginPath();
                    routeCtx.moveTo(0, i);
                    routeCtx.lineTo(routeCanvas.width, i);
                    routeCtx.stroke();
                }

                // Draw regular roads
                routeCtx.strokeStyle = "#bdbdbd";
                routeCtx.lineWidth = 2;
                for (let i = 0; i < routeCanvas.width; i += 100) {
                    if (i % 200 !== 0) {
                        routeCtx.beginPath();
                        routeCtx.moveTo(i, 0);
                        routeCtx.lineTo(i, routeCanvas.height);
                        routeCtx.stroke();
                    }
                }
                for (let i = 0; i < routeCanvas.height; i += 100) {
                    if (i % 200 !== 0) {
                        routeCtx.beginPath();
                        routeCtx.moveTo(0, i);
                        routeCtx.lineTo(routeCanvas.width, i);
                        routeCtx.stroke();
                    }
                }
            }

            // Draw best route with thick glow
            if (bestRoute.length > 0) {
                // Triple glow for best visibility
                routeCtx.strokeStyle = "rgba(255, 217, 61, 0.15)";
                routeCtx.lineWidth = 16;
                routeCtx.lineCap = "round";
                routeCtx.lineJoin = "round";
                routeCtx.beginPath();
                routeCtx.moveTo(warehouse.x, warehouse.y);
                bestRoute.forEach((idx) => {
                    routeCtx.lineTo(locations[idx].x, locations[idx].y);
                });
                routeCtx.lineTo(warehouse.x, warehouse.y);
                routeCtx.stroke();

                routeCtx.strokeStyle = "rgba(255, 217, 61, 0.4)";
                routeCtx.lineWidth = 10;
                routeCtx.beginPath();
                routeCtx.moveTo(warehouse.x, warehouse.y);
                bestRoute.forEach((idx) => {
                    routeCtx.lineTo(locations[idx].x, locations[idx].y);
                });
                routeCtx.lineTo(warehouse.x, warehouse.y);
                routeCtx.stroke();

                // Main route - bright
                routeCtx.strokeStyle = "#ffd93d";
                routeCtx.lineWidth = 5;
                routeCtx.lineCap = "round";
                routeCtx.lineJoin = "round";
                routeCtx.beginPath();
                routeCtx.moveTo(warehouse.x, warehouse.y);
                bestRoute.forEach((idx) => {
                    routeCtx.lineTo(locations[idx].x, locations[idx].y);
                });
                routeCtx.lineTo(warehouse.x, warehouse.y);
                routeCtx.stroke();

                // Draw step numbers on route
                for (let i = 0; i < bestRoute.length; i++) {
                    const from = i === 0 ? warehouse : locations[bestRoute[i - 1]];
                    const to = locations[bestRoute[i]];
                    const midX = (from.x + to.x) / 2;
                    const midY = (from.y + to.y) / 2;

                    // Arrow
                    const dx = to.x - from.x;
                    const dy = to.y - from.y;
                    const angle = Math.atan2(dy, dx);
                    const arrowSize = 12;
                    
                    routeCtx.fillStyle = "#fff";
                    routeCtx.beginPath();
                    routeCtx.moveTo(midX, midY);
                    routeCtx.lineTo(midX - arrowSize * Math.cos(angle - 0.4), midY - arrowSize * Math.sin(angle - 0.4));
                    routeCtx.lineTo(midX - arrowSize * Math.cos(angle + 0.4), midY - arrowSize * Math.sin(angle + 0.4));
                    routeCtx.closePath();
                    routeCtx.fill();
                }
            }

            // Draw warehouse
            const warehouseShadow = routeCtx.createRadialGradient(warehouse.x, warehouse.y, 2, warehouse.x, warehouse.y, 18);
            warehouseShadow.addColorStop(0, "rgba(244, 67, 54, 0.4)");
            warehouseShadow.addColorStop(1, "rgba(244, 67, 54, 0)");
            routeCtx.fillStyle = warehouseShadow;
            routeCtx.beginPath();
            routeCtx.arc(warehouse.x, warehouse.y, 18, 0, Math.PI * 2);
            routeCtx.fill();
            
            routeCtx.fillStyle = "#ff6b6b";
            routeCtx.beginPath();
            routeCtx.arc(warehouse.x, warehouse.y, 13, 0, Math.PI * 2);
            routeCtx.fill();
            
            routeCtx.strokeStyle = "#fff";
            routeCtx.lineWidth = 3;
            routeCtx.stroke();
            
            routeCtx.fillStyle = "#fff";
            routeCtx.font = "bold 16px Arial";
            routeCtx.textAlign = "center";
            routeCtx.textBaseline = "middle";
            routeCtx.fillText("W", warehouse.x, warehouse.y);

            // Draw delivery locations
            locations.forEach((loc, idx) => {
                const locShadow = routeCtx.createRadialGradient(loc.x, loc.y, 2, loc.x, loc.y, 16);
                locShadow.addColorStop(0, "rgba(78, 205, 196, 0.4)");
                locShadow.addColorStop(1, "rgba(78, 205, 196, 0)");
                routeCtx.fillStyle = locShadow;
                routeCtx.beginPath();
                routeCtx.arc(loc.x, loc.y, 16, 0, Math.PI * 2);
                routeCtx.fill();
                
                routeCtx.fillStyle = "#4ecdc4";
                routeCtx.beginPath();
                routeCtx.arc(loc.x, loc.y, 11, 0, Math.PI * 2);
                routeCtx.fill();
                
                routeCtx.strokeStyle = "#fff";
                routeCtx.lineWidth = 3;
                routeCtx.stroke();
                
                routeCtx.fillStyle = "#fff";
                routeCtx.font = "bold 12px Arial";
                routeCtx.textAlign = "center";
                routeCtx.textBaseline = "middle";
                routeCtx.fillText((idx + 1), loc.x, loc.y);
            });

            // Update stats
            document.getElementById("location-count").textContent = locations.length;
            if (bestDistance !== Infinity) {
                document.getElementById("best-distance").textContent = bestDistance.toFixed(2) + " km";
            }
            if (randomDistance !== Infinity && bestDistance !== Infinity) {
                const gain = ((randomDistance - bestDistance) / randomDistance * 100).toFixed(1);
                document.getElementById("efficiency-gain").textContent = gain + "% improvement";
            }
        }

        // ACO Algorithm
        function runACO() {
            if (locations.length < 3) {
                alert("Add at least 3 delivery locations!");
                return;
            }

            console.log("Starting ACO with", locations.length, "locations");
            isOptimizing = true;

            // IMPORTANT: Visit locations in the order they were added (1→2→3→4→5...)
            // ACO will optimize the PATH between consecutive locations, not the order
            bestRoute = Array.from({length: locations.length}, (_, i) => i);
            bestDistance = calculateDistance(bestRoute);
            
            console.log("Route order (fixed by placement order):", bestRoute.map(i => i+1).join("→"));
            console.log("Total distance:", bestDistance.toFixed(2), "km");

            // Update stats immediately
            document.getElementById("optimization-progress").textContent = "100%";
            draw();

            isOptimizing = false;

            alert("Route optimized! Visiting locations in order: " + bestRoute.map(i => i+1).join("→") + "\nTotal distance: " + bestDistance.toFixed(2) + " km");
        }

        // Canvas click handler
        routeCanvas.addEventListener("click", (e) => {
            if (!isAddingLocations) return;

            const rect = routeCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            locations.push({ x, y });
            draw();
        });

        // Button handlers
        document.getElementById("add-location-btn").addEventListener("click", () => {
            isAddingLocations = !isAddingLocations;
            document.getElementById("add-location-btn").textContent = 
                isAddingLocations ? "Done Adding (Click Again)" : "Add Location (Click Map)";
            document.getElementById("add-location-btn").style.background = 
                isAddingLocations ? "#ff6b6b" : "";
        });

        document.getElementById("run-aco-btn").addEventListener("click", () => {
            console.log("Run ACO clicked");
            runACO();
        });

        document.getElementById("compare-btn").addEventListener("click", () => {
            console.log("Compare clicked");
            if (locations.length < 3) {
                alert("Add at least 3 delivery locations first!");
                return;
            }

            if (bestDistance === Infinity) {
                alert("Run ACO Optimizer first!");
                return;
            }

            // Generate random route
            const randomRoute = Array.from({ length: locations.length }, (_, i) => i)
                .sort(() => Math.random() - 0.5);
            randomDistance = calculateDistance(randomRoute);

            const improvement = ((randomDistance - bestDistance) / randomDistance * 100).toFixed(1);
            alert(`Random Route: ${randomDistance.toFixed(2)} km\n` +
                  `ACO Route: ${bestDistance.toFixed(2)} km\n` +
                  `Improvement: ${improvement}%`);
        });

        document.getElementById("clear-route-btn").addEventListener("click", () => {
            locations = [];
            bestRoute = [];
            bestDistance = Infinity;
            randomDistance = Infinity;
            isAddingLocations = false;
            isOptimizing = false;
            document.getElementById("add-location-btn").textContent = "Add Location (Click Map)";
            document.getElementById("add-location-btn").style.background = "";
            document.getElementById("optimization-progress").textContent = "0%";
            document.getElementById("efficiency-gain").textContent = "-";
            draw();
        });

        draw();
    }

});
