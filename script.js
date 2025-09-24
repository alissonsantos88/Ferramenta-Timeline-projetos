document.addEventListener('DOMContentLoaded', () => {
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQniCPkmq4_ulsrLazTWhWv9-bcziIJwAwRz73EesRu0nTSjxqgEjMNJ1c_8QBsEUJsvMuSDLjc9at-/pub?output=csv';

    const container = document.querySelector('.container');
    const mainActionsContainer = document.querySelector('.main-actions-container');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const timelineContainer = document.getElementById('timeline-container');
    const unscheduledContainer = document.getElementById('unscheduled-container');
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const managerFilterPanel = document.getElementById('manager-filter-panel');
    const statusFilterPanel = document.getElementById('status-filter-panel');
    const yearFilterOptionsContainer = document.getElementById('year-filter-options');
    const managerFilterBtn = document.getElementById('manager-filter-btn');
    const statusFilterBtn = document.getElementById('status-filter-btn');
    const textMeasurer = document.createElement('div');
    textMeasurer.className = 'text-measurer';
    document.body.appendChild(textMeasurer);
    const groupByManagerCheckbox = document.getElementById('group-by-manager-checkbox');
    const sortByDateCheckbox = document.getElementById('sort-by-date-checkbox');
    const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    const allFiltersPanel = document.getElementById('all-filters-panel');

    let allProjects = [];
    let originalProjects = [];
    let isEditMode = false;
    let minDate, maxDate;
    let isInitialLoad = true;
    const PIXELS_PER_DAY = 3;

    function parseBrazilianDate(dateStr) { if (!dateStr || typeof dateStr !== 'string') return null; const parts = dateStr.split('/'); if (parts.length !== 3) return null; const day = parseInt(parts[0], 10); const month = parseInt(parts[1], 10) - 1; const year = parseInt(parts[2], 10); if (isNaN(day) || isNaN(month) || isNaN(year)) return null; const date = new Date(year, month, day); if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) { return null; } return date; }
    function parseCsvLine(line) { const result = []; let current = ''; let inQuotes = false; for (let i = 0; i < line.length; i++) { const char = line[i]; if (char === '"' && (i === 0 || line[i-1] !== '\\')) { inQuotes = !inQuotes; } else if (char === ',' && !inQuotes) { result.push(current.replace(/^"|"$/g, '').trim()); current = ''; } else { current += char; } } result.push(current.replace(/^"|"$/g, '').trim()); return result; }
    function getManagerIcon(name) { if (!name || name === 'Não definido') return ''; const getInitials = (fullName) => { const names = fullName.split(' '); if (names.length === 1) return names[0].substring(0, 2).toUpperCase(); return (names[0][0] + names[names.length - 1][0]).toUpperCase(); }; const generateColor = (str) => { let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } const h = hash % 360; return `hsl(${h}, 60%, 45%)`; }; const initials = getInitials(name); const color = generateColor(name); return `<div class="manager-icon" style="background-color: ${color};" title="${name}">${initials}</div>`; }
    function generateStatusClass(status) { if (!status) return ''; const normalizedStatus = status.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); return `status-${normalizedStatus.replace(/\s+/g, '-')}`; }
    
    function setupDropdowns() {
        [managerFilterBtn, statusFilterBtn].forEach(btn => {
            if(btn) btn.addEventListener('click', (event) => {
                event.stopPropagation();
                closeAllDropdowns();
                btn.nextElementSibling.classList.toggle('show');
            });
        });
        window.addEventListener('click', (event) => { if (!event.target.matches('.dropdown-btn')) { closeAllDropdowns(); } });
    }
    function closeAllDropdowns() { [managerFilterPanel, statusFilterPanel].forEach(panel => { if(panel) panel.classList.remove('show'); }); }

    toggleFiltersBtn.addEventListener('click', () => {
        allFiltersPanel.classList.toggle('show');
        if (allFiltersPanel.classList.contains('show')) {
            toggleFiltersBtn.textContent = 'Ocultar Filtros';
        } else {
            toggleFiltersBtn.textContent = 'Mostrar Filtros';
        }
    });

    editModeBtn.addEventListener('click', () => {
        isEditMode = !isEditMode;
        container.classList.toggle('edit-mode-active');
        if (isEditMode) {
            editModeBtn.textContent = 'Sair do Modo de Edição';
            const saveBtn = document.createElement('a');
            saveBtn.id = 'save-changes-btn';
            saveBtn.textContent = 'Salvar Alterações';
            saveBtn.href = "#";
            mainActionsContainer.appendChild(saveBtn);
            saveBtn.addEventListener('click', (event) => {
                const changesReport = findChanges();
                if (!changesReport) {
                    alert("Nenhuma alteração foi detetada para salvar.");
                    event.preventDefault();
                    return;
                }
                const reportTitle = "Relatório de Alterações - Linha do Tempo de Projetos";
                const emailTo = 'substitua.pelo.email@desejado.com';
                const subject = encodeURIComponent(reportTitle);
                let body = "Olá,\n\nSeguem as alterações realizadas na linha do tempo para atualização no Jira:\n\n";
                body += "--------------------------------------\n\n";
                body += changesReport;
                const encodedBody = encodeURIComponent(body);
                saveBtn.href = `mailto:${emailTo}?subject=${subject}&body=${encodedBody}`;
            });
        } else {
            editModeBtn.textContent = 'Entrar em Modo de Edição';
            const saveBtn = document.getElementById('save-changes-btn');
            if (saveBtn) saveBtn.remove();
            interact('.timeline-row').unset();
            interact('.bar-element').unset();
            interact('.timeline-group-header').unset();
            interact('.unscheduled-item').unset();
            interact('.timeline-grid').unset();
            allProjects = JSON.parse(JSON.stringify(originalProjects)).map(project => {
                project.startDate = project.startDate ? new Date(project.startDate) : null;
                project.endDate = project.endDate ? new Date(project.endDate) : null;
                return project;
            });
        }
        applyFilters();
    });

    function findChanges() {
        const changes = [];
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric'}) : 'N/D';
        for (const original of originalProjects) {
            const current = allProjects.find(p => p.name === original.name);
            if (current) {
                const changesForProject = [];
                if (formatDate(original.startDate) !== formatDate(current.startDate) || formatDate(original.endDate) !== formatDate(current.endDate)) {
                    changesForProject.push(`  Como era (Datas): ${formatDate(original.startDate)} a ${formatDate(original.endDate)}\n  Como ficou (Datas): ${formatDate(current.startDate)} a ${formatDate(current.endDate)}`);
                }
                if (original.manager !== current.manager) {
                    changesForProject.push(`  Como era (Responsável): ${original.manager}\n  Como ficou (Responsável): ${current.manager}`);
                }
                if (changesForProject.length > 0) {
                    changes.push(`Projeto: ${original.name}\n${changesForProject.join('\n')}`);
                }
            }
        }
        return changes.length > 0 ? changes.join('\n\n--------------------------------------\n\n') : null;
    }

    function setupInteractions() {
        interact('.timeline-row').draggable({
            listeners: {
                start (event) { if (!isEditMode) return; const allVisualElements = event.target.querySelectorAll('.bar-element, .bar-label, .manager-icon-container'); allVisualElements.forEach(el => el.setAttribute('data-x', 0)); },
                move (event) { if (!isEditMode) return; const allVisualElements = event.target.querySelectorAll('.bar-element, .bar-label, .manager-icon-container'); allVisualElements.forEach(el => { const x = (parseFloat(el.getAttribute('data-x')) || 0) + event.dx; el.style.transform = `translateX(${x}px)`; el.setAttribute('data-x', x); }); },
                end (event) {
                    if (!isEditMode) return;
                    const projectName = event.target.dataset.projectName;
                    const project = allProjects.find(p => p.name === projectName);
                    const barElement = event.target.querySelector('.bar-element');
                    if (!project || !project.startDate || !barElement) return;
                    const totalDx = parseFloat(barElement.getAttribute('data-x')) || 0;
                    const dayChange = Math.round(totalDx / PIXELS_PER_DAY);
                    if (dayChange !== 0) {
                        project.startDate.setDate(project.startDate.getDate() + dayChange);
                        project.endDate.setDate(project.endDate.getDate() + dayChange);
                    }
                    const scrollLeft = timelineContainer.scrollLeft;
                    renderTimelineView(getCurrentlyFilteredProjects());
                    timelineContainer.scrollLeft = scrollLeft;
                }
            }
        });
        interact('.bar-element').resizable({
            edges: { left: true, right: true },
            listeners: {
                start (event) { if (!isEditMode) return; event.target.setAttribute('data-x', 0); },
                move(event) { if (!isEditMode) return; const target = event.target; let x = parseFloat(target.getAttribute('data-x')) || 0; target.style.width = `${event.rect.width}px`; x += event.deltaRect.left; target.style.transform = `translateX(${x}px)`; target.setAttribute('data-x', x); },
                end(event) {
                    if (!isEditMode) return;
                    const barContent = event.target;
                    const projectName = barContent.closest('.timeline-row').dataset.projectName;
                    const project = allProjects.find(p => p.name === projectName);
                    if (!project || !project.startDate) return;
                    const dayChange = Math.round((parseFloat(barContent.getAttribute('data-x')) || 0) / PIXELS_PER_DAY);
                    const newDurationInDays = Math.max(1, Math.round(event.rect.width / PIXELS_PER_DAY));
                    project.startDate.setDate(project.startDate.getDate() + dayChange);
                    project.endDate = new Date(project.startDate);
                    project.endDate.setDate(project.endDate.getDate() + newDurationInDays - 1);
                    const scrollLeft = timelineContainer.scrollLeft;
                    renderTimelineView(getCurrentlyFilteredProjects());
                    timelineContainer.scrollLeft = scrollLeft;
                }
            }
        });
        interact('.timeline-group-header').dropzone({
            accept: '.timeline-row',
            listeners: {
                ondropactivate(event) { document.querySelectorAll('.timeline-group-header').forEach(el => el.classList.add('drop-active')); },
                ondragenter(event) { event.target.classList.add('drop-enter'); },
                ondragleave(event) { event.target.classList.remove('drop-enter'); },
                ondrop(event) {
                    const draggedElement = event.relatedTarget;
                    const dropzoneElement = event.target;
                    const projectName = draggedElement.dataset.projectName;
                    const newManager = dropzoneElement.dataset.managerGroup;
                    const project = allProjects.find(p => p.name === projectName);
                    if (project && project.manager !== newManager) {
                        project.manager = newManager;
                        renderTimelineView(getCurrentlyFilteredProjects());
                    }
                },
                ondropdeactivate(event) { document.querySelectorAll('.timeline-group-header').forEach(el => { el.classList.remove('drop-active'); el.classList.remove('drop-enter'); }); }
            }
        });
        interact('.unscheduled-item').draggable({
            listeners: {
                start (event) { if (!isEditMode) return; event.target.classList.add('is-dragging'); },
                end (event) { event.target.classList.remove('is-dragging'); }
            }
        });
        interact('.timeline-grid').dropzone({
            accept: '.unscheduled-item',
            listeners: {
                ondropactivate(event) { document.querySelectorAll('.timeline-grid').forEach(el => el.classList.add('drop-active')); },
                ondragenter(event) { event.target.classList.add('drop-enter'); },
                ondragleave(event) { event.target.classList.remove('drop-enter'); },
                ondrop(event) {
                    const droppedItem = event.relatedTarget;
                    const timelineGrid = event.target;
                    const projectName = droppedItem.dataset.projectName;
                    const project = allProjects.find(p => p.name === projectName);
                    if (project && minDate) {
                        const gridRect = timelineGrid.getBoundingClientRect();
                        const dropX = event.client.x - gridRect.left + timelineGrid.parentElement.scrollLeft;
                        const daysFromStart = Math.floor(dropX / PIXELS_PER_DAY);
                        const newStartDate = new Date(minDate);
                        newStartDate.setDate(newStartDate.getDate() + daysFromStart);
                        const newEndDate = new Date(newStartDate);
                        newEndDate.setDate(newEndDate.getDate() + 6);
                        project.startDate = newStartDate;
                        project.endDate = newEndDate;
                        applyFilters();
                    }
                },
                ondropdeactivate(event) { document.querySelectorAll('.timeline-grid').forEach(el => { el.classList.remove('drop-active'); el.classList.remove('drop-enter'); }); }
            }
        });
    }

    function populateFilters() {
        const managers = [...new Set(originalProjects.map(p => p.manager).filter(Boolean))].sort();
        const statuses = [...new Set(originalProjects.map(p => p.status).filter(Boolean))].sort();
        const years = [...new Set(originalProjects.map(p => p.ano).filter(Boolean))].sort((a, b) => b - a);
        managerFilterPanel.innerHTML = ''; statusFilterPanel.innerHTML = ''; yearFilterOptionsContainer.innerHTML = '';
        const createCheckbox = (value, name, panel) => { const label = document.createElement('label'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.name = name; checkbox.value = value; label.appendChild(checkbox); label.appendChild(document.createTextNode(` ${value}`)); panel.appendChild(label); };
        managers.forEach(m => createCheckbox(m, 'manager', managerFilterPanel));
        statuses.forEach(s => createCheckbox(s, 'status', statusFilterPanel));
        years.forEach(y => createCheckbox(y, 'year', yearFilterOptionsContainer));
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => { checkbox.addEventListener('change', applyFilters); });
        const adjustWidth = (panel, button) => { if(panel && button) { panel.style.display = 'block'; panel.style.visibility = 'hidden'; panel.style.position = 'absolute'; const panelWidth = panel.scrollWidth; button.style.width = `${panelWidth + 35}px`; panel.style.display = ''; panel.style.visibility = ''; panel.style.position = ''; } };
        adjustWidth(managerFilterPanel, managerFilterBtn);
        adjustWidth(statusFilterPanel, statusFilterBtn);
    }
    
    function getCurrentlyFilteredProjects() {
        const startDateValue = filterStartDate.value; const endDateValue = filterEndDate.value;
        const selectedManagers = Array.from(document.querySelectorAll('input[name="manager"]:checked')).map(cb => cb.value);
        const selectedStatuses = Array.from(document.querySelectorAll('input[name="status"]:checked')).map(cb => cb.value);
        const selectedYears = Array.from(document.querySelectorAll('input[name="year"]:checked')).map(cb => cb.value);
        let filteredProjects = allProjects;
        if (startDateValue && endDateValue) { const startDate = new Date(startDateValue + 'T00:00:00'); const endDate = new Date(endDateValue + 'T23:59:59'); filteredProjects = filteredProjects.filter(p => p.startDate && p.endDate && new Date(p.endDate) >= startDate && new Date(p.startDate) <= endDate); }
        if (selectedManagers.length > 0) { const lowerSelectedManagers = selectedManagers.map(m => m.trim().toLowerCase()); filteredProjects = filteredProjects.filter(p => p.manager && lowerSelectedManagers.includes(p.manager.trim().toLowerCase())); }
        if (selectedStatuses.length > 0) { const lowerSelectedStatuses = selectedStatuses.map(s => s.trim().toLowerCase()); filteredProjects = filteredProjects.filter(p => p.status && lowerSelectedStatuses.includes(p.status.trim().toLowerCase())); }
        if (selectedYears.length > 0) { filteredProjects = filteredProjects.filter(p => p.ano && selectedYears.includes(p.ano.trim())); }
        return filteredProjects;
    }

    function applyFilters() {
        const projectsToDisplay = getCurrentlyFilteredProjects();
        renderTimelineView(projectsToDisplay);
        closeAllDropdowns();
    }
    
    function renderTimelineView(projectsToRender) {
        const isGroupingEnabled = groupByManagerCheckbox.checked;
        const statusesForUnscheduled = ['BACKLOG', 'PRIORIZADOS'];
        
        let projectsForTimeline = projectsToRender.filter(p => p.startDate);
        const unscheduledProjects = projectsToRender.filter(p => !p.startDate && p.status && statusesForUnscheduled.includes(p.status.toUpperCase()));

        if (isEditMode) {
            const statusesToHide = ['concluido', 'fechado', 'cancelado', 'concluidos', 'fechados', 'cancelados'];
            projectsForTimeline = projectsForTimeline.filter(p => {
                const projectStatus = generateStatusClass(p.status).replace('status-', '');
                return !statusesToHide.includes(projectStatus);
            });
        }
        
        timelineContainer.innerHTML = '';
        let validProjects = projectsForTimeline.filter(p => p.endDate && !isNaN(new Date(p.startDate).getTime()));
        
        if (sortByDateCheckbox.checked && !isGroupingEnabled) {
            validProjects.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        }
        
        if (validProjects.length === 0) {
            timelineContainer.innerHTML = '<p style="color: #333;">Nenhum projeto agendado encontrado com os filtros selecionados.</p>';
            minDate = allProjects.length > 0 ? new Date(Math.min(...allProjects.filter(p=>p.startDate).map(p => new Date(p.startDate)))) : new Date();
            maxDate = allProjects.length > 0 ? new Date(Math.max(...allProjects.filter(p=>p.endDate).map(p => new Date(p.endDate)))) : new Date();
        } else {
            minDate = new Date(Math.min(...validProjects.map(p => new Date(p.startDate))));
            maxDate = new Date(Math.max(...validProjects.map(p => new Date(p.endDate))));
        }

        if (filterStartDate.value && filterEndDate.value) {
            minDate = new Date(filterStartDate.value + 'T00:00:00');
            maxDate = new Date(filterEndDate.value + 'T23:59:59');
        } else if (validProjects.length === 0) {
            maxDate = new Date(minDate);
            maxDate.setMonth(maxDate.getMonth() + 6);
        }
        minDate.setDate(1);

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
            const projStartDate = new Date(project.startDate);
            const projEndDate = new Date(project.endDate);
            if (projEndDate >= minDate && projStartDate <= maxDate) {
                const daysSinceStart = Math.floor((projStartDate - minDate) / (1000 * 60 * 60 * 24));
                const durationInDays = Math.ceil((projEndDate - projStartDate) / (1000 * 60 * 60 * 24)) + 1;
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
                const iconContainerHtml = `<div class="manager-icon-container" style="position: absolute; left: ${iconLeft}px; top: 0; height: 100%;">${getManagerIcon(project.manager)}</div>`;
                rowHtml = `<div class="timeline-row ${statusClass}" data-project-name="${project.name}" style="grid-row: ${rowIndex};"><div class="bar-background"></div><div class="bar-element" style="left: ${leftInPixels}px; width: ${widthInPixels}px;" title="${barTitle}"></div>${labelHtml}${iconContainerHtml}</div>`;
            }
            return rowHtml;
        };

        if (isGroupingEnabled) {
            const groupedProjects = validProjects.reduce((acc, project) => { const manager = project.manager || 'Não atribuído'; if (!acc[manager]) acc[manager] = []; acc[manager].push(project); return acc; }, {});
            let rowIndex = 0;
            Object.keys(groupedProjects).sort().forEach(manager => {
                rowIndex++;
                projectRowsHtml += `<div class="timeline-group-header" data-manager-group="${manager}" style="grid-row: ${rowIndex}; width: ${timelineGridTotalWidth}px;">${manager}</div>`;
                groupedProjects[manager].sort((a,b)=> new Date(a.startDate) - new Date(b.startDate)).forEach(project => {
                    rowIndex++;
                    projectRowsHtml += drawProjectRow(project, rowIndex);
                });
            });
        } else {
            validProjects.forEach((project, index) => {
                projectRowsHtml += drawProjectRow(project, index + 1);
            });
        }
        
        const projectBarsGrid = `<div class="project-bars">${projectRowsHtml}</div>`;
        const timelineGrid = `<div class="timeline-grid" style="width: ${timelineGridTotalWidth}px;">${projectBarsGrid}</div>`;
        const monthsHeader = `<div class="timeline-months" style="width: ${timelineGridTotalWidth}px;"><div class="months-grid">${monthsHtml}</div></div>`;
        timelineContainer.innerHTML = monthsHeader + timelineGrid;
        
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
        
        unscheduledContainer.innerHTML = '';
        if (unscheduledProjects.length > 0 && !isGroupingEnabled) {
            let unscheduledHtml = '<h3>Projetos Não Agendados (Backlog / Priorizados)</h3><ul>';
            unscheduledProjects.sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
                unscheduledHtml += `<li class="unscheduled-item" data-project-name="${p.name}"><strong>${p.name}</strong> (Responsável: ${p.manager || 'N/D'}, Status: ${p.status})</li>`;
            });
            unscheduledHtml += '</ul>';
            unscheduledContainer.innerHTML = unscheduledHtml;
        }
        
        if (isInitialLoad) {
            const todayMarker = timelineContainer.querySelector('.today-marker');
            if (todayMarker) {
                const containerWidth = timelineContainer.clientWidth;
                const markerLeft = todayMarker.offsetLeft;
                const scrollPosition = markerLeft - (containerWidth / 2);
                timelineContainer.scrollLeft = scrollPosition < 0 ? 0 : scrollPosition;
            }
            isInitialLoad = false;
        }

        if (isEditMode) {
            setTimeout(setupInteractions, 0);
        }
    }
    
    function applyDefaultFilters() {
        const defaultStatuses = ['Backlog', 'Priorizados', 'Stand by', 'Em andamento'];
        const lowerDefaultStatuses = defaultStatuses.map(s => s.toLowerCase());

        const statusCheckboxes = document.querySelectorAll('#status-filter-panel input[type="checkbox"]');
        statusCheckboxes.forEach(checkbox => {
            if (lowerDefaultStatuses.includes(checkbox.value.toLowerCase())) {
                checkbox.checked = true;
            }
        });

        applyFilters();
    }
    
    async function loadProjectsFromSheet() {
        timelineContainer.innerHTML = '<p style="color: #333;">A carregar projetos da planilha...</p>';
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
                let startDate = parseBrazilianDate(data[indices.startDate]);
                let endDate = parseBrazilianDate(data[indices.endDate]);
                const status = (data[indices.status] || '').toUpperCase();

                if (!startDate && (status === 'BACKLOG' || status === 'PRIORIZADOS')) {
                    startDate = new Date();
                    startDate.setHours(0, 0, 0, 0);
                }

                if (startDate && !endDate) {
                    endDate = new Date(startDate);
                }
                return { name: data[indices.name] || '', description: data[indices.desc] || '', impact: parseInt(data[indices.impact], 10) || 0, effort: parseInt(data[indices.effort], 10) || 0, complexity: data[indices.complexity] || 'Não definida', startDate: startDate, endDate: endDate, manager: data[indices.manager] || 'Não definido', status: data[indices.status] || '', ano: data[indices.ano] || '' };
            }).filter(project => project !== null);
            
            originalProjects = JSON.parse(JSON.stringify(allProjects));
            
            if (allProjects.length > 0) {
                populateFilters();
                allFiltersPanel.classList.remove('show');
                toggleFiltersBtn.textContent = 'Mostrar Filtros';
                
                applyDefaultFilters();
            } else {
                throw new Error("Nenhum projeto foi processado com sucesso.");
            }
        } catch (error) {
            console.error('ERRO CRÍTICO DURANTE O CARREGAMENTO:', error);
            timelineContainer.innerHTML = `<p style="color: #dc3545;">Erro ao carregar projetos. Verifique a consola (F12) para detalhes.</p>`;
        }
    }
    
    setupDropdowns();
    loadProjectsFromSheet();
});