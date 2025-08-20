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
    const managerFilterBtn = document.getElementById('manager-filter-btn');
    const statusFilterBtn = document.getElementById('status-filter-btn');
    const textMeasurer = document.createElement('div');
    textMeasurer.className = 'text-measurer';
    document.body.appendChild(textMeasurer);
    const groupByManagerCheckbox = document.getElementById('group-by-manager-checkbox');
    const yearFilterOptionsContainer = document.getElementById('year-filter-options');
    let allProjects = [];

    // --- Funções Ajudantes (sem alterações) ---
    function parseBrazilianDate(dateStr) { /* ... */ }
    function parseCsvLine(line) { /* ... */ }
    function getManagerIcon(name) { /* ... */ }
    function generateStatusClass(status) { /* ... */ }
    
    // --- Lógica de UI para os Dropdowns (sem alterações) ---
    function setupDropdowns() { /* ... */ }
    function closeAllDropdowns() { /* ... */ }

    // --- Funções de Renderização e Filtros ---
    function populateFilters() {
        const managers = [...new Set(allProjects.map(p => p.manager).filter(Boolean))].sort();
        const statuses = [...new Set(allProjects.map(p => p.status).filter(Boolean))].sort();
        const years = [...new Set(allProjects.map(p => p.ano).filter(Boolean))].sort((a, b) => b - a);
        
        managerFilterPanel.innerHTML = '';
        statusFilterPanel.innerHTML = '';
        yearFilterOptionsContainer.innerHTML = '';

        const createCheckbox = (value, name, panel) => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = name;
            checkbox.value = value;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${value}`));
            panel.appendChild(label);
        };
        
        managers.forEach(m => createCheckbox(m, 'manager', managerFilterPanel));
        statuses.forEach(s => createCheckbox(s, 'status', statusFilterPanel));
        years.forEach(y => createCheckbox(y, 'year', yearFilterOptionsContainer));
        
        // **MUDANÇA AQUI**: Adiciona um "ouvinte" a cada checkbox de ano
        document.querySelectorAll('#year-filter-options input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', applyFilters);
        });

        const adjustWidth = (panel, button) => {
            panel.style.display = 'block';
            panel.style.visibility = 'hidden';
            panel.style.position = 'absolute';
            const panelWidth = panel.scrollWidth;
            button.style.width = `${panelWidth + 30}px`;
            panel.style.display = '';
            panel.style.visibility = '';
            panel.style.position = '';
        };

        adjustWidth(managerFilterPanel, managerFilterBtn);
        adjustWidth(statusFilterPanel, statusFilterBtn);
    }
    
    function applyFilters() { /* ...código não muda... */ }
    function renderTimelineView(projectsToRender) { /* ...código não muda... */ }
    
    // --- Lógica de Eventos e Inicialização ---
    // (A lógica de limpar filtros também já inclui os filtros de ano, sem precisar de mudanças)
    clearFiltersBtn.addEventListener('click', () => { /* ...código não muda... */ });
    applyFiltersBtn.addEventListener('click', applyFilters);
    groupByManagerCheckbox.addEventListener('change', applyFilters);
    
    async function loadProjectsFromSheet() { /* ...código não muda... */ }
    setupDropdowns();
    loadProjectsFromSheet();

    // Cole o código completo das funções que não mudaram para manter tudo funcional
    function parseBrazilianDate(dateStr) { if (!dateStr || typeof dateStr !== 'string') return null; const parts = dateStr.split('/'); if (parts.length !== 3) return null; const day = parseInt(parts[0], 10); const month = parseInt(parts[1], 10) - 1; const year = parseInt(parts[2], 10); if (isNaN(day) || isNaN(month) || isNaN(year)) return null; const date = new Date(year, month, day); if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) { return null; } return date; }
    function parseCsvLine(line) { const result = []; let current = ''; let inQuotes = false; for (let i = 0; i < line.length; i++) { const char = line[i]; if (char === '"' && (i === 0 || line[i-1] !== '\\')) { inQuotes = !inQuotes; } else if (char === ',' && !inQuotes) { result.push(current.replace(/^"|"$/g, '').trim()); current = ''; } else { current += char; } } result.push(current.replace(/^"|"$/g, '').trim()); return result; }
    function getManagerIcon(name) { if (!name || name === 'Não definido') return ''; const getInitials = (fullName) => { const names = fullName.split(' '); if (names.length === 1) return names[0].substring(0, 2).toUpperCase(); return (names[0][0] + names[names.length - 1][0]).toUpperCase(); }; const generateColor = (str) => { let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } const h = hash % 360; return `hsl(${h}, 60%, 45%)`; }; const initials = getInitials(name); const color = generateColor(name); return `<div class="manager-icon" style="background-color: ${color};" title="${name}">${initials}</div>`; }
    function generateStatusClass(status) { if (!status) return ''; const normalizedStatus = status.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); return `status-${normalizedStatus.replace(/\s+/g, '-')}`; }
    function setupDropdowns() { [managerFilterBtn, statusFilterBtn].forEach(btn => { btn.addEventListener('click', (event) => { event.stopPropagation(); closeAllDropdowns(); btn.nextElementSibling.classList.toggle('show'); }); }); window.addEventListener('click', (event) => { if (!event.target.matches('.dropdown-btn')) { closeAllDropdowns(); } }); }
    function closeAllDropdowns() { [managerFilterPanel, statusFilterPanel].forEach(panel => { panel.classList.remove('show'); }); }
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
    function renderTimelineView(projectsToRender) {
        timelineContainer.innerHTML = '';
        const validProjects = projectsToRender.filter(p => p.startDate && p.endDate && !isNaN(p.startDate.getTime()));
        if (validProjects.length === 0) { timelineContainer.innerHTML = '<p>Nenhum projeto encontrado com os filtros selecionados.</p>'; return; }
        const isGroupingEnabled = groupByManagerCheckbox.checked;
        let minDate, maxDate;
        const filterStartValue = filterStartDate.value;
        const filterEndValue = filterEndDate.value;
        if (filterStartValue && filterEndValue) { minDate = new Date(filterStartValue + 'T00:00:00'); maxDate = new Date(filterEndValue + 'T23:59:59'); } else { minDate = new Date(Math.min(...validProjects.map(p => p.startDate))); maxDate = new Date(Math.max(...validProjects.map(p => p.endDate))); }
        minDate.setDate(1);
        const PIXELS_PER_DAY = 3;
        const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        let monthsHtml = '';
        let currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            const monthName = currentDate.toLocaleString('pt-BR', { month: 'short' });
            const year = currentDate.getFullYear();
            const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
            const monthWidthInPixels = daysInMonth * PIXELS_PER_DAY;
            monthsHtml += `<div class="month" style="width: ${monthWidthInPixels}px">${monthName} '${String(year).slice(-2)}</div>`;
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        let projectRowsHtml = '';
        const timelineGridTotalWidth = totalDays * PIXELS_PER_DAY;
        const drawProjectRow = (project, rowIndex) => {
            let rowHtml = '';
            if (project.endDate >= minDate && project.startDate <= maxDate) {
                const daysSinceStart = Math.floor((project.startDate - minDate) / (1000 * 60 * 60 * 24));
                const durationInDays = Math.ceil((project.endDate - project.startDate) / (1000 * 60 * 60 * 24)) + 1;
                const leftInPixels = daysSinceStart * PIXELS_PER_DAY;
                const widthInPixels = durationInDays * PIXELS_PER_DAY;
                const barTitle = `${project.name} (Responsável: ${project.manager}, Status: ${project.status})`;
                const statusClass = generateStatusClass(project.status);
                textMeasurer.textContent = project.name;
                const textWidth = textMeasurer.offsetWidth;
                let labelHtml;
                const showTextOutside = textWidth > (widthInPixels - 20);
                if (showTextOutside) {
                    labelHtml = `<div class="bar-label bar-label-outside" style="left: ${leftInPixels + widthInPixels}px;">${project.name}</div>`;
                } else {
                    labelHtml = `<div class="bar-label bar-label-inside" style="left: ${leftInPixels}px; width: ${widthInPixels}px;">${project.name}</div>`;
                }
                const iconLeft = leftInPixels + widthInPixels;
                rowHtml = `<div class="timeline-row ${statusClass}" style="grid-row: ${rowIndex};"><div class="bar-background"></div><div class="bar-element" style="left: ${leftInPixels}px; width: ${widthInPixels}px;" title="${barTitle}"></div>${labelHtml}<div style="position: absolute; left: ${iconLeft}px; top: 0; height: 100%;">${getManagerIcon(project.manager)}</div></div>`;
            }
            return rowHtml;
        };
        if (isGroupingEnabled) {
            const groupedProjects = validProjects.reduce((acc, project) => { const manager = project.manager || 'Não atribuído'; if (!acc[manager]) acc[manager] = []; acc[manager].push(project); return acc; }, {});
            let rowIndex = 0;
            Object.keys(groupedProjects).sort().forEach(manager => {
                rowIndex++;
                projectRowsHtml += `<div class="timeline-group-header" style="grid-row: ${rowIndex}; width: ${timelineGridTotalWidth}px;">${manager}</div>`;
                groupedProjects[manager].sort((a, b) => a.startDate - b.startDate).forEach(project => {
                    rowIndex++;
                    projectRowsHtml += drawProjectRow(project, rowIndex);
                });
            });
        } else {
            validProjects.sort((a, b) => a.startDate - b.startDate).forEach((project, index) => {
                projectRowsHtml += drawProjectRow(project, index + 1);
            });
        }
        const finalHtml = `<div class="timeline-months" style="width: ${timelineGridTotalWidth}px;"><div class="months-grid">${monthsHtml}</div></div><div class="timeline-grid" style="width: ${timelineGridTotalWidth}px;"><div class="project-bars">${projectRowsHtml}</div></div>`;
        timelineContainer.innerHTML = finalHtml;
        const today = new Date();
        if (today >= minDate && today <= maxDate) {
            const daysSinceStart = (today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
            const leftPositionInPixels = daysSinceStart * PIXELS_PER_DAY;
            const marker = document.createElement('div');
            marker.className = 'today-marker';
            marker.style.left = `${leftPositionInPixels}px`;
            const gridContainer = timelineContainer.querySelector('.timeline-grid');
            if (gridContainer) { gridContainer.appendChild(marker); }
        }
    }
    clearFiltersBtn.addEventListener('click', () => {
        filterStartDate.value = ''; filterEndDate.value = '';
        document.querySelectorAll('.filter-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('#year-filter-options input[type="checkbox"]').forEach(cb => cb.checked = false);
        groupByManagerCheckbox.checked = false;
        renderTimelineView(allProjects);
    });
    applyFiltersBtn.addEventListener('click', applyFilters);
    groupByManagerCheckbox.addEventListener('change', applyFilters);
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
});