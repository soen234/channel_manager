// 청소 현황 관리 페이지
async function loadAdminCleaning() {
  const container = document.getElementById('mainContent');

  const today = new Date().toISOString().split('T')[0];
  window.currentCleaningDate = today;

  container.innerHTML = `
    <div class="mb-4 md:mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">청소 현황 관리</h1>
      <p class="text-sm md:text-base text-gray-600">스태프의 청소 완료 현황을 확인할 수 있습니다</p>
    </div>

    <!-- Date Navigation -->
    <div class="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
      <div class="flex flex-wrap items-center gap-2 md:gap-3">
        <button onclick="changeCleaningDate(-1)" class="px-2 md:px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm md:text-base">
          <span class="hidden sm:inline">← 이전</span>
          <span class="sm:hidden">←</span>
        </button>
        <input
          type="date"
          id="cleaningDatePicker"
          value="${today}"
          onchange="changeCleaningDate(0)"
          class="px-2 md:px-3 py-1 border border-gray-300 rounded text-sm md:text-base flex-shrink-0"
        >
        <button onclick="changeCleaningDate(1)" class="px-2 md:px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm md:text-base">
          <span class="hidden sm:inline">다음 →</span>
          <span class="sm:hidden">→</span>
        </button>
        <button onclick="changeCleaningDate('today')" class="px-2 md:px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm md:text-base">
          오늘
        </button>
        <span id="cleaningDateDisplay" class="ml-2 text-xs md:text-sm font-semibold text-gray-700 w-full sm:w-auto mt-1 sm:mt-0"></span>
      </div>
    </div>

    <!-- Cleaning Status List -->
    <div class="bg-white rounded-lg shadow-md">
      <div id="cleaningStatusList">
        <div class="text-center py-8 text-gray-500">로딩 중...</div>
      </div>
    </div>
  `;

  await loadCleaningStatus(today);
}

async function changeCleaningDate(direction) {
  const datePicker = document.getElementById('cleaningDatePicker');
  if (!datePicker) return;

  let newDate;
  if (direction === 'today') {
    newDate = new Date().toISOString().split('T')[0];
  } else if (direction === 0) {
    newDate = datePicker.value;
  } else {
    const currentDate = new Date(datePicker.value);
    currentDate.setDate(currentDate.getDate() + direction);
    newDate = currentDate.toISOString().split('T')[0];
  }

  datePicker.value = newDate;
  window.currentCleaningDate = newDate;
  await loadCleaningStatus(newDate);
}

async function loadCleaningStatus(date) {
  try {
    const data = await apiCall(`/admin/cleaning-status?date=${date}`);

    // Update date display
    const dateDisplay = document.getElementById('cleaningDateDisplay');
    if (dateDisplay) {
      const displayDate = new Date(date + 'T00:00:00');
      dateDisplay.textContent = displayDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }

    renderCleaningStatus(data);
  } catch (error) {
    console.error('Failed to load cleaning status:', error);
    const container = document.getElementById('cleaningStatusList');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8 text-red-500">
          청소 현황 로딩 실패
        </div>
      `;
    }
  }
}

function renderCleaningStatus(reservations) {
  const container = document.getElementById('cleaningStatusList');
  if (!container) return;

  if (!reservations || reservations.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <p class="text-gray-500">해당 날짜의 체크아웃 예정 건이 없습니다.</p>
      </div>
    `;
    return;
  }

  const completed = reservations.filter(r => r.cleaning_status === 'COMPLETED');
  const pending = reservations.filter(r => r.cleaning_status !== 'COMPLETED');

  container.innerHTML = `
    <div class="p-6">
      <!-- Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-600">전체</p>
          <p class="text-2xl font-bold text-gray-900">${reservations.length}건</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4">
          <p class="text-sm text-green-600">청소 완료</p>
          <p class="text-2xl font-bold text-green-700">${completed.length}건</p>
        </div>
        <div class="bg-orange-50 rounded-lg p-4">
          <p class="text-sm text-orange-600">청소 대기</p>
          <p class="text-2xl font-bold text-orange-700">${pending.length}건</p>
        </div>
      </div>

      <!-- Reservation List -->
      <div class="space-y-3">
        ${reservations.map(res => `
          <div class="border rounded-lg p-4 ${res.cleaning_status === 'COMPLETED' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="font-semibold text-gray-900">${res.rooms?.properties?.name || '-'} - ${res.rooms?.name || '-'}</h3>
                  <span class="px-2 py-1 text-xs rounded ${
                    res.cleaning_status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }">
                    ${res.cleaning_status === 'COMPLETED' ? '✓ 청소 완료' : '⏳ 청소 대기'}
                  </span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                  <div>
                    <span class="font-medium">투숙객:</span> ${res.guest_name || '-'}
                  </div>
                  <div>
                    <span class="font-medium">체크아웃:</span> ${new Date(res.check_out).toLocaleDateString('ko-KR')}
                  </div>
                  ${res.cleaning_status === 'COMPLETED' ? `
                    <div>
                      <span class="font-medium">청소 완료:</span> ${new Date(res.cleaned_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>
                      <span class="font-medium">담당자:</span> ${res.cleaner_name || '-'}
                    </div>
                  ` : ''}
                </div>
              </div>
              ${res.cleaning_status === 'COMPLETED' ? `
                <div class="ml-4">
                  <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              ` : `
                <div class="ml-4">
                  <svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

router.register('admin-cleaning', loadAdminCleaning);
