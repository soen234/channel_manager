// 객실현황 페이지
async function loadRoomStatus() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">객실현황</h1>
      <p class="text-gray-600">날짜별 객실 예약 현황을 확인합니다</p>
    </div>

    <!-- 필터 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">숙소 선택</label>
          <select id="statusPropertyId" onchange="loadRoomStatusData()" class="w-full px-3 py-2 border rounded-lg">
            <option value="">전체 숙소</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">시작일</label>
          <input type="date" id="statusStartDate" onchange="loadRoomStatusData()"
            class="w-full px-3 py-2 border rounded-lg" value="${getToday()}">
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">종료일</label>
          <input type="date" id="statusEndDate" onchange="loadRoomStatusData()"
            class="w-full px-3 py-2 border rounded-lg" value="${getDateAfterDays(14)}">
        </div>
        <div class="flex items-end">
          <button onclick="loadRoomStatusData()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            조회
          </button>
        </div>
      </div>
    </div>

    <!-- 객실현황 테이블 -->
    <div id="roomStatusContent" class="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
      <div class="text-center py-8 text-gray-500">
        숙소와 날짜를 선택하세요
      </div>
    </div>

    <!-- 범례 -->
    <div class="mt-4 bg-white rounded-lg shadow-md p-4">
      <h3 class="font-semibold mb-2">범례</h3>
      <div class="flex flex-wrap gap-4">
        <div class="flex items-center">
          <div class="w-4 h-4 bg-green-100 border border-green-300 mr-2"></div>
          <span class="text-sm">예약 가능</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-blue-100 border border-blue-300 mr-2"></div>
          <span class="text-sm">예약됨</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-red-100 border border-red-300 mr-2"></div>
          <span class="text-sm">체크인</span>
        </div>
        <div class="flex items-center">
          <div class="w-4 h-4 bg-gray-100 border border-gray-300 mr-2"></div>
          <span class="text-sm">체크아웃</span>
        </div>
      </div>
    </div>
  `;

  // Wait for DOM to be ready
  await new Promise(resolve => setTimeout(resolve, 0));

  await loadPropertyListForStatus();
  await loadRoomStatusData();
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function loadPropertyListForStatus() {
  try {
    const properties = await apiCall('/properties');
    const select = document.getElementById('statusPropertyId');

    if (!select) {
      console.error('statusPropertyId element not found');
      return;
    }

    select.innerHTML = '<option value="">전체 숙소</option>' +
      properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

async function loadRoomStatusData() {
  const propertyIdEl = document.getElementById('statusPropertyId');
  const startDateEl = document.getElementById('statusStartDate');
  const endDateEl = document.getElementById('statusEndDate');

  if (!propertyIdEl || !startDateEl || !endDateEl) {
    console.error('Required form elements not found');
    return;
  }

  const propertyId = propertyIdEl.value;
  const startDate = startDateEl.value;
  const endDate = endDateEl.value;

  if (!startDate || !endDate) {
    showToast('시작일과 종료일을 선택해주세요.', 'error');
    return;
  }

  try {
    // 숙소 목록 가져오기
    let properties = await apiCall('/properties');

    if (propertyId) {
      properties = properties.filter(p => p.id === propertyId);
    }

    if (properties.length === 0) {
      document.getElementById('roomStatusContent').innerHTML = `
        <div class="text-center py-8 text-gray-500">숙소가 없습니다</div>
      `;
      return;
    }

    // 모든 객실 추출
    const rooms = [];
    properties.forEach(property => {
      if (property.rooms && property.rooms.length > 0) {
        property.rooms.forEach(room => {
          rooms.push({
            ...room,
            property_name: property.name
          });
        });
      }
    });

    if (rooms.length === 0) {
      document.getElementById('roomStatusContent').innerHTML = `
        <div class="text-center py-8 text-gray-500">객실이 없습니다</div>
      `;
      return;
    }

    // 예약 데이터 가져오기
    const reservations = await apiCall(`/reservations?startDate=${startDate}&endDate=${endDate}`);

    renderRoomStatusTable(rooms, reservations, startDate, endDate);
  } catch (error) {
    console.error('Failed to load room status:', error);
    showToast('데이터 로딩 실패', 'error');
  }
}

function renderRoomStatusTable(rooms, reservations, startDate, endDate) {
  const container = document.getElementById('roomStatusContent');

  // Check if container exists
  if (!container) {
    console.error('roomStatusContent element not found');
    return;
  }

  // 날짜 배열 생성
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d).toISOString().split('T')[0]);
  }

  // 객실별 예약 맵 생성 (room_id -> date -> reservation)
  const roomReservationMap = {};
  rooms.forEach(room => {
    roomReservationMap[room.id] = {};
  });

  reservations.forEach(res => {
    const checkIn = new Date(res.check_in);
    const checkOut = new Date(res.check_out);

    // 체크인부터 체크아웃 전날까지 예약으로 표시
    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!roomReservationMap[res.room_id]) {
        roomReservationMap[res.room_id] = {};
      }
      if (!roomReservationMap[res.room_id][dateStr]) {
        roomReservationMap[res.room_id][dateStr] = [];
      }
      roomReservationMap[res.room_id][dateStr].push({
        ...res,
        isCheckIn: d.toISOString().split('T')[0] === checkIn.toISOString().split('T')[0],
        isCheckOut: d.toISOString().split('T')[0] === new Date(checkOut.getTime() - 86400000).toISOString().split('T')[0]
      });
    }
  });

  container.innerHTML = `
    <div class="min-w-max">
      <table class="min-w-full border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th class="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r-2 border-gray-300 min-w-[200px]">
              객실
            </th>
            ${dates.map(date => {
              const d = new Date(date);
              const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return `
                <th class="px-2 py-3 text-center text-xs font-semibold border ${isWeekend ? 'bg-blue-50 text-red-600' : 'text-gray-600'} min-w-[120px]">
                  <div>${date.split('-')[1]}/${date.split('-')[2]}</div>
                  <div class="text-xs ${isWeekend ? 'text-red-600 font-bold' : 'text-gray-500'}">${dayOfWeek}</div>
                </th>
              `;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${rooms.map(room => `
            <tr class="border-b hover:bg-gray-50">
              <td class="sticky left-0 z-10 bg-white px-4 py-3 border-r-2 border-gray-300">
                <div class="font-medium text-gray-900">${room.name}</div>
                <div class="text-xs text-gray-500">${room.property_name}</div>
                <div class="text-xs text-gray-400">${room.type}</div>
              </td>
              ${dates.map(date => {
                const reservationsForDate = roomReservationMap[room.id]?.[date] || [];
                const hasReservation = reservationsForDate.length > 0;

                if (!hasReservation) {
                  return `
                    <td class="px-2 py-2 border text-center bg-green-50">
                      <div class="text-xs text-green-700">예약가능</div>
                    </td>
                  `;
                }

                const reservation = reservationsForDate[0];
                const isCheckIn = reservation.isCheckIn;
                const isCheckOut = reservation.isCheckOut;

                let bgColor = 'bg-blue-100';
                let borderColor = 'border-blue-300';
                let statusText = '예약';

                if (reservation.status === 'CHECKED_IN') {
                  bgColor = 'bg-red-100';
                  borderColor = 'border-red-300';
                  statusText = '체크인';
                } else if (reservation.status === 'CHECKED_OUT') {
                  bgColor = 'bg-gray-100';
                  borderColor = 'border-gray-300';
                  statusText = '체크아웃';
                }

                return `
                  <td class="px-2 py-2 border ${bgColor} ${borderColor}">
                    <div class="text-xs font-semibold text-gray-800">${reservation.guest_name}</div>
                    <div class="text-xs text-gray-600">${parseFloat(reservation.total_price).toLocaleString()}원</div>
                    <div class="text-xs text-gray-500">${getChannelName(reservation.channel)}</div>
                    ${isCheckIn ? '<div class="text-xs text-blue-600 font-bold">IN</div>' : ''}
                    ${isCheckOut ? '<div class="text-xs text-orange-600 font-bold">OUT</div>' : ''}
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

router.register('room-status', loadRoomStatus);
