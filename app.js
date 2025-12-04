let playsData = [];
let currentWeekPlays = [];
let currentDriveIndex = 0;

// Load CSV data
async function loadCSV() {
    try {
        const response = await fetch('plays.csv');
        const csvText = await response.text();
        playsData = parseCSV(csvText);
        populateWeekSelector();
    } catch (error) {
        console.error('Error loading CSV:', error);
        document.getElementById('fieldsContainer').innerHTML = '<div class="no-games-message">Error loading data. Please ensure plays.csv is in the same directory as index.html</div>';
    }
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        // Simple CSV parsing (works for data without commas in values)
        let line = lines[i];
        let inQuotes = false;
        let currentField = '';
        let fieldIndex = 0;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                obj[headers[fieldIndex]] = currentField.trim().replace(/^"|"$/g, '');
                currentField = '';
                fieldIndex++;
            } else {
                currentField += char;
            }
        }
        // Add last field
        obj[headers[fieldIndex]] = currentField.trim().replace(/^"|"$/g, '');

        data.push(obj);
    }

    return data;
}

// Populate week selector dropdown
function populateWeekSelector() {
    const selector = document.getElementById('weekSelector');
    const weeks = new Set();

    playsData.forEach(play => {
        weeks.add(play['Week Number']);
    });

    // Sort weeks numerically
    const sortedWeeks = Array.from(weeks).sort((a, b) => parseInt(a) - parseInt(b));

    sortedWeeks.forEach(week => {
        const option = document.createElement('option');
        option.value = week;
        option.textContent = `Week ${week}`;
        selector.appendChild(option);
    });

    selector.addEventListener('change', handleWeekSelection);
    
    // Add keyboard support for arrow keys
    document.addEventListener('keydown', handleKeyPress);
    
    // Add button listeners
    document.getElementById('prevDriveBtn').addEventListener('click', goToPreviousDrive);
    document.getElementById('nextDriveBtn').addEventListener('click', goToNextDrive);
}

// Handle week selection
function handleWeekSelection(event) {
    const selectedWeek = event.target.value;
    const container = document.getElementById('fieldsContainer');
    const driveControlsContainer = document.getElementById('driveControlsContainer');

    if (!selectedWeek) {
        container.innerHTML = '';
        driveControlsContainer.style.display = 'none';
        return;
    }

    // Filter plays for selected week
    currentWeekPlays = playsData.filter(play => play['Week Number'] === selectedWeek);

    if (currentWeekPlays.length === 0) {
        container.innerHTML = '<div class="no-games-message">No games found for this week.</div>';
        driveControlsContainer.style.display = 'none';
        return;
    }

    // Reset to first drive
    currentDriveIndex = 0;
    driveControlsContainer.style.display = 'flex';
    
    displayCurrentDrive();
}

