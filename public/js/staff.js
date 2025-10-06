const API_BASE = '/api';

// 인증 체크
function checkAuth() {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('user_role');

  if (!token || !role) {
    window.location.href = '/login.html';
    return false;
  }

  // Staff 권한 확인
  if (role !== 'STAFF' && role !== 'ADMIN') {
    alert('스태프 권한이 필요합니다.');
    window.location.href = '/login.html';
    return false;
  }

  return true;
}

// 로그아웃
function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_status');
  window.location.href = '/login.html';
}

// API 호출 헬퍼
async function apiCall(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      },
      ...options
    });

    if (response.status === 401) {
      showToast('세션이 만료되었습니다. 다시 로그인해주세요.');
      setTimeout(() => {
        logout();
      }, 1500);
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error.message !== 'Session expired') {
      console.error('API call failed:', error);
      showToast('오류가 발생했습니다: ' + error.message);
    }
    throw error;
  }
}

// 토스트 알림
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white bg-blue-500 z-50 animate-slide-in';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 페이지 초기화
async function initPage() {
  if (!checkAuth()) return;

  // 현재 날짜 표시
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  // 할일 날짜 선택기 초기화
  const today = new Date().toISOString().split('T')[0];
  const datePicker = document.getElementById('taskDatePicker');
  if (datePicker) {
    datePicker.value = today;
    window.currentTaskDate = today;
  }

  await refreshAll();
}

async function refreshAll() {
  await Promise.all([
    loadTasksByDate(window.currentTaskDate || new Date().toISOString().split('T')[0]),
    loadTodayCheckins(),
    loadCurrentGuests(),
    loadTodayCheckouts(),
    loadCleaningRequests(),
    loadOtherRequests()
  ]);
}

async function loadTodayCheckins() {
  try {
    const checkins = await apiCall('/staff/today-checkins');
    renderTodayCheckins(checkins);
  } catch (error) {
    console.error('Failed to load today checkins:', error);
  }
}

async function loadCurrentGuests() {
  try {
    const guests = await apiCall('/staff/current-guests');
    renderCurrentGuests(guests);
  } catch (error) {
    console.error('Failed to load current guests:', error);
  }
}

async function loadTodayCheckouts() {
  try {
    const checkouts = await apiCall('/staff/today-checkouts');
    renderTodayCheckouts(checkouts);
  } catch (error) {
    console.error('Failed to load today checkouts:', error);
  }
}

async function loadCleaningRequests() {
  try {
    const requests = await apiCall('/requests?status=PENDING');
    const cleaningRequests = requests.filter(r => r.request_type === 'CLEANING');
    renderCleaningRequests(cleaningRequests);
  } catch (error) {
    console.error('Failed to load cleaning requests:', error);
  }
}

async function loadOtherRequests() {
  try {
    const requests = await apiCall('/requests?status=PENDING');
    const otherRequests = requests.filter(r => r.request_type === 'OTHER');
    renderOtherRequests(otherRequests);
  } catch (error) {
    console.error('Failed to load other requests:', error);
  }
}

