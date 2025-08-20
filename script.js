document.addEventListener('DOMContentLoaded', () => {
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQniCPkmq4_ulsrLazTWhWv9-bcziIJwAwRz73EesRu0nTSjxqgEjMNJ1c_8QBsEUJsvMuSDLjc9at-/pub?output=csv';

    // --- Seleção de Elementos ---
    const timelineContainer = document.getElementById('timeline-container');
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const managerFilterPanel = document.getElementById('manager-filter-panel');
    const statusFilterPanel = document.getElementById('status-filter-panel');
    const yearFilterPanel = document.getElementById('year-filter-panel');
    const managerFilterBtn = document.getElementById('manager-filter-btn');
    const statusFilterBtn = document.getElementById('status-filter-btn');
    const yearFilterBtn = document.getElementById('year-filter-btn');
    const textMeasurer = document.createElement('div');
    textMeasurer.className = 'text-measurer';
    document.body.appendChild(textMeasurer);
    let allProjects = [];

    // --- Funções Ajudantes ---
    function parseBrazilianDate(dateStr) { if (!dateStr || typeof dateStr !== 'string') return null; const parts = dateStr.split('/'); if (parts.length !== 3) return null; const day = parseInt(parts[0], 10); const month = parseInt(parts[1], 10) - 1; const year = parseInt(parts[2], 10); if (isNaN(day) || isNaN(month) || isNaN(year)) return null; const date = new Date(year, month, day); if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) { return null; } return date; }
    function parseCsvLine(line) { const result = []; let current = ''; let inQuotes = false; for (let i = 0; i < line.length; i++) { const char = line[i]; if (char === '"' && (i === 0 || line[i-1] !== '\\')) { inQuotes = !inQuotes; } else if (char === ',' && !inQuotes) { result.push(current.replace(/^"|"$/g, '').trim()); current = ''; } else { current += char; } } result.push(current.replace(/^"|"$/g, '').trim()); return result; }
    function getManagerIcon(name) { if (!name || name === 'Não definido') return ''; const getInitials = (fullName) => { const names = fullName.split(' '); if (names.length === 1) return names[0].substring(0, 2).toUpperCase(); return (names[0][0] + names[names.length - 1][0]).toUpperCase(); }; const generateColor = (str) => { let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } const h = hash % 360; return `hsl(${h}, 60%, 45%)`; }; const initials = getInitials(name); const color = generateColor(name); return `<div class="manager-icon" style="background-color: ${color};" title="${name}">${initials}</div>`; }
    
    // **MUDANÇA AQUI**: Função atualizada para remover acentos
    function generateStatusClass(status) {
        if (!status) return '';
        const normalizedStatus = status
            .trim()
            .toLowerCase()
            .normalize("NFD") // Separa os caracteres dos acentos
            .replace(/[\u0300-\u036f]/g, ""); // Remove os acentos
        
        return `status-${normalizedStatus.replace(/\s+/g, '-')}`;
    }

    // --- Lógica de UI para os Dropdowns (sem alterações) ---
    function setupDropdowns() { /* ...código não muda... */ }
    function closeAllDropdowns() { /* ...código não muda... */ }
    function populateFilters() { /* ...código não muda... */ }
    function applyFilters() { /* ...código não muda... */ }

    // --- Função de Renderização Principal (COM A CORREÇÃO DE ORDEM) ---
    function renderTimelineView(projectsToRender) {
        timelineContainer.innerHTML = '';
        const validProjects = projectsToRender.filter(p => p.startDate && p.endDate && !isNaN(p.startDate.getTime()) && !isNaN(p.endDate.getTime())).sort((a, b) => a.startDate - b.startDate);
        if (validProjects.length === 0) { timelineContainer.innerHTML = '<p>Nenhum projeto encontrado com os filtros selecionados.</p>'; return; }
        
        let minDate, maxDate;
        const filterStartValue = filterStartDate.value;
        const filterEndValue = filterEndDate.value;
        if (filterStartValue && filterEndValue) { minDate = new Date(filterStartValue + 'T00:00:00'); maxDate = new Date(filterEndValue + 'T23:59:59'); } else { minDate = new Date(Math.min(...validProjects.map(p => p.startDate))); maxDate = new Date(Math.max(...validProjects.map(p => p.endDate))); }
        minDate.setDate(1);
        
        const monthDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + maxDate.getMonth() - minDate.getMonth();
        const totalMonths = monthDiff + 1;
        let monthsHtml = '', totalDays = 0;
        const monthWidthPercentage = 100 / totalMonths;
        for (let i = 0; i < totalMonths; i++) { const currentMonthDate = new Date(minDate.getFullYear(), minDate.getMonth() + i, 1); const monthName = currentMonthDate.toLocaleString('pt-BR', { month: 'short' }); const year = currentMonthDate.getFullYear(); const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate(); totalDays += daysInMonth; monthsHtml += `<div class="month" style="width: ${monthWidthPercentage}%">${monthName} '${String(year).slice(-2)}</div>`; }
        
        let projectRowsHtml = '';
        const timelineGridWidth = timelineContainer.offsetWidth;

        validProjects.forEach((project, index) => {
            if (project.endDate >= minDate && project.startDate <= maxDate) {
                const daysSinceStart = Math.floor((project.startDate - minDate) / (1000 * 60 * 60 * 24));
                const durationInDays = Math.ceil((project.endDate - project.startDate) / (1000 * 60 * 60 * 24)) + 1;
                const leftPercent = (daysSinceStart / totalDays) * 100;
                const widthPercent = (durationInDays / totalDays) * 100;
                const barTitle = `${project.name} (Responsável: ${project.manager}, Status: ${project.status})`;
                
                const statusClass = generateStatusClass(project.status);

                textMeasurer.textContent = project.name;
                const textWidth = textMeasurer.offsetWidth;
                const barWidthInPixels = (timelineGridWidth * widthPercent) / 100;
                let labelHtml;
                const showTextOutside = textWidth > (barWidthInPixels - 20);
                if (showTextOutside) {
                    labelHtml = `<div class="bar-label bar-label-outside" style="left: calc(${leftPercent}% + ${widthPercent}% + 5px);">${project.name}</div>`;
                } else {
                    labelHtml = `<div class="bar-label bar-label-inside" style="left: ${leftPercent}%; width: ${widthPercent}%;">${project.name}</div>`;
                }
                const iconLeft = `calc(${leftPercent}% + ${widthPercent}%)`;
                
                projectRowsHtml += `
                    <div class="timeline-row ${statusClass}" style="grid-row: ${index + 1};">
                        <div class="bar-background"></div>
                        <div class="bar-element" style="left: ${leftPercent}%; width: ${widthPercent}%;" title="${barTitle}"></div>
                        ${labelHtml}
                        <div style="position: absolute; left: ${iconLeft}; top: 0; height: 100%;">
                           ${getManagerIcon(project.manager)}
                        </div>
                    </div>
                `;
            }
        });
        
        timelineContainer.innerHTML = `
            <div class="timeline-months"><div class="months-grid">${monthsHtml}</div></div>
            <div class="timeline-grid">
                <div class="project-bars">${projectRowsHtml}</div>
            </div>
        `;
        
        const today = new Date();
        if (today >= minDate && today <= maxDate) {
            const daysSinceStart = (today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            const leftPosition = (daysSinceStart / totalDays) * 100;
            if (leftPosition >= 0 && leftPosition <= 100) {
                const marker = document.createElement('div');
                marker.className = 'today-marker';
                marker.style.left = `${leftPosition}%`;
                const gridContainer = timelineContainer.querySelector('.timeline-grid');
                if (gridContainer) { gridContainer.appendChild(marker); }
            }
        }
    }
    
    // ... O resto do código (funções de filtro, inicialização, etc.) permanece exatamente o mesmo.
    // Cole o bloco completo abaixo para garantir.

    function setupDropdowns() { [managerFilterBtn, statusFilterBtn, yearFilterBtn].forEach(btn => { btn.addEventListener('click', (event) => { event.stopPropagation(); closeAllDropdowns(); btn.nextElementSibling.classList.toggle('show'); }); }); window.addEventListener('click', (event) => { if (!event.target.matches('.dropdown-btn')) { closeAllDropdowns(); } }); }
    function closeAllDropdowns() { [managerFilterPanel, statusFilterPanel, yearFilterPanel].forEach(panel => { panel.classList.remove('show'); }); }
    function populateFilters() {
        const managers = [...new Set(allProjects.map(p => p.manager).filter(Boolean))].sort();
        const statuses = [...new Set(allProjects.map(p => p.status).filter(Boolean))].sort();
        const years = [...new Set(allProjects.map(p => p.ano).filter(Boolean))].sort((a, b) => b - a);
        managerFilterPanel.innerHTML = ''; statusFilterPanel.innerHTML = ''; yearFilterPanel.innerHTML = '';
        const createCheckbox = (value, name, panel) => { const label = document.createElement('label'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.name = name; checkbox.value = value; label.appendChild(checkbox); label.appendChild(document.createTextNode(` ${value}`)); panel.appendChild(label); };
        managers.forEach(m => createCheckbox(m, 'manager', managerFilterPanel));
        statuses.forEach(s => createCheckbox(s, 'status', statusFilterPanel));
        years.forEach(y => createCheckbox(y, 'year', yearFilterPanel));
        const adjustWidth = (panel, button) => { panel.style.display = 'block'; panel.style.visibility = 'hidden'; panel.style.position = 'absolute'; const panelWidth = panel.scrollWidth; button.style.width = `${panelWidth + 30}px`; panel.style.display = ''; panel.style.visibility = ''; panel.style.position = ''; };
        adjustWidth(managerFilterPanel, managerFilterBtn);
        adjustWidth(statusFilterPanel, statusFilterBtn);
        adjustWidth(yearFilterPanel, yearFilterBtn);
    }
    function applyFilters() {
        const startDateValue = filterStartDate.value; const endDateValue = filterEndDate.value;
        const selectedManagers = Array.from(document.querySelectorAll('input[name="manager"]:checked')).map(cb => cb.value);
        const selectedStatuses = Array.from(document.querySelectorAll('input[name="status"]:checked')).map(cb => cb.value);
        const selectedYears = Array.from(document.querySelectorAll('input[name="year"]:checked')).map(cb => cb.value);
        let filteredProjects = allProjects;
        if (startDateValue && endDateValue) { const startDate = new Date(startDateValue + 'T00:00:00'); const endDate = new Date(endDateValue + 'T23:59:59'); filteredProjects = filteredProjects.filter(p => p.endDate >= startDate && p.startDate <= endDate); }
        if (selectedManagers.length > 0) { const lowerSelectedManagers = selectedManagers.map(m => m.trim().toLowerCase()); filteredProjects = filteredProjects.filter(p => p.manager && lowerSelectedManagers.includes(p.manager.trim().toLowerCase())); }
        if (selectedStatuses.length > 0) { const lowerSelectedStatuses = selectedStatuses.map(s => s.trim().toLowerCase()); filteredProjects = filteredProjects.filter(p => p.status && lowerSelectedStatuses.includes(p.status.trim().toLowerCase())); }
        if (selectedYears.length > 0) { filteredProjects = filteredProjects.filter(p => p.ano && selectedYears.includes(p.ano.trim())); }
        renderTimelineView(filteredProjects);
        closeAllDropdowns();
    }
    clearFiltersBtn.addEventListener('click', () => {
        filterStartDate.value = ''; filterEndDate.value = '';
        document.querySelectorAll('.dropdown-panel input[type="checkbox"]').forEach(cb => cb.checked = false);
        renderTimelineView(allProjects);
    });
    applyFiltersBtn.addEventListener('click', applyFilters);
    async function loadProjectsFromSheet() {
        timelineContainer.innerHTML = '<p>A carregar projetos da planilha...</p>';
        try {
            const response = await fetch(googleSheetUrl);
            if (!response.ok) throw new Error('Falha ao carregar a planilha.');
            const csvText = await response.text();
            const lines = csvText.trim().split('\n');
            const headers = parseCsvLine(lines[0]).map(h => h.trim());
            const indices = { name: headers.indexOf('Resumo'), desc: headers.indexOf('Descrição'), impact: headers.indexOf('Impacto'), effort: headers.indexOf('Esforco'), complexity: headers.indexOf('Complexidade'), startDate: headers.indexOf('Start date'), endDate: headers.indexOf('Data limite'), manager: headers.indexOf('Responsável'), status: headers.indexOf('Status'), ano: headers.indexOf('Ano') };
            if (indices.name === -1) throw new Error("Coluna 'Resumo' não encontrada.");
            allProjects = lines.slice(1).filter(line => line.trim() !== '').map(line => {
                const data = parseCsvLine(line);
                if (data.length < headers.length) return null;
                const startDate = parseBrazilianDate(data[indices.startDate]);
                const endDate = parseBrazilianDate(data[indices.endDate]);
                return { name: data[indices.name] || '', description: data[indices.desc] || '', impact: parseInt(data[indices.impact], 10) || 0, effort: parseInt(data[indices.effort], 10) || 0, complexity: data[indices.complexity] || 'Não definida', startDate: startDate, endDate: endDate, manager: data[indices.manager] || 'Não definido', status: data[indices.status] || 'Não definida', ano: data[indices.ano] || '' };
            }).filter(project => project !== null);
            if (allProjects.length > 0) {
                populateFilters();
                renderTimelineView(allProjects);
            } else {
                throw new Error("Nenhum projeto foi processado com sucesso.");
            }
        } catch (error) {
            console.error('ERRO CRÍTICO DURANTE O CARREGAMENTO:', error);
            timelineContainer.innerHTML = `<p style="color: red;">Erro ao carregar projetos. Verifique a consola (F12) para detalhes.</p>`;
        }
    }
    setupDropdowns();
    loadProjectsFromSheet();
});