// Display the current drive
function displayCurrentDrive() {
    const container = document.getElementById('fieldsContainer');
    container.innerHTML = '';

    if (currentWeekPlays.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Determine the two teams playing this week
    const teamsInWeek = new Set();
    currentWeekPlays.forEach(play => {
        teamsInWeek.add(play['Team']);
        if (play['scoring_team'] && play['scoring_team'] !== 'NULL') {
            teamsInWeek.add(play['scoring_team']);
        }
    });
    const weekTeams = Array.from(teamsInWeek);
    
    // Calculate running scores
    const scores = calculateScores(currentWeekPlays);
    
    // Display only the current drive
    const play = currentWeekPlays[currentDriveIndex];
    const fieldElement = createFieldElement(play, currentDriveIndex, scores, weekTeams);
    container.appendChild(fieldElement);
    
    // Update drive counter and button states
    updateDriveControls();
}

// Update drive navigation buttons and counter
function updateDriveControls() {
    const counter = document.getElementById('driveCounter');
    const prevBtn = document.getElementById('prevDriveBtn');
    const nextBtn = document.getElementById('nextDriveBtn');
    
    counter.textContent = `Drive ${currentDriveIndex + 1} of ${currentWeekPlays.length}`;
    prevBtn.disabled = currentDriveIndex === 0;
    nextBtn.disabled = currentDriveIndex === currentWeekPlays.length - 1;
}

// Navigate to previous drive
function goToPreviousDrive() {
    if (currentDriveIndex > 0) {
        currentDriveIndex--;
        displayCurrentDrive();
    }
}

// Navigate to next drive
function goToNextDrive() {
    if (currentDriveIndex < currentWeekPlays.length - 1) {
        currentDriveIndex++;
        displayCurrentDrive();
    }
}

// Handle keyboard arrow keys
function handleKeyPress(event) {
    if (currentWeekPlays.length === 0) return;
    
    if (event.key === 'ArrowUp') {
        goToPreviousDrive();
        event.preventDefault();
    } else if (event.key === 'ArrowDown') {
        goToNextDrive();
        event.preventDefault();
    }
}

// Calculate running scores based on drive outcomes
function calculateScores(plays) {
    const runningScores = {};
    const scoresByIndex = {};
    
    // Get all unique teams in the week
    const allTeams = new Set();
    plays.forEach(play => {
        allTeams.add(play['Team']);
        if (play['scoring_team'] && play['scoring_team'] !== 'NULL') {
            allTeams.add(play['scoring_team']);
        }
    });
    
    // Initialize all teams with 0 score
    allTeams.forEach(team => {
        runningScores[team] = 0;
    });
    
    plays.forEach((play, index) => {
        const endedHow = play['Ended: How'];
        const scoringTeam = play['scoring_team'];
        const drivingTeam = play['Team'];
        
        // Add points based on how the drive ended
        if (endedHow === 'TD' && scoringTeam && scoringTeam !== 'NULL') {
            runningScores[scoringTeam] += 7;
        } else if ((endedHow === 'FG' || endedHow === 'FGA') && scoringTeam && scoringTeam !== 'NULL') {
            runningScores[scoringTeam] += 3;
        } else if ((endedHow === 'FG' || endedHow === 'FGA') && (!scoringTeam || scoringTeam === 'NULL')) {
            // If scoring_team is null but drive ended in FG/FGA, the driving team scored
            runningScores[drivingTeam] += 3;
        }
        
        // Store scores at this point in the game (copy the current state)
        scoresByIndex[index] = JSON.parse(JSON.stringify(runningScores));
    });
    
    return scoresByIndex;
}

// Create a field element for a single play
function createFieldElement(play, index, scores, weekTeams) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field-wrapper';

    // Title with team
    const title = document.createElement('div');
    title.className = 'field-title';
    title.textContent = `Drive for ${play['Team']}`;
    wrapper.appendChild(title);

    // Add scoreboard
    const scoreboard = document.createElement('div');
    scoreboard.className = 'scoreboard';
    
    const currentScores = scores[index] || {};
    
    // Determine MER and opponent team based on teams in the week
    let merScore, oppTeam, oppScore;
    
    if (weekTeams.length === 2) {
        // Two teams in the week
        const otherTeam = weekTeams.find(t => t !== 'MER');
        merScore = currentScores['MER'] || 0;
        oppTeam = otherTeam || 'OPP';
        oppScore = currentScores[oppTeam] || 0;
    } else {
        // Fallback for edge cases
        merScore = currentScores['MER'] || 0;
        oppTeam = play['Team'] !== 'MER' ? play['Team'] : getOpposingTeam(play);
        oppScore = currentScores[oppTeam] || 0;
    }
    
    const merScoreDiv = document.createElement('div');
    merScoreDiv.className = 'score-display mer-score';
    merScoreDiv.innerHTML = `<span class="team-label">MER</span><span class="score-value">${merScore}</span>`;
    scoreboard.appendChild(merScoreDiv);
    
    const scoresSeparator = document.createElement('div');
    scoresSeparator.className = 'scores-separator';
    scoresSeparator.textContent = '-';
    scoreboard.appendChild(scoresSeparator);
    
    const oppScoreDiv = document.createElement('div');
    oppScoreDiv.className = 'score-display opp-score';
    oppScoreDiv.innerHTML = `<span class="team-label">${oppTeam}</span><span class="score-value">${oppScore}</span>`;
    scoreboard.appendChild(oppScoreDiv);
    
    wrapper.appendChild(scoreboard);

    // Football field
    const field = document.createElement('div');
    field.className = 'football-field';

    // Add endzones - MER always on left, opponent on right
    const leftEndzone = document.createElement('div');
    leftEndzone.className = 'endzone left';
    leftEndzone.textContent = 'MER';
    field.appendChild(leftEndzone);

    const rightEndzone = document.createElement('div');
    rightEndzone.className = 'endzone right';
    rightEndzone.textContent = play['Team'] !== 'MER' ? play['Team'] : getOpposingTeam(play);
    field.appendChild(rightEndzone);

    // Add yard lines container
    const yardLinesContainer = document.createElement('div');
    yardLinesContainer.className = 'yard-lines-container';

    // Create yard lines for 10, 20, 30, 40, 50, 40, 30, 20, 10
    const yardLinePositions = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    yardLinePositions.forEach(position => {
        const line = document.createElement('div');
        line.className = 'yard-line';
        line.style.left = position + '%';
        yardLinesContainer.appendChild(line);
    });

    field.appendChild(yardLinesContainer);

    // Add start spot (bright green)
    const startSpot = createSpotMarker(play['Started: Spot'], play['Team'], true);
    if (startSpot) field.appendChild(startSpot);

    // Add end spot (bright red)
    const endSpot = createSpotMarker(play['Ended: Spot'], play['Team'], false);
    if (endSpot) field.appendChild(endSpot);

    // Add touchdown banner if applicable
    if (play['Ended: How'] === 'TD') {
        const banner = document.createElement('div');
        banner.className = 'touchdown-banner';
        banner.textContent = 'TOUCHDOWN';
        field.appendChild(banner);
    }

    wrapper.appendChild(field);

    // Add game info
    const gameInfo = document.createElement('div');
    gameInfo.className = 'game-info';

    if (play['Date'] && play['Date'] !== 'NULL') {
        const dateRow = document.createElement('div');
        dateRow.className = 'game-info-row';
        dateRow.innerHTML = `<strong>Date:</strong> <span>${play['Date']}</span>`;
        gameInfo.appendChild(dateRow);
    }

    if (play['Site'] && play['Site'] !== 'NULL') {
        const siteRow = document.createElement('div');
        siteRow.className = 'game-info-row';
        siteRow.innerHTML = `<strong>Site:</strong> <span>${play['Site']}</span>`;
        gameInfo.appendChild(siteRow);
    }

    if (play['Temperature'] && play['Temperature'] !== 'NULL') {
        const tempRow = document.createElement('div');
        tempRow.className = 'game-info-row';
        tempRow.innerHTML = `<strong>Temperature:</strong> <span>${play['Temperature']}°F</span>`;
        gameInfo.appendChild(tempRow);
    }

    if (play['Weather'] && play['Weather'] !== 'NULL') {
        const weatherRow = document.createElement('div');
        weatherRow.className = 'game-info-row';
        weatherRow.innerHTML = `<strong>Weather:</strong> <span>${play['Weather']}</span>`;
        gameInfo.appendChild(weatherRow);
    }

    // Add how the drive ended
    if (play['Ended: How'] && play['Ended: How'] !== 'NULL') {
        const endedRow = document.createElement('div');
        endedRow.className = 'game-info-row';
        endedRow.innerHTML = `<strong>Drive Ended:</strong> <span>${play['Ended: How']}</span>`;
        gameInfo.appendChild(endedRow);
    }

    // Add scoring play info if it's a TD
    if (play['Ended: How'] === 'TD' && play['Scoring Play'] && play['Scoring Play'] !== 'NULL') {
        const scoringInfo = document.createElement('div');
        scoringInfo.className = 'scoring-play-info';
        scoringInfo.innerHTML = `<strong>Scoring Play:</strong> ${play['Scoring Play']}`;
        gameInfo.appendChild(scoringInfo);
    }

    wrapper.appendChild(gameInfo);

    // Trigger animation after field is added to DOM
    setTimeout(() => {
        const startDot = wrapper.querySelector('.spot-marker.start');
        const endDot = wrapper.querySelector('.spot-marker.end');
        const gameInfoDiv = wrapper.querySelector('.game-info');
        const touchdownBanner = wrapper.querySelector('.touchdown-banner');
        
        if (endDot && startDot) {
            const startPos = parseFloat(startDot.style.left);
            const endPos = parseFloat(endDot.dataset.endPosition);
            
            // Create a keyframe animation dynamically
            const animationName = `moveDot-${Math.random().toString(36).substr(2, 9)}`;
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                @keyframes ${animationName} {
                    0% {
                        left: ${startPos}%;
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    100% {
                        left: ${endPos}%;
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styleSheet);
            
            // Apply the animation
            endDot.style.animation = `${animationName} 3s ease-in-out forwards`;
        } else if (endDot) {
            endDot.classList.add('animating');
        }
        
        // Show game info and touchdown banner after animation completes (3 seconds)
        setTimeout(() => {
            if (gameInfoDiv) {
                gameInfoDiv.classList.add('show');
            }
            if (touchdownBanner) {
                touchdownBanner.classList.add('show');
            }
        }, 3000);
    }, 100);

    return wrapper;
}

// Create spot marker at the correct field position
function createSpotMarker(spotText, team, isStart) {
    if (!spotText || spotText === 'NULL') return null;

    const marker = document.createElement('div');
    marker.className = `spot-marker ${isStart ? 'start' : 'end'}`;

    // Parse the spot (e.g., "YSU31", "MER0")
    const position = parseSpotPosition(spotText, team);
    
    if (isStart) {
        // Start position is set immediately
        marker.style.left = position + '%';
    } else {
        // End position will be set by animation
        // Store the end position in a data attribute
        marker.dataset.endPosition = position;
        // Start from the start position
        const startSpot = marker.parentElement?.querySelector('.spot-marker.start');
        if (startSpot) {
            const startPos = parseFloat(startSpot.style.left);
            marker.style.left = startPos + '%';
        } else {
            marker.style.left = position + '%';
        }
    }

    return marker;
}

// Parse field position from spot text
function parseSpotPosition(spotText, team) {
    // Extract team abbreviation and yard number
    // e.g., "YSU31" -> yard 31, "MER0" -> yard 0
    const match = spotText.match(/([A-Z]+)(\d+)/);

    if (!match) return 50; // Default to midfield

    const spotTeam = match[1];
    const yardNumber = parseInt(match[2]);

    // Mercyhurst is always on the left (0% = MER endzone, 100% = opposing endzone)
    let position;
    if (spotTeam === 'MER') {
        // For MER: yard 0 is left endzone (10%), yard 50 is midfield (50%), yards beyond 50 go towards right
        position = 10 + (yardNumber * 0.4);
    } else {
        // For opposing team: reverse the field
        // Yard 0 is their endzone (90%), yard 50 is midfield (50%)
        position = 90 - (yardNumber * 0.4);
    }

    // Clamp between 5% and 95% to keep within field bounds
    return Math.max(5, Math.min(95, position));
}

// Get the opposing team name
function getOpposingTeam(play) {
    const team = play['Team'];
    // Try to infer from other columns or just show generic "Opponent"
    if (play['scoring_team'] && play['scoring_team'] !== 'NULL' && play['scoring_team'] !== team) {
        return play['scoring_team'];
    }
    // Default to a generic opponent label or try to get from Scoring Play
    if (play['Scoring Play'] && play['Scoring Play'] !== 'NULL') {
        const match = play['Scoring Play'].match(/^([A-Z]+)\s*-/);
        if (match && match[1] !== team) {
            return match[1];
        }
    }
    return 'OPP';
}

// Initialize app
loadCSV();
