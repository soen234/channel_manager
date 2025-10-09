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
    <div id="roomStatusContent" class="bg-white rounded-lg shadow-md py-6">
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

  // Wait for DOM elements to be ready
  try {
    await waitForElement('statusPropertyId');
    await loadPropertyListForStatus();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Failed to initialize room status:', error);
  }
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
    const select = await waitForElement('statusPropertyId');

    select.innerHTML = '<option value="">전체 숙소</option>' +
      properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

async function loadRoomStatusData() {
  try {
    const propertyIdEl = await waitForElement('statusPropertyId');
    const startDateEl = await waitForElement('statusStartDate');
    const endDateEl = await waitForElement('statusEndDate');

    const propertyId = propertyIdEl.value;
    const startDate = startDateEl.value;
    const endDate = endDateEl.value;

    if (!startDate || !endDate) {
      showToast('시작일과 종료일을 선택해주세요.', 'error');
      return;
    }
    // 숙소 목록 가져오기
    let properties = await apiCall('/properties');

    if (propertyId) {
      properties = properties.filter(p => p.id === propertyId);
    }

    if (properties.length === 0) {
      const content = document.getElementById('roomStatusContent');
      if (content) {
        content.innerHTML = `
          <div class="text-center py-8 text-gray-500">숙소가 없습니다</div>
        `;
      }
      return;
    }

    // 모든 객실 추출 (total_rooms 개수만큼 분리)
    const rooms = [];
    properties.forEach(property => {
      if (property.rooms && property.rooms.length > 0) {
        property.rooms.forEach(room => {
          const totalRooms = room.total_rooms || 1;
          // 각 객실 유닛을 별도 행으로 표시
          for (let i = 0; i < totalRooms; i++) {
            rooms.push({
              ...room,
              property_name: property.name,
              unit_number: i + 1,
              room_type_id: room.id, // Original room type ID
              display_id: `${room.id}_${i}` // Unique display ID for each unit
            });
          }
        });
      }
    });

    if (rooms.length === 0) {
      const content = document.getElementById('roomStatusContent');
      if (content) {
        content.innerHTML = `
          <div class="text-center py-8 text-gray-500">객실이 없습니다</div>
        `;
      }
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

  // Tetris-style allocation: Optimize reservation placement for maximum consecutive availability
  const roomAllocation = allocateReservationsOptimally(rooms, reservations, dates);

  container.innerHTML = `
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full">
        <table class="min-w-full border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th class="sticky left-0 z-20 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-600 border-r-2 border-gray-300 w-40 max-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
          ${rooms.map(room => {
            const allocation = roomAllocation[room.display_id] || {};

            return `
              <tr class="border-b hover:bg-gray-50">
                <td class="sticky left-0 z-10 bg-white px-3 py-2 border-r-2 border-gray-300 w-40 max-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div class="font-medium text-gray-900 text-sm leading-tight break-words">${room.name} #${room.unit_number}</div>
                  <div class="text-xs text-gray-500 mt-1 break-words">${room.property_name}</div>
                </td>
                ${renderRoomRow(allocation, dates, room)}
              </tr>
            `;
          }).join('')}
        </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRoomRow(allocation, dates, room) {
  const renderedDates = new Set();

  return dates.map(date => {
    if (renderedDates.has(date)) {
      return '';
    }

    const reservation = allocation[date];

    if (!reservation) {
      renderedDates.add(date);
      return `
        <td class="px-2 py-2 border text-center bg-green-50 cursor-pointer hover:bg-green-100 drop-zone"
            data-room-id="${room.room_type_id}"
            data-date="${date}"
            ondragover="handleDragOver(event)"
            ondragleave="handleDragLeave(event)"
            ondrop="handleDrop(event)"
            ontouchend="handleDropZoneTap(event)"
            onclick="handleDropZoneClick(event, '${room.room_type_id}', '${date}')">
          <div class="text-xs text-green-700">예약가능</div>
        </td>
      `;
    }

    // Calculate colspan for multi-day reservations
    const checkInDate = new Date(reservation.check_in).toISOString().split('T')[0];
    const checkOutDate = new Date(reservation.check_out);
    const isCheckIn = date === checkInDate;

    let colspan = 1;
    if (isCheckIn) {
      const currentDate = new Date(date);
      for (let d = new Date(currentDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (dates.includes(dateStr)) {
          renderedDates.add(dateStr);
          if (dateStr !== date) {
            colspan++;
          }
        }
      }
    } else {
      renderedDates.add(date);
    }

    const checkOutDay = new Date(checkOutDate.getTime() - 86400000).toISOString().split('T')[0];
    const isCheckOut = date === checkOutDay;

    let bgColor = 'bg-blue-100';
    let borderColor = 'border-blue-300';

    if (reservation.status === 'CHECKED_IN') {
      bgColor = 'bg-red-100';
      borderColor = 'border-red-300';
    } else if (reservation.status === 'CHECKED_OUT') {
      bgColor = 'bg-gray-100';
      borderColor = 'border-gray-300';
    } else if (reservation.status === 'CANCELLED') {
      bgColor = 'bg-orange-100';
      borderColor = 'border-orange-300';
    }

    return `
      <td colspan="${colspan}" class="px-2 py-2 border ${bgColor} ${borderColor} cursor-move hover:opacity-80 reservation-cell"
          draggable="true"
          data-reservation-id="${reservation.id}"
          data-room-id="${reservation.room_id}"
          data-check-in="${reservation.check_in}"
          data-check-out="${reservation.check_out}"
          data-guest-name="${reservation.guest_name}"
          ondragstart="handleDragStart(event)"
          ondragend="handleDragEnd(event)"
          ontouchstart="handleTouchStart(event)"
          ontouchmove="handleTouchMove(event)"
          ontouchend="handleTouchEnd(event)"
          onclick="showReservationDetail('${reservation.id}')">
        <div class="text-xs font-semibold text-gray-800">${reservation.guest_name}</div>
        <div class="text-xs text-gray-600">${parseFloat(reservation.total_price).toLocaleString()}원</div>
        <div class="text-xs text-gray-500">${getChannelName(reservation.channel)}</div>
        ${isCheckIn ? '<div class="text-xs text-blue-600 font-bold">IN</div>' : ''}
        ${isCheckOut ? '<div class="text-xs text-orange-600 font-bold">OUT</div>' : ''}
      </td>
    `;
  }).join('');
}

// Tetris-style allocation algorithm
function allocateReservationsOptimally(rooms, reservations, dates) {
  // Filter out cancelled reservations
  const activeReservations = reservations.filter(res => res.status !== 'CANCELLED');

  // Group reservations by room type
  const reservationsByType = {};
  activeReservations.forEach(res => {
    if (!reservationsByType[res.room_id]) {
      reservationsByType[res.room_id] = [];
    }
    reservationsByType[res.room_id].push({
      ...res,
      checkInDate: new Date(res.check_in).toISOString().split('T')[0],
      checkOutDate: new Date(res.check_out).toISOString().split('T')[0],
      nights: Math.ceil((new Date(res.check_out) - new Date(res.check_in)) / (1000 * 60 * 60 * 24))
    });
  });

  // Sort reservations by check-in date, then by number of nights (longer stays first)
  Object.keys(reservationsByType).forEach(roomTypeId => {
    reservationsByType[roomTypeId].sort((a, b) => {
      const dateCompare = a.checkInDate.localeCompare(b.checkInDate);
      if (dateCompare !== 0) return dateCompare;
      return b.nights - a.nights; // Longer stays first (Tetris optimization)
    });
  });

  // Allocate each reservation to a room unit
  const allocation = {};

  // Initialize allocation structure
  rooms.forEach(room => {
    allocation[room.display_id] = {};
  });

  // Process each room type's reservations
  Object.keys(reservationsByType).forEach(roomTypeId => {
    const typeReservations = reservationsByType[roomTypeId];
    const roomUnits = rooms.filter(r => r.room_type_id === roomTypeId);

    typeReservations.forEach(reservation => {
      // Find the best unit for this reservation (Tetris strategy)
      let bestUnit = null;
      let bestScore = -1;

      roomUnits.forEach(unit => {
        // Check if unit is available for entire reservation period
        const isAvailable = isUnitAvailable(
          allocation[unit.display_id],
          reservation.checkInDate,
          reservation.checkOutDate,
          dates
        );

        if (isAvailable) {
          // Calculate score: prefer units with minimal fragmentation
          const score = calculateAllocationScore(
            allocation[unit.display_id],
            reservation.checkInDate,
            reservation.checkOutDate,
            dates
          );

          if (score > bestScore) {
            bestScore = score;
            bestUnit = unit;
          }
        }
      });

      // Allocate reservation to best unit
      if (bestUnit) {
        const checkIn = new Date(reservation.checkInDate);
        const checkOut = new Date(reservation.checkOutDate);

        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (dates.includes(dateStr)) {
            allocation[bestUnit.display_id][dateStr] = reservation;
          }
        }
      } else {
        console.warn('Could not allocate reservation:', reservation);
      }
    });
  });

  return allocation;
}

function isUnitAvailable(unitAllocation, checkInDate, checkOutDate, dates) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (dates.includes(dateStr) && unitAllocation[dateStr]) {
      return false;
    }
  }

  return true;
}

function calculateAllocationScore(unitAllocation, checkInDate, checkOutDate, dates) {
  // Higher score = better allocation
  // Factors:
  // 1. Prefer filling gaps (reduce fragmentation)
  // 2. Prefer creating longer consecutive available periods

  let score = 100;

  const checkInIdx = dates.indexOf(checkInDate);
  const checkOutIdx = dates.indexOf(new Date(new Date(checkOutDate).getTime() - 86400000).toISOString().split('T')[0]);

  // Check before reservation: prefer if there's an existing reservation adjacent
  if (checkInIdx > 0) {
    const dayBefore = dates[checkInIdx - 1];
    if (unitAllocation[dayBefore]) {
      score += 50; // Bonus for filling gap after existing reservation
    }
  }

  // Check after reservation: prefer if there's an existing reservation adjacent
  if (checkOutIdx < dates.length - 1) {
    const dayAfter = dates[checkOutIdx + 1];
    if (unitAllocation[dayAfter]) {
      score += 50; // Bonus for filling gap before existing reservation
    }
  }

  // Count consecutive available days before this reservation
  let beforeGap = 0;
  for (let i = checkInIdx - 1; i >= 0; i--) {
    if (!unitAllocation[dates[i]]) {
      beforeGap++;
    } else {
      break;
    }
  }

  // Count consecutive available days after this reservation
  let afterGap = 0;
  for (let i = checkOutIdx + 1; i < dates.length; i++) {
    if (!unitAllocation[dates[i]]) {
      afterGap++;
    } else {
      break;
    }
  }

  // Penalize creating small gaps (< 2 days)
  if (beforeGap === 1) score -= 30;
  if (afterGap === 1) score -= 30;

  return score;
}

// Show reservation detail modal
async function showReservationDetail(reservationId) {
  try {
    const reservation = await apiCall(`/reservations/${reservationId}`);
    const properties = await apiCall('/properties');

    // Build room options
    let roomOptions = '';
    properties.forEach(property => {
      if (property.rooms && property.rooms.length > 0) {
        property.rooms.forEach(room => {
          const selected = room.id === reservation.room_id ? 'selected' : '';
          roomOptions += `<option value="${room.id}" ${selected}>${property.name} - ${room.name}</option>`;
        });
      }
    });

    const modal = document.createElement('div');
    modal.id = 'reservationDetailModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 md:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-start mb-6">
          <h2 class="text-xl md:text-2xl font-bold">예약 상세 정보</h2>
          <button onclick="closeReservationDetail()" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form id="detailEditForm" onsubmit="saveReservationDetail(event, '${reservationId}')">
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-600 mb-1">객실</label>
              <select id="detailRoomId" required class="w-full px-3 py-2 border rounded-lg">
                ${roomOptions}
              </select>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">투숙객명 *</label>
                <input type="text" id="detailGuestName" required value="${reservation.guest_name}" class="w-full px-3 py-2 border rounded-lg">
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">연락처</label>
                <input type="tel" id="detailGuestPhone" value="${reservation.guest_phone || ''}" class="w-full px-3 py-2 border rounded-lg">
              </div>
            </div>

            <div>
              <label class="block text-sm text-gray-600 mb-1">이메일</label>
              <input type="email" id="detailGuestEmail" value="${reservation.guest_email || ''}" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">체크인 *</label>
                <input type="date" id="detailCheckIn" required value="${reservation.check_in}" class="w-full px-3 py-2 border rounded-lg">
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">체크아웃 *</label>
                <input type="date" id="detailCheckOut" required value="${reservation.check_out}" class="w-full px-3 py-2 border rounded-lg">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">인원 *</label>
                <input type="number" id="detailNumberOfGuests" required min="1" value="${reservation.number_of_guests}" class="w-full px-3 py-2 border rounded-lg">
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">총 금액 *</label>
                <input type="number" id="detailTotalPrice" required step="0.01" value="${reservation.total_price}" class="w-full px-3 py-2 border rounded-lg">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">채널</label>
                <select id="detailChannel" class="w-full px-3 py-2 border rounded-lg">
                  <option value="DIRECT" ${reservation.channel === 'DIRECT' ? 'selected' : ''}>직접 예약</option>
                  <option value="BOOKING_COM" ${reservation.channel === 'BOOKING_COM' ? 'selected' : ''}>Booking.com</option>
                  <option value="YANOLJA" ${reservation.channel === 'YANOLJA' ? 'selected' : ''}>야놀자</option>
                  <option value="AIRBNB" ${reservation.channel === 'AIRBNB' ? 'selected' : ''}>Airbnb</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">상태</label>
                <select id="detailStatus" class="w-full px-3 py-2 border rounded-lg">
                  <option value="CONFIRMED" ${reservation.status === 'CONFIRMED' ? 'selected' : ''}>확정</option>
                  <option value="CHECKED_IN" ${reservation.status === 'CHECKED_IN' ? 'selected' : ''}>체크인</option>
                  <option value="CHECKED_OUT" ${reservation.status === 'CHECKED_OUT' ? 'selected' : ''}>체크아웃</option>
                  <option value="CANCELLED" ${reservation.status === 'CANCELLED' ? 'selected' : ''}>취소</option>
                  <option value="NO_SHOW" ${reservation.status === 'NO_SHOW' ? 'selected' : ''}>노쇼</option>
                </select>
              </div>
            </div>
          </div>

          <div class="mt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button type="button" onclick="closeReservationDetail()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
              취소
            </button>
            <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              저장
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to load reservation detail:', error);
    showToast('예약 정보를 불러올 수 없습니다', 'error');
  }
}

async function saveReservationDetail(event, reservationId) {
  event.preventDefault();

  const guestName = document.getElementById('detailGuestName').value.trim();
  const checkIn = document.getElementById('detailCheckIn').value;
  const checkOut = document.getElementById('detailCheckOut').value;
  const totalPrice = document.getElementById('detailTotalPrice').value;
  const numberOfGuests = document.getElementById('detailNumberOfGuests').value;

  // Validation
  if (!guestName) {
    showToast('투숙객명을 입력해주세요', 'error');
    return;
  }

  if (new Date(checkIn) >= new Date(checkOut)) {
    showToast('체크아웃 날짜는 체크인 날짜보다 뒤여야 합니다', 'error');
    return;
  }

  if (!totalPrice || parseFloat(totalPrice) <= 0) {
    showToast('유효한 금액을 입력해주세요', 'error');
    return;
  }

  if (!numberOfGuests || parseInt(numberOfGuests) < 1) {
    showToast('투숙 인원은 최소 1명 이상이어야 합니다', 'error');
    return;
  }

  try {
    await apiCall('/reservations/update', {
      method: 'POST',
      body: JSON.stringify({
        id: reservationId,
        room_id: document.getElementById('detailRoomId').value,
        guest_name: guestName,
        guest_email: document.getElementById('detailGuestEmail').value || null,
        guest_phone: document.getElementById('detailGuestPhone').value || null,
        check_in: checkIn,
        check_out: checkOut,
        number_of_guests: parseInt(numberOfGuests),
        total_price: parseFloat(totalPrice),
        channel: document.getElementById('detailChannel').value,
        status: document.getElementById('detailStatus').value
      })
    });

    showToast('예약이 수정되었습니다', 'success');
    closeReservationDetail();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Failed to update reservation:', error);
    showToast(error.message || '예약 수정 실패', 'error');
  }
}

function closeReservationDetail() {
  const modal = document.getElementById('reservationDetailModal');
  if (modal) {
    modal.remove();
  }
}

function navigateToReservations() {
  closeReservationDetail();
  router.navigate('reservations');
}

// Show quick create reservation modal
async function showQuickCreateReservation(roomId, checkInDate) {
  try {
    const properties = await apiCall('/properties');

    // Find the room
    let selectedRoom = null;
    for (const property of properties) {
      if (property.rooms) {
        selectedRoom = property.rooms.find(r => r.id === roomId);
        if (selectedRoom) {
          selectedRoom.propertyName = property.name;
          break;
        }
      }
    }

    if (!selectedRoom) {
      showToast('객실 정보를 찾을 수 없습니다', 'error');
      return;
    }

    const tomorrow = new Date(checkInDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkOutDate = tomorrow.toISOString().split('T')[0];

    const modal = document.createElement('div');
    modal.id = 'quickCreateModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-6">예약 생성</h2>
        <form id="quickCreateForm" onsubmit="submitQuickCreate(event, '${roomId}', '${checkInDate}', '${checkOutDate}')">
          <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-blue-800"><strong>객실:</strong> ${selectedRoom.propertyName} - ${selectedRoom.name}</p>
              <p class="text-sm text-blue-800"><strong>체크인:</strong> ${new Date(checkInDate).toLocaleDateString('ko-KR')}</p>
              <p class="text-sm text-blue-800"><strong>체크아웃:</strong> ${new Date(checkOutDate).toLocaleDateString('ko-KR')}</p>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">투숙객명 *</label>
              <input type="text" id="quickGuestName" required class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">전화번호</label>
                <input type="tel" id="quickGuestPhone" class="w-full px-3 py-2 border rounded-lg">
              </div>
              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">투숙 인원 *</label>
                <input type="number" id="quickNumberOfGuests" required min="1" value="2" class="w-full px-3 py-2 border rounded-lg">
              </div>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">총 금액 *</label>
              <input type="number" id="quickTotalPrice" required step="0.01" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">채널</label>
              <select id="quickChannel" class="w-full px-3 py-2 border rounded-lg">
                <option value="DIRECT">직접 예약</option>
                <option value="BOOKING_COM">Booking.com</option>
                <option value="YANOLJA">야놀자</option>
                <option value="AIRBNB">Airbnb</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" onclick="closeQuickCreate()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
              취소
            </button>
            <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              예약 생성
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to show quick create modal:', error);
    showToast('예약 생성 화면을 열 수 없습니다', 'error');
  }
}

function closeQuickCreate() {
  const modal = document.getElementById('quickCreateModal');
  if (modal) {
    modal.remove();
  }
}

async function submitQuickCreate(event, roomId, checkIn, checkOut) {
  event.preventDefault();

  const guestName = document.getElementById('quickGuestName').value.trim();
  const guestPhone = document.getElementById('quickGuestPhone').value;
  const numberOfGuests = document.getElementById('quickNumberOfGuests').value;
  const totalPrice = document.getElementById('quickTotalPrice').value;
  const channel = document.getElementById('quickChannel').value;

  if (!guestName) {
    showToast('투숙객명을 입력해주세요', 'error');
    return;
  }

  if (!totalPrice || parseFloat(totalPrice) <= 0) {
    showToast('유효한 금액을 입력해주세요', 'error');
    return;
  }

  if (!numberOfGuests || parseInt(numberOfGuests) < 1) {
    showToast('투숙 인원은 최소 1명 이상이어야 합니다', 'error');
    return;
  }

  try {
    await apiCall('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        room_id: roomId,
        channel: channel,
        guest_name: guestName,
        guest_phone: guestPhone || null,
        check_in: checkIn,
        check_out: checkOut,
        number_of_guests: parseInt(numberOfGuests),
        total_price: parseFloat(totalPrice),
        status: 'CONFIRMED'
      })
    });

    showToast('예약이 생성되었습니다', 'success');
    closeQuickCreate();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Failed to create reservation:', error);
    showToast(error.message || '예약 생성 실패', 'error');
  }
}

function getStatusName(status) {
  const statusMap = {
    'CONFIRMED': '확정',
    'CHECKED_IN': '체크인',
    'CHECKED_OUT': '체크아웃',
    'CANCELLED': '취소',
    'NO_SHOW': '노쇼'
  };
  return statusMap[status] || status;
}

// Drag and drop handlers
let draggedReservation = null;
let touchStartTime = 0;
let touchMoved = false;

function handleDragStart(event) {
  const cell = event.currentTarget;
  draggedReservation = {
    id: cell.dataset.reservationId,
    roomId: cell.dataset.roomId,
    checkIn: cell.dataset.checkIn,
    checkOut: cell.dataset.checkOut,
    guestName: cell.dataset.guestName
  };

  cell.style.opacity = '0.5';

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', cell.innerHTML);
  }

  // Prevent click event when dragging
  event.stopPropagation();
}

// Touch event handlers for mobile
function handleTouchStart(event) {
  touchStartTime = Date.now();
  touchMoved = false;

  const cell = event.currentTarget;

  // Long press detection for drag initiation
  setTimeout(() => {
    if (!touchMoved && Date.now() - touchStartTime >= 500) {
      // Start drag mode
      draggedReservation = {
        id: cell.dataset.reservationId,
        roomId: cell.dataset.roomId,
        checkIn: cell.dataset.checkIn,
        checkOut: cell.dataset.checkOut,
        guestName: cell.dataset.guestName
      };

      cell.style.opacity = '0.5';
      cell.style.transform = 'scale(0.95)';

      // Visual feedback
      showToast('예약을 이동할 위치를 선택하세요', 'info');

      // Add drop-mode class to all drop zones
      document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.add('bg-yellow-100', 'border-2', 'border-yellow-400');
      });

      event.preventDefault();
    }
  }, 500);
}

function handleTouchMove(event) {
  touchMoved = true;
}

function handleTouchEnd(event) {
  const cell = event.currentTarget;

  if (draggedReservation && Date.now() - touchStartTime >= 500) {
    // Dragging mode - wait for drop zone tap
    event.preventDefault();
  } else {
    // Normal click
    cell.style.opacity = '1';
    cell.style.transform = 'scale(1)';
  }
}

function handleDropZoneClick(event, roomId, date) {
  if (draggedReservation) {
    // In drag mode, handle drop
    handleDropZoneTap(event);
  } else {
    // Normal click, show quick create
    showQuickCreateReservation(roomId, date);
  }
}

function handleDropZoneTap(event) {
  if (!draggedReservation) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const dropZone = event.currentTarget;
  const newRoomId = dropZone.dataset.roomId;
  const newCheckInDate = dropZone.dataset.date;

  // Calculate new checkout date
  const oldCheckIn = new Date(draggedReservation.checkIn);
  const oldCheckOut = new Date(draggedReservation.checkOut);
  const durationDays = Math.ceil((oldCheckOut - oldCheckIn) / (1000 * 60 * 60 * 24));

  const newCheckOutDate = new Date(newCheckInDate);
  newCheckOutDate.setDate(newCheckOutDate.getDate() + durationDays);

  // Clear visual feedback
  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.classList.remove('bg-yellow-100', 'border-2', 'border-yellow-400');
  });

  document.querySelectorAll('.reservation-cell').forEach(cell => {
    cell.style.opacity = '1';
    cell.style.transform = 'scale(1)';
  });

  // Show confirmation
  showMoveConfirmation(
    draggedReservation,
    newRoomId,
    newCheckInDate,
    newCheckOutDate.toISOString().split('T')[0]
  );

  draggedReservation = null;
}

function handleDragEnd(event) {
  event.currentTarget.style.opacity = '1';
}

function handleDragOver(event) {
  if (event.preventDefault) {
    event.preventDefault();
  }

  const dropZone = event.currentTarget;
  if (dropZone.classList.contains('drop-zone')) {
    dropZone.classList.add('bg-blue-100', 'border-blue-400');
    dropZone.classList.remove('bg-green-50');
  }

  event.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragLeave(event) {
  const dropZone = event.currentTarget;
  if (dropZone.classList.contains('drop-zone')) {
    dropZone.classList.remove('bg-blue-100', 'border-blue-400');
    dropZone.classList.add('bg-green-50');
  }
}

async function handleDrop(event) {
  if (event.stopPropagation) {
    event.stopPropagation();
  }

  event.preventDefault();

  const dropZone = event.currentTarget;
  dropZone.classList.remove('bg-blue-100', 'border-blue-400');
  dropZone.classList.add('bg-green-50');

  if (!draggedReservation) {
    return false;
  }

  const newRoomId = dropZone.dataset.roomId;
  const newCheckInDate = dropZone.dataset.date;

  // Calculate new checkout date (same duration)
  const oldCheckIn = new Date(draggedReservation.checkIn);
  const oldCheckOut = new Date(draggedReservation.checkOut);
  const durationDays = Math.ceil((oldCheckOut - oldCheckIn) / (1000 * 60 * 60 * 24));

  const newCheckOutDate = new Date(newCheckInDate);
  newCheckOutDate.setDate(newCheckOutDate.getDate() + durationDays);

  // Show confirmation modal
  await showMoveConfirmation(
    draggedReservation,
    newRoomId,
    newCheckInDate,
    newCheckOutDate.toISOString().split('T')[0]
  );

  draggedReservation = null;
  return false;
}

async function showMoveConfirmation(reservation, newRoomId, newCheckIn, newCheckOut) {
  try {
    // Get room info
    const properties = await apiCall('/properties');
    let oldRoomName = '';
    let newRoomName = '';

    for (const property of properties) {
      if (property.rooms) {
        const oldRoom = property.rooms.find(r => r.id === reservation.roomId);
        const newRoom = property.rooms.find(r => r.id === newRoomId);

        if (oldRoom) oldRoomName = `${property.name} - ${oldRoom.name}`;
        if (newRoom) newRoomName = `${property.name} - ${newRoom.name}`;
      }
    }

    const modal = document.createElement('div');
    modal.id = 'moveConfirmModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
        <h2 class="text-2xl font-bold mb-6">예약 이동 확인</h2>

        <div class="mb-6">
          <p class="text-lg mb-4"><strong>${reservation.guestName}</strong> 님의 예약을 이동하시겠습니까?</p>

          <div class="bg-gray-50 p-4 rounded-lg space-y-3">
            <div>
              <p class="text-sm text-gray-600">현재 정보</p>
              <p class="font-semibold">${oldRoomName}</p>
              <p class="text-sm">${new Date(reservation.checkIn).toLocaleDateString('ko-KR')} ~ ${new Date(reservation.checkOut).toLocaleDateString('ko-KR')}</p>
            </div>

            <div class="border-t pt-3">
              <p class="text-sm text-gray-600">변경될 정보</p>
              <p class="font-semibold text-blue-600">${newRoomName}</p>
              <p class="text-sm text-blue-600">${new Date(newCheckIn).toLocaleDateString('ko-KR')} ~ ${new Date(newCheckOut).toLocaleDateString('ko-KR')}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3">
          <button onclick="closeMoveConfirm()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
            취소
          </button>
          <button onclick="confirmMove('${reservation.id}', '${newRoomId}', '${newCheckIn}', '${newCheckOut}')"
                  class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            이동하기
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to show move confirmation:', error);
    showToast('예약 이동 확인창을 열 수 없습니다', 'error');
  }
}

function closeMoveConfirm() {
  const modal = document.getElementById('moveConfirmModal');
  if (modal) {
    modal.remove();
  }
}

async function confirmMove(reservationId, newRoomId, newCheckIn, newCheckOut) {
  try {
    await apiCall(`/reservations/update`, {
      method: 'POST',
      body: JSON.stringify({
        id: reservationId,
        room_id: newRoomId,
        check_in: newCheckIn,
        check_out: newCheckOut
      })
    });

    showToast('예약이 이동되었습니다', 'success');
    closeMoveConfirm();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Failed to move reservation:', error);
    showToast(error.message || '예약 이동 실패', 'error');
  }
}

router.register('room-status', loadRoomStatus);
