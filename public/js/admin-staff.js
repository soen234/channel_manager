// 스태프 관리 페이지
async function loadAdminStaff() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">스태프 관리</h1>
      <p class="text-gray-600">숙소별 스태프 배정, 권한 관리 및 오늘의 할일</p>
    </div>

    <!-- 탭 메뉴 -->
    <div class="bg-white rounded-lg shadow-md mb-6">
      <div class="border-b">
        <nav class="flex">
          <button onclick="switchStaffTab('tasks')" id="tab-tasks"
            class="staff-tab px-6 py-3 font-semibold text-blue-600 border-b-2 border-blue-600">
            오늘 할일
          </button>
          <button onclick="switchStaffTab('permissions')" id="tab-permissions"
            class="staff-tab px-6 py-3 font-semibold text-gray-600 hover:text-gray-800">
            권한 관리
          </button>
        </nav>
      </div>

      <div class="p-6">
        <div id="staffTabContent">
          <div class="text-center py-8 text-gray-500">로딩 중...</div>
        </div>
      </div>
    </div>
  `;

  await new Promise(resolve => setTimeout(resolve, 100));
  window.currentStaffTab = 'tasks';
  try {
    await switchStaffTab('tasks');
  } catch (error) {
    console.error('Failed to load tasks tab, loading permissions tab:', error);
    await switchStaffTab('permissions');
  }
}

function switchStaffTab(tab) {
  window.currentStaffTab = tab;

  // Update tab styling
  document.querySelectorAll('.staff-tab').forEach(btn => {
    btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    btn.classList.add('text-gray-600');
  });

  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.remove('text-gray-600');
    activeTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
  }

  if (tab === 'permissions') {
    loadPermissionsTab();
  } else if (tab === 'tasks') {
    loadTasksTab();
  }
}

async function loadPermissionsTab() {
  const container = document.getElementById('staffTabContent');
  if (!container) return;

  container.innerHTML = `
    <!-- 승인 대기 -->
    <div class="mb-6">
      <h2 class="text-xl font-bold mb-4">승인 대기 중인 사용자</h2>
      <div id="pendingUsersList">
        <div class="text-center py-4 text-gray-500">로딩중...</div>
      </div>
    </div>

    <!-- 스태프 목록 -->
    <div>
      <h2 class="text-xl font-bold mb-4">활성 스태프 목록</h2>
      <p class="text-sm text-gray-600 mb-4">각 숙소의 초대 코드는 '숙소 관리' 페이지에서 확인할 수 있습니다.</p>
      <div id="staffList">
        <div class="text-center py-4 text-gray-500">로딩중...</div>
      </div>
    </div>
  `;

  await loadPendingUsers();
  await loadStaffList();
}

async function loadTasksTab() {
  const container = document.getElementById('staffTabContent');
  if (!container) return;

  const today = new Date().toISOString().split('T')[0];
  window.currentTaskDate = today; // Store current task date

  container.innerHTML = `
    <div>
      <div class="mb-4">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-xl font-bold">할일 관리</h2>
          <button onclick="showAddTaskModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 할일 추가
          </button>
        </div>

        <!-- Date Navigation -->
        <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
          <button onclick="changeTaskDate(-1)" class="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50">
            ← 이전
          </button>
          <input
            type="date"
            id="taskDatePicker"
            value="${today}"
            onchange="changeTaskDate(0)"
            class="max-w-full px-2 py-1 sm:px-3 border border-gray-300 rounded text-sm"
          >
          <button onclick="changeTaskDate(1)" class="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50">
            다음 →
          </button>
          <button onclick="changeTaskDate('today')" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
            오늘
          </button>
          <span id="taskDateDisplay" class="ml-2 text-sm text-gray-600"></span>
        </div>
      </div>

      <div id="tasksList">
        <div class="text-center py-8 text-gray-500">로딩 중...</div>
      </div>
    </div>
  `;

  await loadTasksByDate(today);
}

async function changeTaskDate(direction) {
  const datePicker = document.getElementById('taskDatePicker');
  if (!datePicker) return;

  let newDate;
  if (direction === 'today') {
    newDate = new Date().toISOString().split('T')[0];
  } else if (direction === 0) {
    // Date picker changed
    newDate = datePicker.value;
  } else {
    // Previous/Next day
    const currentDate = new Date(datePicker.value);
    currentDate.setDate(currentDate.getDate() + direction);
    newDate = currentDate.toISOString().split('T')[0];
  }

  datePicker.value = newDate;
  window.currentTaskDate = newDate;
  await loadTasksByDate(newDate);
}

async function loadTasksByDate(date) {
  try {
    const tasks = await apiCall(`/tasks/daily?date=${date}`);

    // Update date display
    const dateDisplay = document.getElementById('taskDateDisplay');
    if (dateDisplay) {
      const displayDate = new Date(date + 'T00:00:00');
      dateDisplay.textContent = displayDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }

    renderTasksList(tasks, date);
  } catch (error) {
    console.error('Failed to load tasks:', error);
    const container = document.getElementById('tasksList');
    if (container) {
      const errorMessage = error.message?.includes('relation') || error.message?.includes('does not exist')
        ? '할일 테이블이 생성되지 않았습니다. Supabase에서 sql/create_tasks_table.sql을 실행하세요.'
        : '할일 로딩 실패: ' + (error.message || '알 수 없는 오류');

      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-red-500 mb-2">${errorMessage}</p>
          <button onclick="switchStaffTab('permissions')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            권한 관리 탭으로 이동
          </button>
        </div>
      `;
    }
  }
}

