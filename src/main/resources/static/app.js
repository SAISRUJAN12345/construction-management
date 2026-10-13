(() => {
  'use strict';

  const API = '/api/projects';
  const PROJECT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];
  const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
  const state = { projects: [], view: 'overview', layout: 'grid', search: '', status: 'ALL', openProjectId: null, busy: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = (value) => {
    if (value === null || value === undefined || value === '') return 'Not set';
    const num = Number(value);
    if (!Number.isFinite(num)) return 'Not set';
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: num % 1 ? 2 : 0 }).format(num); }
    catch { return `₹${num.toLocaleString('en-IN')}`; }
  };
  const compactMoney = (value) => {
    const num = Number(value || 0);
    if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')} L`;
    return money(num);
  };
  const niceDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
    if (!value) return 'No date set';
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-IN', options);
  };
  const statusLabel = (status) => ({ IN_PROGRESS: 'In progress', PLANNED: 'Planned', ON_HOLD: 'On hold', COMPLETED: 'Completed', TODO: 'To do', DONE: 'Done' }[status] || status || 'Unknown');
  const statusClass = (status) => (status || '').toLowerCase().replace('_', '-');
  const projectTasks = (project) => Array.isArray(project.tasks) ? project.tasks : [];
  const allTasks = () => state.projects.flatMap(project => projectTasks(project).map(task => ({ ...task, projectId: project.id, projectName: project.name })));
  const completedTasks = (project) => projectTasks(project).filter(task => task.status === 'DONE').length;
  const percentComplete = (project) => {
    const tasks = projectTasks(project);
    if (!tasks.length) return project.status === 'COMPLETED' ? 100 : 0;
    return Math.round((completedTasks(project) / tasks.length) * 100);
  };
  const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || '?';

  async function request(path, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    const response = await fetch(path, { ...options, headers });
    if (response.status === 204) return null;
    const raw = await response.text();
    let body = null;
    if (raw) { try { body = JSON.parse(raw); } catch { body = raw; } }
    if (!response.ok) {
      let message = body?.message || body?.detail || body?.error || `Request failed (${response.status})`;
      if (body?.errors && typeof body.errors === 'object') message = Object.values(body.errors).join(' ');
      throw new Error(message);
    }
    return body;
  }

  function toast(message, isError = false) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 4200);
  }

  function setConnection(online) {
    const label = $('#connection-label');
    label.textContent = online ? 'API connected' : 'API unavailable';
    $('.live-indicator').classList.toggle('offline', !online);
  }

  async function loadProjects({ quiet = false } = {}) {
    if (state.busy) return;
    state.busy = true;
    if (!quiet) {
      $('#api-error').hidden = true;
      $('#app-content').style.opacity = '.55';
    }
    try {
      const result = await request(API);
      if (!Array.isArray(result)) throw new Error('The API response was not a project list.');
      state.projects = result;
      setConnection(true);
      $('#api-error').hidden = true;
      $('#app-content').style.display = '';
      renderAll();
      if (state.openProjectId !== null && $('#drawer-root').innerHTML) renderProjectDrawer(state.openProjectId);
    } catch (error) {
      setConnection(false);
      $('#api-error').hidden = false;
      $('#api-error-message').textContent = `${error.message}. Start the Spring Boot app and refresh this page.`;
      if (!state.projects.length) {
        $('#projects-container').innerHTML = `<div class="empty-state"><span class="empty-icon">⌁</span><strong>Project data is not available</strong><p>Start the backend using <code>./mvnw spring-boot:run</code>, then try again.</p></div>`;
        $('#upcoming-tasks').innerHTML = '<div class="empty-state"><strong>Waiting for API</strong><p>Upcoming tasks will appear here after the API connects.</p></div>';
        $('#task-progress-list').innerHTML = '';
      }
      if (!quiet) toast(error.message, true);
    } finally {
      state.busy = false;
      $('#app-content').style.opacity = '1';
    }
  }

  function renderAll() {
    const tasks = allTasks();
    const totalBudget = state.projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    $('#stat-total').textContent = state.projects.length;
    $('#stat-active').textContent = state.projects.filter(p => p.status === 'IN_PROGRESS').length;
    $('#stat-budget').textContent = compactMoney(totalBudget);
    $('#stat-budget').title = money(totalBudget);
    $('#stat-completed').textContent = `${tasks.filter(t => t.status === 'DONE').length}/${tasks.length}`;
    $('#task-completion-foot').textContent = tasks.length ? `${Math.round(tasks.filter(t => t.status === 'DONE').length / tasks.length * 100)}% of tracked tasks done` : 'No tasks recorded yet';
    $('#nav-project-count').textContent = state.projects.length;
    renderProjects();
    renderUpcomingTasks();
    renderTaskSummary();
    renderPageTitle();
  }

  function renderPageTitle() {
    const current = { overview: ['Overview', 'Good work starts with a plan', 'A clear view of your sites, progress, and next steps.'], projects: ['Projects', 'Every project, in one place', 'Keep the details, budgets, and milestones organized.'], tasks: ['Tasks', 'Small steps. Solid progress.', 'Track the work that moves each project forward.'] }[state.view];
    $('#breadcrumb-current').textContent = current[0];
    $('#page-title').innerHTML = `${escapeHtml(current[1])}<span class="title-period">.</span>`;
    $('#page-subtitle').textContent = current[2];
    $('#current-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === state.view));
  }

  function filteredProjects() {
    const needle = state.search.trim().toLowerCase();
    return state.projects.filter(project => {
      const matchesSearch = !needle || [project.name, project.location, project.clientName].some(item => String(item || '').toLowerCase().includes(needle));
      const matchesStatus = state.status === 'ALL' || project.status === state.status;
      return matchesSearch && matchesStatus;
    });
  }

  function renderProjects() {
    const container = $('#projects-container');
    if (state.view === 'tasks') {
      container.innerHTML = renderTaskTable(allTasks());
      $('#project-result-count').textContent = `${allTasks().length} tasks across ${state.projects.length} projects`;
      return;
    }
    const projects = filteredProjects();
    container.classList.toggle('projects-list', state.layout === 'list' || state.view === 'projects');
    container.classList.toggle('projects-grid', state.layout === 'grid' && state.view !== 'projects');
    container.innerHTML = projects.length ? projects.map(renderProjectCard).join('') : `<div class="empty-state"><span class="empty-icon">⌂</span><strong>${state.projects.length ? 'No matching projects' : 'Your portfolio starts here'}</strong><p>${state.projects.length ? 'Try another search or status filter.' : 'Create a project to start tracking budgets, timelines, and tasks.'}</p>${state.projects.length ? '' : '<button class="button button-primary" data-action="new-project">＋ Create project</button>'}</div>`;
    $('#project-result-count').textContent = `${projects.length} of ${state.projects.length} projects`;
    $$('.view-option').forEach(button => button.classList.toggle('selected', button.dataset.projectLayout === state.layout));
  }

  function renderProjectCard(project) {
    const tasks = projectTasks(project);
    const percent = percentComplete(project);
    const people = [...new Set(tasks.map(task => task.assignee).filter(Boolean))].slice(0, 3);
    return `<article class="project-card" data-project-card="${project.id}">
      <div class="project-card-top"><span class="project-symbol">⌂</span><div class="project-heading"><h3>${escapeHtml(project.name)}</h3><div class="project-location">${escapeHtml(project.location || 'Location not set')} · ${escapeHtml(project.clientName || 'Client not set')}</div></div><button class="project-menu" data-action="project-menu" data-id="${project.id}" title="Project actions" aria-label="Project actions">•••</button></div>
      <div class="project-meta"><span class="status-badge status-${statusClass(project.status)}">${escapeHtml(statusLabel(project.status))}</span><span class="budget-small" title="${escapeHtml(money(project.budget))}">${escapeHtml(compactMoney(project.budget || 0))}</span></div>
      <div class="list-progress"><div class="progress-label"><span>Task progress</span><strong>${percent}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div></div>
      <div class="project-card-foot"><div class="avatar-stack">${people.map(person => `<span class="mini-avatar" title="${escapeHtml(person)}">${escapeHtml(initials(person))}</span>`).join('')}${tasks.length && people.length === 0 ? `<span class="mini-avatar" title="Unassigned tasks">—</span>` : ''}</div><span class="task-count">${tasks.length} task${tasks.length === 1 ? '' : 's'} · ${completedTasks(project)} done</span><button class="open-project" data-action="open-project" data-id="${project.id}">Details →</button></div>
    </article>`;
  }

  function renderTaskTable(tasks) {
    if (!tasks.length) return '<div class="empty-state"><span class="empty-icon">☷</span><strong>No tasks yet</strong><p>Add tasks inside any project to see work tracked here.</p></div>';
    return `<div class="task-table-wrap"><table class="task-table"><thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Due date</th><th>Status</th></tr></thead><tbody>${tasks.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).map(task => `<tr><td><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.description || 'No description')}</small></td><td>${escapeHtml(task.projectName)}</td><td>${escapeHtml(task.assignee || 'Unassigned')}</td><td>${escapeHtml(niceDate(task.dueDate))}</td><td><select class="table-status-select" data-action="task-status" data-id="${task.id}" aria-label="Status for ${escapeHtml(task.title)}">${TASK_STATUSES.map(status => `<option value="${status}" ${status === task.status ? 'selected' : ''}>${escapeHtml(statusLabel(status))}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderUpcomingTasks() {
    const tasks = allTasks().filter(task => task.status !== 'DONE').sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')).slice(0, 5);
    const container = $('#upcoming-tasks');
    if (!tasks.length) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">✓</span><strong>Nothing pending</strong><p>${allTasks().length ? 'All tracked tasks are marked done. Nice work.' : 'Newly added tasks will show here.'}</p></div>`;
      return;
    }
    container.innerHTML = tasks.map(task => {
      const date = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null;
      return `<div class="upcoming-item"><div class="date-tile"><strong>${date ? date.getDate() : '—'}</strong><span>${date ? date.toLocaleDateString('en-IN', { month: 'short' }) : 'No date'}</span></div><div class="upcoming-copy"><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.projectName)}${task.assignee ? ` · ${escapeHtml(task.assignee)}` : ''}</p><span class="task-chip ${statusClass(task.status)}">${escapeHtml(statusLabel(task.status))}</span></div></div>`;
    }).join('');
  }

  function renderTaskSummary() {
    const tasks = allTasks();
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    const total = tasks.length || 1;
    const sets = [
      { label: 'To do', count: todo, icon: '○', color: '#8476cb', foot: 'Ready to get started' },
      { label: 'In progress', count: inProgress, icon: '◷', color: '#d99b39', foot: 'Work underway' },
      { label: 'Completed', count: done, icon: '✓', color: '#3e9b6a', foot: 'Ready for the next milestone' }
    ];
    $('#task-progress-list').innerHTML = sets.map(item => `<div class="progress-summary"><div class="progress-summary-head"><span class="progress-summary-icon">${item.icon}</span><span>${item.label}</span><span class="progress-summary-count">${item.count}</span></div><div class="progress-track"><div class="progress-fill" style="width:${tasks.length ? item.count / total * 100 : 0}%;background:${item.color}"></div></div><div class="progress-summary-foot"><span>${item.foot}</span><span>${tasks.length ? Math.round(item.count / total * 100) : 0}%</span></div></div>`).join('');
  }

  function projectForm(project = null) {
    const isEdit = Boolean(project);
    const fields = project || { name: '', location: '', clientName: '', budget: '', startDate: '', endDate: '', status: 'PLANNED' };
    $('#modal-root').innerHTML = `<div class="overlay" data-overlay="project"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title"><header class="dialog-head"><div><p class="eyebrow">PROJECT DETAILS</p><h2 id="project-dialog-title">${isEdit ? 'Edit project' : 'Create a project'}</h2></div><button class="dialog-close" data-action="close-modal" aria-label="Close dialog">×</button></header><form id="project-form" class="dialog-body"><div class="form-grid"><div class="form-field full"><label for="project-name">Project name *</label><input id="project-name" name="name" required maxlength="160" placeholder="e.g. Riverside Office Tower" value="${escapeHtml(fields.name)}"><span class="form-error" data-error-for="name"></span></div><div class="form-field"><label for="project-client">Client name</label><input id="project-client" name="clientName" maxlength="160" placeholder="Client or organization" value="${escapeHtml(fields.clientName || '')}"></div><div class="form-field"><label for="project-location">Location</label><input id="project-location" name="location" maxlength="200" placeholder="City, country" value="${escapeHtml(fields.location || '')}"></div><div class="form-field"><label for="project-budget">Budget (₹)</label><input id="project-budget" name="budget" type="number" min="0" step="0.01" placeholder="0.00" value="${fields.budget ?? ''}"></div><div class="form-field"><label for="project-status">Status</label><select id="project-status" name="status">${PROJECT_STATUSES.map(s => `<option value="${s}" ${fields.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('')}</select></div><div class="form-field"><label for="project-start">Start date</label><input id="project-start" name="startDate" type="date" value="${fields.startDate || ''}"></div><div class="form-field"><label for="project-end">End date</label><input id="project-end" name="endDate" type="date" value="${fields.endDate || ''}"></div></div><div class="dialog-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary" id="save-project-button">${isEdit ? 'Save changes' : 'Create project'}</button></div></form></section></div>`;
    $('#project-name').focus();
  }

  function closeModal() { $('#modal-root').innerHTML = ''; }
  function closeDrawer() { state.openProjectId = null; $('#drawer-root').innerHTML = ''; }

  async function saveProject(form) {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name) { $('[data-error-for="name"]').textContent = 'Project name is required.'; $('#project-name').focus(); return; }
    const budgetValue = String(data.get('budget') || '').trim();
    if (budgetValue && Number(budgetValue) < 0) { toast('Budget cannot be negative.', true); return; }
    const payload = {
      name,
      location: String(data.get('location') || '').trim() || null,
      clientName: String(data.get('clientName') || '').trim() || null,
      budget: budgetValue ? Number(budgetValue) : null,
      startDate: data.get('startDate') || null,
      endDate: data.get('endDate') || null,
      status: data.get('status') || 'PLANNED'
    };
    const projectId = form.dataset.projectId;
    const button = $('#save-project-button');
    button.disabled = true; button.textContent = 'Saving…';
    try {
      const saved = projectId ? await request(`${API}/${projectId}`, { method: 'PUT', body: JSON.stringify(payload) }) : await request(API, { method: 'POST', body: JSON.stringify(payload) });
      closeModal();
      await loadProjects({ quiet: true });
      toast(projectId ? 'Project changes saved.' : 'Project created successfully.');
      if (saved?.id) openProject(saved.id);
    } catch (error) {
      toast(error.message, true); button.disabled = false; button.textContent = projectId ? 'Save changes' : 'Create project';
    }
  }

  async function deleteProject(id) {
    const project = state.projects.find(p => String(p.id) === String(id));
    if (!project) return;
    if (!window.confirm(`Delete “${project.name}” and all of its tasks? This cannot be undone.`)) return;
    try {
      await request(`${API}/${id}`, { method: 'DELETE' });
      closeDrawer();
      await loadProjects({ quiet: true });
      toast('Project deleted.');
    } catch (error) { toast(error.message, true); }
  }

  function openProject(id) {
    const project = state.projects.find(p => String(p.id) === String(id));
    if (!project) return;
    state.openProjectId = project.id;
    renderProjectDrawer(project.id);
  }

  function renderProjectDrawer(id) {
    const project = state.projects.find(p => String(p.id) === String(id));
    if (!project) { closeDrawer(); return; }
    const tasks = projectTasks(project);
    const percent = percentComplete(project);
    $('#drawer-root').innerHTML = `<div class="overlay detail-overlay" data-overlay="drawer"><aside class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-project-title"><header class="drawer-head"><div class="drawer-topline"><span class="drawer-kicker">PROJECT / #${escapeHtml(project.id)}</span><button class="dialog-close" data-action="close-drawer" aria-label="Close project details">×</button></div><div class="drawer-title-row"><div><h2 id="drawer-project-title">${escapeHtml(project.name)}</h2><p class="drawer-desc">${escapeHtml(project.location || 'Location not set')} · ${escapeHtml(project.clientName || 'Client not set')}</p></div><div class="drawer-actions"><button class="icon-button" data-action="edit-project" data-id="${project.id}" title="Edit project" aria-label="Edit project">✎</button><button class="icon-button" data-action="delete-project" data-id="${project.id}" title="Delete project" aria-label="Delete project">⌫</button></div></div><span class="status-badge status-${statusClass(project.status)}">${escapeHtml(statusLabel(project.status))}</span></header><div class="drawer-body"><div class="detail-metrics"><div class="detail-metric"><span>Project budget</span><strong title="${escapeHtml(money(project.budget))}">${escapeHtml(compactMoney(project.budget || 0))}</strong></div><div class="detail-metric"><span>Task completion</span><strong>${percent}%</strong></div><div class="detail-metric"><span>Tracked tasks</span><strong>${tasks.length}</strong></div></div><section class="detail-section"><div class="detail-section-head"><div><h3>Project timeline</h3><p>Key dates for this project</p></div></div><p class="detail-description"><strong>Start:</strong> ${escapeHtml(niceDate(project.startDate))}<br><strong>Target finish:</strong> ${escapeHtml(niceDate(project.endDate))}</p><div class="progress-track" style="margin-top:15px"><div class="progress-fill" style="width:${percent}%"></div></div></section><section class="detail-section"><div class="detail-section-head"><div><h3>Tasks & milestones</h3><p>${tasks.length} task${tasks.length === 1 ? '' : 's'} · ${completedTasks(project)} completed</p></div><button class="button button-primary" data-action="new-task" data-id="${project.id}">＋ Add task</button></div><div class="task-list">${tasks.length ? tasks.map(task => `<div class="task-row"><span class="task-check">${task.status === 'DONE' ? '✓' : '•'}</span><div class="task-main"><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.assignee || 'Unassigned')}${task.dueDate ? ` · Due ${escapeHtml(niceDate(task.dueDate))}` : ''}${task.description ? `<br>${escapeHtml(task.description)}` : ''}</p></div><div class="task-actions"><select data-action="task-status" data-id="${task.id}" aria-label="Status for ${escapeHtml(task.title)}">${TASK_STATUSES.map(status => `<option value="${status}" ${task.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></div></div>`).join('') : `<div class="empty-state"><span class="empty-icon">☷</span><strong>No tasks added yet</strong><p>Add the first task for this project to track progress and due dates.</p></div>`}</div></section><div class="drawer-foot"><button class="button button-secondary" data-action="edit-project" data-id="${project.id}">Edit details</button><button class="button button-primary" data-action="new-task" data-id="${project.id}">＋ Add a task</button></div></div></aside></div>`;
  }

  function taskForm(projectId) {
    const project = state.projects.find(p => String(p.id) === String(projectId));
    if (!project) return;
    $('#modal-root').innerHTML = `<div class="overlay" data-overlay="task"><section class="dialog narrow" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title"><header class="dialog-head"><div><p class="eyebrow">${escapeHtml(project.name)}</p><h2 id="task-dialog-title">Add a task</h2></div><button class="dialog-close" data-action="close-modal" aria-label="Close dialog">×</button></header><form id="task-form" class="dialog-body" data-project-id="${project.id}"><div class="form-grid"><div class="form-field full"><label for="task-title">Task title *</label><input id="task-title" name="title" required maxlength="200" placeholder="e.g. Pour foundation slab"></div><div class="form-field full"><label for="task-description">Description</label><textarea id="task-description" name="description" maxlength="4000" placeholder="What needs to be done?"></textarea></div><div class="form-field"><label for="task-assignee">Assignee</label><input id="task-assignee" name="assignee" placeholder="Team member"></div><div class="form-field"><label for="task-due-date">Due date</label><input id="task-due-date" name="dueDate" type="date"></div><div class="form-field full"><label for="task-status-field">Status</label><select id="task-status-field" name="status">${TASK_STATUSES.map(status => `<option value="${status}" ${status === 'TODO' ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></div></div><div class="dialog-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancel</button><button type="submit" id="save-task-button" class="button button-primary">Add task</button></div></form></section></div>`;
    $('#task-title').focus();
  }

  async function saveTask(form) {
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    if (!title) { $('#task-title').focus(); return; }
    const payload = { title, description: String(formData.get('description') || '').trim() || null, assignee: String(formData.get('assignee') || '').trim() || null, dueDate: formData.get('dueDate') || null, status: formData.get('status') || 'TODO' };
    const projectId = form.dataset.projectId;
    const button = $('#save-task-button'); button.disabled = true; button.textContent = 'Adding…';
    try {
      await request(`${API}/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) });
      closeModal();
      await loadProjects({ quiet: true });
      openProject(projectId);
      toast('Task added successfully.');
    } catch (error) { toast(error.message, true); button.disabled = false; button.textContent = 'Add task'; }
  }

  async function updateTaskStatus(taskId, status, select) {
    if (!TASK_STATUSES.includes(status)) return;
    select.disabled = true;
    try {
      await request(`${API}/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadProjects({ quiet: true });
      toast('Task status updated.');
    } catch (error) {
      toast(error.message, true);
      const task = allTasks().find(t => String(t.id) === String(taskId));
      if (task) select.value = task.status;
    } finally { select.disabled = false; }
  }

  function switchView(view) {
    state.view = view;
    closeDrawer();
    closeModal();
    renderAll();
    if (view !== 'projects') { state.search = ''; $('#project-search').value = ''; }
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action], [data-view], [data-project-layout]');
    if (!target) {
      if (event.target.matches('[data-overlay="project"], [data-overlay="task"]')) closeModal();
      if (event.target.matches('[data-overlay="drawer"]')) closeDrawer();
      return;
    }
    if (target.dataset.view) { switchView(target.dataset.view); return; }
    if (target.dataset.projectLayout) { state.layout = target.dataset.projectLayout; renderProjects(); return; }
    const id = target.dataset.id;
    switch (target.dataset.action) {
      case 'new-project': projectForm(); break;
      case 'close-modal': closeModal(); break;
      case 'close-drawer': closeDrawer(); break;
      case 'open-project': openProject(id); break;
      case 'project-menu': {
        const project = state.projects.find(p => String(p.id) === String(id));
        if (project) openProject(project.id);
        break;
      }
      case 'edit-project': {
        const project = state.projects.find(p => String(p.id) === String(id));
        if (project) { closeDrawer(); projectForm(project); $('#project-form').dataset.projectId = project.id; }
        break;
      }
      case 'delete-project': deleteProject(id); break;
      case 'new-task': taskForm(id); break;
    }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id === 'project-form') { event.preventDefault(); saveProject(event.target); }
    if (event.target.id === 'task-form') { event.preventDefault(); saveTask(event.target); }
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.id === 'status-filter') { state.status = target.value; renderProjects(); }
    if (target.matches('[data-action="task-status"]')) updateTaskStatus(target.dataset.id, target.value, target);
  });

  $('#project-search').addEventListener('input', (event) => { state.search = event.target.value; renderProjects(); });
  $('#new-project-button').addEventListener('click', () => projectForm());
  $('#sidebar-add-project').addEventListener('click', () => projectForm());
  $('#refresh-button').addEventListener('click', () => loadProjects());
  $('#retry-button').addEventListener('click', () => loadProjects());
  $('#view-all-projects').addEventListener('click', () => switchView('projects'));
  $('#view-all-tasks').addEventListener('click', () => switchView('tasks'));
  $('#summary-view-tasks').addEventListener('click', () => switchView('tasks'));
  $('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('mobile-open'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeModal(); closeDrawer(); $('#sidebar').classList.remove('mobile-open'); }
  });
  $('#footer-year').textContent = new Date().getFullYear();
  $('#current-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  loadProjects();
})();