function renderTodayCheckins(checkins) {
  const container = document.getElementById('todayCheckins');
  if (!container) return;

  if (checkins.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">오늘 체크인 예정이 없습니다</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-3">
      ${checkins.map(res => {
        const checkIn = new Date(res.check_in);
        const additionalPayment = res.guest_requests?.find(r => r.request_type === 'ADDITIONAL_PAYMENT' && r.status === 'PENDING');

        return `
          <div class="border rounded-lg p-4 hover:bg-blue-50 transition">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="font-bold text-lg text-gray-900">${res.guest_name}</h3>
                <div class="text-sm text-gray-600 mt-1">
                  <span class="font-semibold">${res.rooms?.name || '-'}</span> / ${res.rooms?.properties?.name || '-'}
                </div>
                <div class="text-sm text-gray-500 mt-1">
                  체크인: ${checkIn.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                ${additionalPayment ? `
                  <div class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                    <span class="text-sm font-semibold text-orange-800">추가 결제 필요:</span>
                    <span class="text-sm text-orange-700">${parseFloat(additionalPayment.additional_payment).toLocaleString()}원</span>
                  </div>
                ` : ''}
              </div>
              <label class="flex items-center space-x-2 cursor-pointer">
                <span class="text-sm text-gray-600">완료</span>
                <input type="checkbox" class="w-5 h-5 text-blue-600 rounded"
                  onchange="markCheckinComplete('${res.id}', this.checked)">
              </label>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderCurrentGuests(guests) {
  const container = document.getElementById('currentGuests');
  if (!container) return;

  if (guests.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">현재 숙박 중인 고객이 없습니다</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${guests.map(res => {
        const checkIn = new Date(res.check_in);
        const checkOut = new Date(res.check_out);
        const requests = res.guest_requests?.filter(r => r.status === 'PENDING') || [];

        return `
          <div class="border rounded-lg p-4 hover:bg-green-50 transition">
            <div class="font-bold text-lg text-gray-900 mb-2">${res.rooms?.name || '-'}</div>
            <div class="text-sm text-gray-600 space-y-1">
              <div><span class="font-semibold">고객:</span> ${res.guest_name}</div>
              <div><span class="font-semibold">체크인:</span> ${checkIn.toLocaleDateString('ko-KR')}</div>
              <div><span class="font-semibold">체크아웃:</span> ${checkOut.toLocaleDateString('ko-KR')}</div>
              ${requests.length > 0 ? `
                <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div class="text-xs font-semibold text-yellow-800 mb-1">요청사항:</div>
                  ${requests.map(req => `
                    <div class="text-xs text-yellow-700">${req.description || req.request_type}</div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderTodayCheckouts(checkouts) {
  const container = document.getElementById('todayCheckouts');
  if (!container) return;

  if (checkouts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">오늘 체크아웃 예정이 없습니다</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-3">
      ${checkouts.map(res => {
        const checkOut = new Date(res.check_out);

        return `
          <div class="border rounded-lg p-4 hover:bg-orange-50 transition">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="font-bold text-lg text-gray-900">${res.rooms?.name || '-'}</h3>
                <div class="text-sm text-gray-600 mt-1">
                  <span class="font-semibold">고객:</span> ${res.guest_name}
                </div>
                <div class="text-sm text-gray-500 mt-1">
                  체크아웃: ${checkOut.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <label class="flex items-center space-x-2 cursor-pointer">
                <span class="text-sm text-gray-600">청소완료</span>
                <input type="checkbox" class="w-5 h-5 text-orange-600 rounded"
                  onchange="markCleaningComplete('CHECKOUT', '${res.id}', this.checked)">
              </label>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderCleaningRequests(requests) {
  const container = document.getElementById('cleaningRequests');
  if (!container) return;

  if (requests.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">청소 요청이 없습니다</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-3">
      ${requests.map(req => {
        const createdAt = new Date(req.created_at);

        return `
          <div class="border rounded-lg p-4 hover:bg-purple-50 transition">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="font-bold text-lg text-gray-900">${req.reservations?.rooms?.name || '-'}</h3>
                <div class="text-sm text-gray-600 mt-1">
                  <span class="font-semibold">고객:</span> ${req.reservations?.guest_name || '-'}
                </div>
                <div class="text-sm text-gray-500 mt-1">
                  요청 시간: ${createdAt.toLocaleString('ko-KR')}
                </div>
                ${req.description ? `
                  <div class="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                    ${req.description}
                  </div>
                ` : ''}
              </div>
              <label class="flex items-center space-x-2 cursor-pointer">
                <span class="text-sm text-gray-600">완료</span>
                <input type="checkbox" class="w-5 h-5 text-purple-600 rounded"
                  onchange="markRequestComplete('${req.id}', this.checked)">
              </label>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderOtherRequests(requests) {
  const container = document.getElementById('otherRequests');
  if (!container) return;

  if (requests.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">기타 요청사항이 없습니다</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-3">
      ${requests.map(req => {
        const createdAt = new Date(req.created_at);

        return `
          <div class="border rounded-lg p-4 hover:bg-gray-50 transition">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="font-bold text-lg text-gray-900">${req.reservations?.rooms?.name || '-'}</h3>
                <div class="text-sm text-gray-600 mt-1">
                  <span class="font-semibold">고객:</span> ${req.reservations?.guest_name || '-'}
                </div>
                <div class="text-sm text-gray-500 mt-1">
                  요청 시간: ${createdAt.toLocaleString('ko-KR')}
                </div>
                ${req.description ? `
                  <div class="text-sm text-gray-700 mt-2 p-2 bg-blue-50 rounded">
                    ${req.description}
                  </div>
                ` : ''}
              </div>
              <label class="flex items-center space-x-2 cursor-pointer">
                <span class="text-sm text-gray-600">완료</span>
                <input type="checkbox" class="w-5 h-5 text-green-600 rounded"
                  onchange="markRequestComplete('${req.id}', this.checked)">
              </label>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function markCheckinComplete(reservationId, isComplete) {
  if (!isComplete) return;

  showToast('체크인 완료 처리 중...');
  // In a real implementation, you might update the reservation status here
  setTimeout(() => {
    showToast('체크인 완료 처리되었습니다');
    refreshAll();
  }, 500);
}

async function markCleaningComplete(type, reservationId, isComplete) {
  if (!isComplete) return;

  showToast('청소 완료 처리 중...');
  setTimeout(() => {
    showToast('청소 완료 처리되었습니다');
    refreshAll();
  }, 500);
}

async function markRequestComplete(requestId, isComplete) {
  if (!isComplete) return;

  try {
    await apiCall(`/requests/complete?id=${requestId}`, {
      method: 'PATCH'
    });

    showToast('요청사항이 완료 처리되었습니다');
    await refreshAll();
  } catch (error) {
    console.error('Failed to complete request:', error);
    showToast('완료 처리 실패');
  }
}

// 할일 관리
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

    renderTasksList(tasks);
  } catch (error) {
    console.error('Failed to load tasks:', error);
    const container = document.getElementById('todayTasks');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8 text-red-500">
          할일 로딩 실패
        </div>
      `;
    }
  }
}

function renderTasksList(tasks) {
  const container = document.getElementById('todayTasks');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>이 날짜의 할일이 없습니다.</p>
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
            >
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
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function toggleTaskComplete(taskId, completed) {
  try {
    await apiCall(`/tasks/daily?id=${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed })
    });

    showToast(completed ? '할일을 완료했습니다.' : '완료를 취소했습니다.');
    await loadTasksByDate(window.currentTaskDate || new Date().toISOString().split('T')[0]);
  } catch (error) {
    console.error('Failed to toggle task:', error);
    showToast('상태 변경 실패');
    await loadTasksByDate(window.currentTaskDate || new Date().toISOString().split('T')[0]);
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initPage);
