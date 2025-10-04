// 예약 관리 페이지
async function loadReservations() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">예약 관리</h1>
      <p class="text-gray-600">전 채널의 예약을 통합 관리합니다</p>
    </div>

    <!-- 필터 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">채널</label>
          <select id="filterChannel" onchange="filterReservations()" class="w-full px-3 py-2 border rounded-lg">
            <option value="">전체</option>
            <option value="BOOKING_COM">Booking.com</option>
            <option value="YANOLJA">야놀자</option>
            <option value="AIRBNB">Airbnb</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">상태</label>
          <select id="filterStatus" onchange="filterReservations()" class="w-full px-3 py-2 border rounded-lg">
            <option value="">전체</option>
            <option value="CONFIRMED">확정</option>
            <option value="CHECKED_IN">체크인</option>
            <option value="CHECKED_OUT">체크아웃</option>
            <option value="CANCELLED">취소</option>
            <option value="NO_SHOW">노쇼</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">체크인 시작</label>
          <input type="date" id="filterStartDate" onchange="filterReservations()"
            class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">체크인 종료</label>
          <input type="date" id="filterEndDate" onchange="filterReservations()"
            class="w-full px-3 py-2 border rounded-lg">
        </div>
      </div>
      <div class="mt-4 flex justify-end space-x-2">
        <button onclick="filterReservations()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          검색
        </button>
        <button onclick="syncReservations()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          예약 동기화
        </button>
      </div>
    </div>

    <!-- 예약 목록 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-bold mb-4">예약 목록</h2>
      <div id="reservationsList" class="overflow-x-auto">
        <div class="text-center py-8 text-gray-500">로딩중...</div>
      </div>
    </div>
  `;

  // Wait for DOM to be ready
  await new Promise(resolve => setTimeout(resolve, 0));

  await loadReservationsList();
}

async function loadReservationsList() {
  const channel = document.getElementById('filterChannel')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const startDate = document.getElementById('filterStartDate')?.value || '';
  const endDate = document.getElementById('filterEndDate')?.value || '';

  let url = '/reservations?';
  if (channel) url += `channel=${channel}&`;
  if (status) url += `status=${status}&`;
  if (startDate) url += `startDate=${startDate}&`;
  if (endDate) url += `endDate=${endDate}&`;

  try {
    const reservations = await apiCall(url);
    renderReservationsList(reservations);
  } catch (error) {
    console.error('Failed to load reservations:', error);
  }
}

function renderReservationsList(reservations) {
  const container = document.getElementById('reservationsList');

  if (!container) {
    console.error('reservationsList element not found');
    return;
  }

  if (reservations.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">예약이 없습니다</h3>
        <p class="mt-1 text-sm text-gray-500">필터 조건을 변경하거나 예약 동기화를 실행하세요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="min-w-full">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">채널</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">숙소/객실</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">고객 정보</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">체크인</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">체크아웃</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">인원</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">금액</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">상태</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        ${reservations.map(res => {
          const checkIn = new Date(res.check_in);
          const checkOut = new Date(res.check_out);
          const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

          return `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 text-xs rounded ${getChannelColor(res.channel)}">
                  ${getChannelName(res.channel)}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">${res.rooms?.properties?.name || '-'}</div>
                <div class="text-xs text-gray-500">${res.rooms?.name || '-'}</div>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">${res.guest_name}</div>
                ${res.guest_email ? `<div class="text-xs text-gray-500">${res.guest_email}</div>` : ''}
                ${res.guest_phone ? `<div class="text-xs text-gray-500">${res.guest_phone}</div>` : ''}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${checkIn.toLocaleDateString('ko-KR')}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${checkOut.toLocaleDateString('ko-KR')}
                <span class="text-xs text-gray-500">(${nights}박)</span>
              </td>
              <td class="px-4 py-3 text-center text-sm text-gray-700">
                ${res.number_of_guests}명
              </td>
              <td class="px-4 py-3 text-right">
                <div class="text-sm font-semibold text-gray-900">
                  ${parseFloat(res.total_price).toLocaleString()}원
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <select onchange="updateReservationStatus('${res.id}', this.value)"
                  class="px-2 py-1 text-xs rounded border ${getStatusColorForSelect(res.status)}">
                  <option value="CONFIRMED" ${res.status === 'CONFIRMED' ? 'selected' : ''}>확정</option>
                  <option value="CHECKED_IN" ${res.status === 'CHECKED_IN' ? 'selected' : ''}>체크인</option>
                  <option value="CHECKED_OUT" ${res.status === 'CHECKED_OUT' ? 'selected' : ''}>체크아웃</option>
                  <option value="CANCELLED" ${res.status === 'CANCELLED' ? 'selected' : ''}>취소</option>
                  <option value="NO_SHOW" ${res.status === 'NO_SHOW' ? 'selected' : ''}>노쇼</option>
                </select>
              </td>
              <td class="px-4 py-3 text-center">
                <button onclick="viewReservationDetail('${res.id}')"
                  class="text-blue-600 hover:text-blue-800 text-xs">
                  상세
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function getStatusColorForSelect(status) {
  const colors = {
    'CONFIRMED': 'bg-green-50 text-green-800 border-green-200',
    'CANCELLED': 'bg-red-50 text-red-800 border-red-200',
    'CHECKED_IN': 'bg-blue-50 text-blue-800 border-blue-200',
    'CHECKED_OUT': 'bg-gray-50 text-gray-800 border-gray-200',
    'NO_SHOW': 'bg-orange-50 text-orange-800 border-orange-200'
  };
  return colors[status] || 'bg-gray-50 text-gray-800 border-gray-200';
}

async function filterReservations() {
  await loadReservationsList();
}

async function syncReservations() {
  showToast('예약 동기화 기능은 준비 중입니다.', 'error');
  return;
}

async function viewReservationDetail(id) {
  showToast('예약 상세 조회 기능은 준비 중입니다.', 'error');
  return;
}

async function updateReservationStatus(id, status) {
  showToast('예약 상태 업데이트 기능은 준비 중입니다.', 'error');
  return;
}

router.register('reservations', loadReservations);