function renderTasksList(tasks, date) {
  const container = document.getElementById('tasksList');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>이 날짜의 할일이 없습니다.</p>
        <p class="text-sm mt-2">+ 할일 추가 버튼을 눌러 새 할일을 추가하세요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-3">
      ${tasks.map(task => `
        <div class="border rounded-lg p-4 ${task.completed ? 'bg-gray-50' : 'bg-white'} hover:shadow transition">
          <div class="flex items-start gap-3">
            <input type="checkbox"
              ${task.completed ? 'checked' : ''}
              onchange="toggleTaskComplete('${task.id}', this.checked)"
              class="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              ${task.completed_by ? 'disabled' : ''}
            >
            <div class="flex-1">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}">
                    ${task.title}
                  </h3>
                  ${task.description ? `
                    <p class="text-sm text-gray-600 mt-1 ${task.completed ? 'line-through' : ''}">
                      ${task.description}
                    </p>
                  ` : ''}
                  <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    ${task.assigned_to_name ? `
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        담당: ${task.assigned_to_name}
                      </span>
                    ` : ''}
                    ${task.completed && task.completed_at ? `
                      <span class="flex items-center gap-1 text-green-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        완료: ${new Date(task.completed_at).toLocaleString('ko-KR')}
                        ${task.completed_by_name ? `by ${task.completed_by_name}` : ''}
                      </span>
                    ` : ''}
                  </div>
                </div>
                <button onclick="deleteTask('${task.id}')"
                  class="ml-2 text-red-500 hover:text-red-700"
                  title="삭제">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function showAddTaskModal() {
  const selectedDate = window.currentTaskDate || new Date().toISOString().split('T')[0];
  const modalHTML = `
    <div id="addTaskModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 class="text-2xl font-bold mb-4">할일 추가</h2>
        <form id="addTaskForm" onsubmit="saveTask(event)">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">제목 <span class="text-red-500">*</span></label>
            <input type="text" id="task-title" required placeholder="예: 객실 청소"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">설명</label>
            <textarea id="task-description" rows="3" placeholder="상세 내용 (선택사항)"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">날짜</label>
            <input type="date" id="task-date" value="\${selectedDate}"
              class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">담당자</label>
            <select id="task-assigned-to"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">선택 안함</option>
              <option value="all">전체 스태프</option>
            </select>
          </div>

          <div class="flex justify-end space-x-3">
            <button type="button" onclick="closeTaskModal()"
              class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
              취소
            </button>
            <button type="submit"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const existing = document.getElementById('addTaskModal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeTaskModal() {
  const modal = document.getElementById('addTaskModal');
  if (modal) modal.remove();
}

async function saveTask(event) {
  event.preventDefault();

  const data = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-description').value || null,
    task_date: document.getElementById('task-date').value,
    assigned_to: document.getElementById('task-assigned-to').value || null
  };

  try {
    await apiCall('/tasks/daily', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    showToast('할일이 추가되었습니다.', 'success');
    closeTaskModal();
    await loadTasksByDate(window.currentTaskDate || new Date().toISOString().split('T')[0]);
  } catch (error) {
    console.error('Failed to save task:', error);
    showToast('할일 추가 실패', 'error');
  }
}

async function toggleTaskComplete(taskId, completed) {
  try {
    await apiCall(`/tasks/daily?id=${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed })
    });

    showToast(completed ? '할일을 완료했습니다.' : '완료를 취소했습니다.', 'success');
    await loadTasksByDate(window.currentTaskDate || new Date().toISOString().split('T')[0]);
  } catch (error) {
    console.error('Failed to toggle task:', error);
    showToast('상태 변경 실패', 'error');
    await loadTasksByDate(window.currentTaskDate || new Date().toISOString().split('T')[0]);
  }
}

async function deleteTask(taskId) {
  if (!confirm('이 할일을 삭제하시겠습니까?')) {
    return;
  }

  try {
    await apiCall(`/tasks/daily?id=${taskId}`, {
      method: 'DELETE'
    });

    showToast('할일이 삭제되었습니다.', 'success');
    await loadTasksByDate(window.currentTaskDate || new Date().toISOString().split('T')[0]);
  } catch (error) {
    console.error('Failed to delete task:', error);
    showToast('할일 삭제 실패', 'error');
  }
}

async function loadInviteCode() {
  try {
    const organizationId = localStorage.getItem('organization_id');
    const displayEl = document.getElementById('inviteCodeDisplay');

    if (!organizationId) {
      displayEl.textContent = '조직 ID를 찾을 수 없습니다';
      displayEl.classList.add('text-red-600');
      return;
    }

    // Fetch organization to get invite_code
    const org = await apiCall(`/admin/organization-info`);

    if (org && org.invite_code) {
      displayEl.textContent = org.invite_code;
      displayEl.classList.remove('text-red-600');
    } else {
      displayEl.textContent = '초대 코드 없음';
      displayEl.classList.add('text-red-600');
    }
  } catch (error) {
    console.error('Failed to load invite code:', error);
    const displayEl = document.getElementById('inviteCodeDisplay');
    if (displayEl) {
      displayEl.textContent = '로딩 실패';
      displayEl.classList.add('text-red-600');
    }
  }
}

function copyInviteCode(code) {
  // If called with a parameter, use it directly (from properties.js)
  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      showToast('초대 코드가 복사되었습니다', 'success');
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToast('복사 실패', 'error');
    });
    return;
  }

  // Otherwise, get from element (for admin-staff page)
  const inviteCode = document.getElementById('inviteCodeDisplay')?.textContent;

  if (!inviteCode || inviteCode === '로딩중...' || inviteCode.includes('실패')) {
    showToast('초대 코드를 복사할 수 없습니다', 'error');
    return;
  }

  navigator.clipboard.writeText(inviteCode).then(() => {
    showToast('초대 코드가 클립보드에 복사되었습니다', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('복사 실패', 'error');
  });
}

async function loadPendingUsers() {
  try {
    const users = await apiCall('/admin/pending-users');
    renderPendingUsers(users);
  } catch (error) {
    console.error('Failed to load pending users:', error);

    const container = document.getElementById('pendingUsersList');
    if (container) {
      if (error.message.includes('Forbidden') || error.message.includes('403')) {
        container.innerHTML = `
          <div class="text-center py-8 text-red-500">
            관리자 권한이 필요합니다
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            데이터 로딩 실패
          </div>
        `;
      }
    }
  }
}

async function loadStaffList() {
  try {
    const staff = await apiCall('/admin/staff-list');
    renderStaffList(staff);
  } catch (error) {
    console.error('Failed to load staff list:', error);

    const container = document.getElementById('staffList');
    if (container) {
      if (error.message.includes('Forbidden') || error.message.includes('403')) {
        container.innerHTML = `
          <div class="text-center py-8 text-red-500">
            관리자 권한이 필요합니다
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            데이터 로딩 실패
          </div>
        `;
      }
    }
  }
}

function renderPendingUsers(users) {
  const container = document.getElementById('pendingUsersList');

  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>승인 대기 중인 사용자가 없습니다</p>
        <p class="text-xs mt-2">초대 코드로 가입한 스태프는 자동으로 승인됩니다</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">이메일</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">가입일</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${users.map(user => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">${user.email}</td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${new Date(user.created_at).toLocaleDateString('ko-KR')}
              </td>
              <td class="px-4 py-3 text-center">
                <button onclick="approveUser('${user.user_id}', 'STAFF')"
                  class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mr-2">
                  스태프 승인
                </button>
                <button onclick="approveUser('${user.user_id}', 'ADMIN')"
                  class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                  관리자 승인
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderStaffList(staff) {
  const container = document.getElementById('staffList');

  if (!container) return;

  if (staff.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">스태프가 없습니다</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">이메일</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">숙소</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">역할</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">승인일</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${staff.map(user => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">${user.email}</td>
              <td class="px-4 py-3 text-sm text-gray-700">
                <span class="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                  ${user.property_name || '-'}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded ${
                  user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }">
                  ${user.role === 'ADMIN' ? '관리자' : '스태프'}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded ${
                  user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                  ${user.status === 'ACTIVE' ? '활성' : '비활성'}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${user.approved_at ? new Date(user.approved_at).toLocaleDateString('ko-KR') : '-'}
              </td>
              <td class="px-4 py-3 text-center">
                ${user.status === 'ACTIVE' ? `
                  <button onclick="revokeStaff('${user.property_id}', '${user.user_id}', '${user.email}')"
                    class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                    권한 철회
                  </button>
                ` : `
                  <span class="text-xs text-gray-500">비활성</span>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function approveUser(userId, role) {
  if (!confirm(`이 사용자를 ${role === 'ADMIN' ? '관리자' : '스태프'}로 승인하시겠습니까?`)) {
    return;
  }

  try {
    await apiCall('/admin/approve-staff', {
      method: 'POST',
      body: JSON.stringify({ userId, role })
    });

    showToast(`사용자가 ${role === 'ADMIN' ? '관리자' : '스태프'}로 승인되었습니다.`, 'success');

    // Reload lists
    await loadPendingUsers();
    await loadStaffList();
  } catch (error) {
    console.error('Failed to approve user:', error);
    showToast('승인 처리 실패', 'error');
  }
}

async function revokeStaff(propertyId, userId, email) {
  if (!confirm(`${email}의 권한을 철회하시겠습니까?`)) {
    return;
  }

  try {
    await apiCall(`/properties/staff?propertyId=${propertyId}&userId=${userId}`, {
      method: 'DELETE'
    });

    showToast('권한이 철회되었습니다.', 'success');

    // Reload list
    await loadStaffList();
  } catch (error) {
    console.error('Failed to revoke staff:', error);
    showToast('권한 철회 실패', 'error');
  }
}

router.register('admin-staff', loadAdminStaff);
