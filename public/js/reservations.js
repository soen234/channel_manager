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
          const checkIn = new Date(res.checkIn);
          const checkOut = new Date(res.checkOut);
          const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

          return `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 text-xs rounded ${getChannelColor(res.channel)}">
                  ${getChannelName(res.channel)}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">${res.room?.property?.name || '-'}</div>
                <div class="text-xs text-gray-500">${res.room?.name || '-'}</div>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">${res.guestName}</div>
                ${res.guestEmail ? `<div class="text-xs text-gray-500">${res.guestEmail}</div>` : ''}
                ${res.guestPhone ? `<div class="text-xs text-gray-500">${res.guestPhone}</div>` : ''}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${checkIn.toLocaleDateString('ko-KR')}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${checkOut.toLocaleDateString('ko-KR')}
                <span class="text-xs text-gray-500">(${nights}박)</span>
              </td>
              <td class="px-4 py-3 text-center text-sm text-gray-700">
                ${res.numberOfGuests}명
              </td>
              <td class="px-4 py-3 text-right">
                <div class="text-sm font-semibold text-gray-900">
                  ${res.totalPrice.toLocaleString()}원
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
  if (!confirm('모든 채널의 예약을 동기화하시겠습니까?')) return;

  try {
    await apiCall('/reservations/sync', {
      method: 'POST',
      body: JSON.stringify({})
    });
    showToast('예약 동기화가 완료되었습니다.');
    await loadReservationsList();
  } catch (error) {
    showToast('동기화 실패', 'error');
  }
}

async function updateReservationStatus(id, status) {
  try {
    await apiCall(`/reservations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    showToast('예약 상태가 업데이트되었습니다.');
  } catch (error) {
    showToast('상태 업데이트 실패', 'error');
    await loadReservationsList();
  }
}

async function viewReservationDetail(id) {
  try {
    const reservation = await apiCall(`/reservations/${id}`);

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <h2 class="text-2xl font-bold mb-6">예약 상세</h2>

        <div class="grid grid-cols-2 gap-6">
          <div>
            <h3 class="font-semibold text-gray-700 mb-2">채널 정보</h3>
            <div class="space-y-1">
              <p class="text-sm"><span class="font-medium">채널:</span> ${getChannelName(reservation.channel)}</p>
              <p class="text-sm"><span class="font-medium">예약번호:</span> ${reservation.channelReservationId}</p>
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-gray-700 mb-2">숙소 정보</h3>
            <div class="space-y-1">
              <p class="text-sm"><span class="font-medium">숙소:</span> ${reservation.room?.property?.name || '-'}</p>
              <p class="text-sm"><span class="font-medium">객실:</span> ${reservation.room?.name || '-'}</p>
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-gray-700 mb-2">고객 정보</h3>
            <div class="space-y-1">
              <p class="text-sm"><span class="font-medium">이름:</span> ${reservation.guestName}</p>
              ${reservation.guestEmail ? `<p class="text-sm"><span class="font-medium">이메일:</span> ${reservation.guestEmail}</p>` : ''}
              ${reservation.guestPhone ? `<p class="text-sm"><span class="font-medium">전화:</span> ${reservation.guestPhone}</p>` : ''}
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-gray-700 mb-2">숙박 정보</h3>
            <div class="space-y-1">
              <p class="text-sm"><span class="font-medium">체크인:</span> ${new Date(reservation.checkIn).toLocaleDateString('ko-KR')}</p>
              <p class="text-sm"><span class="font-medium">체크아웃:</span> ${new Date(reservation.checkOut).toLocaleDateString('ko-KR')}</p>
              <p class="text-sm"><span class="font-medium">인원:</span> ${reservation.numberOfGuests}명</p>
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-gray-700 mb-2">금액 정보</h3>
            <div class="space-y-1">
              <p class="text-sm"><span class="font-medium">총 금액:</span> ${reservation.totalPrice.toLocaleString()}원</p>
              <p class="text-sm"><span class="font-medium">통화:</span> ${reservation.currency}</p>
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-gray-700 mb-2">상태</h3>
            <div class="space-y-1">
              <p class="text-sm">
                <span class="inline-block px-3 py-1 rounded ${getStatusColor(reservation.status)}">
                  ${getStatusText(reservation.status)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button onclick="this.closest('.fixed').remove()"
            class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            닫기
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    showToast('예약 정보를 불러오는데 실패했습니다.', 'error');
  }
}

router.register('reservations', loadReservations);
