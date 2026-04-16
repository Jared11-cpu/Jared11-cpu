const taskForm = document.getElementById('taskForm');
const logForm = document.getElementById('logForm');
const aiPlan = document.getElementById('aiPlan');
const flowArea = document.getElementById('flowArea');
const timelineArea = document.getElementById('timelineArea');
const scheduleTableBody = document.getElementById('scheduleTableBody');
const logTask = document.getElementById('logTask');
const logList = document.getElementById('logList');

const totalTasksEl = document.getElementById('totalTasks');
const doneTasksEl = document.getElementById('doneTasks');
const avgScoreEl = document.getElementById('avgScore');

const state = {
  currentPlan: null,
  logs: []
};

function daysBetween(today, deadlineStr) {
  const todayDate = new Date(today.toDateString());
  const deadline = new Date(deadlineStr);
  const diff = Math.ceil((deadline - todayDate) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

function buildPlan(input) {
  const horizon = daysBetween(new Date(), input.deadline);
  const phaseDays = [0.25, 0.3, 0.3, 0.15].map(r => Math.max(1, Math.round(horizon * r)));
  const phases = [
    {
      name: '阶段1：目标澄清与资料收集',
      tasks: ['明确成果标准', '收集关键资料', '拆分核心里程碑'],
      days: phaseDays[0]
    },
    {
      name: '阶段2：方案设计与优先级排序',
      tasks: ['绘制流程图', '确定高影响任务', '准备执行资源'],
      days: phaseDays[1]
    },
    {
      name: '阶段3：执行推进与复盘迭代',
      tasks: ['按周执行小任务', '跟踪进度与阻塞', '每周复盘优化'],
      days: phaseDays[2]
    },
    {
      name: '阶段4：交付验收与经验沉淀',
      tasks: ['输出最终成果', '完成验收清单', '沉淀可复用模板'],
      days: phaseDays[3]
    }
  ];

  const risk = input.priority === '高' ? '高优先级任务建议保留20%缓冲时间，避免延期。' : '建议每周固定复盘，持续优化执行路径。';
  const suggestion = `按每周 ${input.hoursPerWeek} 小时投入，建议先处理最关键的20%任务，优先保障里程碑节点。`;

  return {
    ...input,
    phases,
    risk,
    suggestion
  };
}

function renderPlan(plan) {
  aiPlan.innerHTML = `
    <p><strong>AI 结论：</strong>${plan.name} 属于 <strong>${plan.type}</strong>，建议以“里程碑驱动+每日最小行动”执行。</p>
    <p><strong>可实施方案：</strong>${plan.suggestion}</p>
    <p><strong>风险提示：</strong>${plan.risk}</p>
    <p><strong>落地动作：</strong>建立每日打卡 + 周评分机制，低于 7 分需在下一周进行任务重排。</p>
  `;

  flowArea.innerHTML = '';
  plan.phases.forEach((phase, idx) => {
    const div = document.createElement('div');
    div.className = 'flow-step';
    div.innerHTML = `
      <strong>${idx + 1}. ${phase.name}</strong>
      <ul>${phase.tasks.map(t => `<li>${t}</li>`).join('')}</ul>
    `;
    flowArea.appendChild(div);
  });

  timelineArea.innerHTML = '';
  const totalDays = plan.phases.reduce((acc, p) => acc + p.days, 0);
  plan.phases.forEach(phase => {
    const ratio = ((phase.days / totalDays) * 100).toFixed(1);
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-label">${phase.name}（${phase.days} 天）</div>
      <div class="timeline-bar"><div class="timeline-progress" style="width:${ratio}%"></div></div>
    `;
    timelineArea.appendChild(item);
  });

  renderSchedule(plan);
  syncTaskSelector(plan);
  updateStats();
}

function renderSchedule(plan) {
  scheduleTableBody.innerHTML = '';
  const start = new Date();
  let cursor = new Date(start);

  plan.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      const tr = document.createElement('tr');
      const day = cursor.toISOString().split('T')[0];
      tr.innerHTML = `
        <td>${day}</td>
        <td>${phase.name}</td>
        <td contenteditable="true">${task}</td>
        <td contenteditable="true">${Math.max(1, Math.round(plan.hoursPerWeek / 5))}h</td>
      `;
      scheduleTableBody.appendChild(tr);
      cursor.setDate(cursor.getDate() + 1);
    });
  });
}

function syncTaskSelector(plan) {
  logTask.innerHTML = '';
  plan.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task;
      option.textContent = `${phase.name} - ${task}`;
      logTask.appendChild(option);
    });
  });
}

function updateStats() {
  const total = state.currentPlan
    ? state.currentPlan.phases.reduce((acc, p) => acc + p.tasks.length, 0)
    : 0;
  const done = state.logs.length;
  const avg = done
    ? (state.logs.reduce((acc, l) => acc + l.score, 0) / done).toFixed(1)
    : 0;

  totalTasksEl.textContent = total;
  doneTasksEl.textContent = done;
  avgScoreEl.textContent = avg;
}

function renderLogs() {
  if (state.logs.length === 0) {
    logList.innerHTML = '<li class="empty">暂无执行记录</li>';
    return;
  }

  logList.innerHTML = state.logs
    .slice()
    .reverse()
    .map(log => `
      <li>
        <div><strong>${log.task}</strong></div>
        <div>${log.content}</div>
        <small>${log.date} · 评分：<span class="score">${log.score}</span>/10</small>
      </li>
    `)
    .join('');
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const input = {
    name: document.getElementById('taskName').value.trim(),
    type: document.getElementById('taskType').value,
    deadline: document.getElementById('deadline').value,
    priority: document.getElementById('priority').value,
    hoursPerWeek: Number(document.getElementById('hoursPerWeek').value),
    desc: document.getElementById('taskDesc').value.trim()
  };

  state.currentPlan = buildPlan(input);
  state.logs = [];
  renderPlan(state.currentPlan);
  renderLogs();
});

logForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!state.currentPlan) return;

  const contentInput = document.getElementById('logContent');
  const scoreInput = document.getElementById('logScore');

  const record = {
    task: logTask.value,
    content: contentInput.value.trim(),
    score: Number(scoreInput.value),
    date: new Date().toISOString().split('T')[0]
  };

  state.logs.push(record);
  contentInput.value = '';
  scoreInput.value = '';

  renderLogs();
  updateStats();
});
