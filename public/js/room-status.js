// 객실현황 페이지
async function loadRoomStatus() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-4 md:mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">객실현황</h1>
      <p class="text-sm md:text-base text-gray-600">날짜별 객실 예약 현황을 확인합니다</p>
    </div>

    <!-- 필터 -->
    <div class="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
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
            class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm" value="${getToday()}">
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">종료일</label>
          <input type="date" id="statusEndDate" onchange="loadRoomStatusData()"
            class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm" value="${getDateAfterDays(14)}">
        </div>
        <div class="flex items-end">
          <button onclick="loadRoomStatusData()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            조회
          </button>
        </div>
      </div>
    </div>

    <!-- 배정되지 않은 예약 -->
    <div id="unassignedReservations" class="bg-yellow-50 rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
      <h3 class="font-semibold text-gray-800 mb-3">배정되지 않은 예약</h3>
      <div id="unassignedList" class="flex flex-wrap gap-2 min-h-[80px] p-2 border-2 border-dashed border-yellow-300 rounded-lg"
           ondragover="handleUnassignedDragOver(event)"
           ondragleave="handleUnassignedDragLeave(event)"
           ondrop="handleUnassignedDrop(event)">
      </div>
    </div>

    <!-- 객실현황 테이블 -->
    <div id="roomStatusContent" class="bg-white rounded-lg shadow-md p-4 md:p-6">
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
        <div class="flex items-center">
          <div class="w-4 h-4 bg-yellow-100 border-2 border-yellow-500 mr-2"></div>
          <span class="text-sm font-semibold text-yellow-700">결제 필요</span>
        </div>
      </div>
    </div>
  `;

  // Wait for DOM to be fully rendered
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

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

function getRoomNumberDisplay(room) {
  if (room.room_numbers && Array.isArray(room.room_numbers) && room.room_numbers.length > 0) {
    const index = room.unit_number - 1;
    if (index >= 0 && index < room.room_numbers.length && room.room_numbers[index]) {
      return ' ' + room.room_numbers[index];
    }
  }
  return ' #' + room.unit_number;
}

// 한국 공휴일 체크 함수
function isKoreanHoliday(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  // 고정 공휴일
  const fixedHolidays = [
    '01-01', // 신정
    '03-01', // 삼일절
    '05-05', // 어린이날
    '06-06', // 현충일
    '08-15', // 광복절
    '10-03', // 개천절
    '10-09', // 한글날
    '12-25'  // 크리스마스
  ];

  // 음력 공휴일 (양력 변환 근사치 - 주요 년도)
  const lunarHolidays = {
    2025: ['01-28', '01-29', '01-30', '05-05', '09-06', '09-07', '09-08'],
    2026: ['02-16', '02-17', '02-18', '05-24', '09-25', '09-26', '09-27'],
    2027: ['02-06', '02-07', '02-08', '05-13', '09-15', '09-16', '09-17'],
    2028: ['01-26', '01-27', '01-28', '05-01', '10-03', '10-04', '10-05'],
    2029: ['02-12', '02-13', '02-14', '05-20', '09-22', '09-23', '09-24'],
    2030: ['02-02', '02-03', '02-04', '05-09', '09-11', '09-12', '09-13']
  };

  const yearHolidays = lunarHolidays[year] || [];

  return fixedHolidays.includes(date) || yearHolidays.includes(date);
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

function showRoomStatusSkeleton() {
  const container = document.getElementById('roomStatusContent');
  if (!container) return;

  const skeletonRows = Array(5).fill(0).map(() => `
    <tr class="border-b">
      <td class="sticky left-0 z-10 bg-white px-3 py-2 border-r-2 border-gray-300 min-w-[160px]">
        <div class="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div class="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
      </td>
      ${Array(14).fill(0).map(() => `
        <td class="px-2 py-2 border">
          <div class="h-12 bg-gray-200 rounded animate-pulse"></div>
        </td>
      `).join('')}
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full">
        <table class="min-w-full border-collapse">
          <thead>
            <tr class="bg-gray-50">
              <th class="sticky left-0 z-20 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-600 border-r-2 border-gray-300 min-w-[160px]">
                <div class="h-4 bg-gray-300 rounded animate-pulse"></div>
              </th>
              ${Array(14).fill(0).map(() => `
                <th class="px-2 py-3 text-center text-xs font-semibold border min-w-[120px]">
                  <div class="h-4 bg-gray-300 rounded animate-pulse mb-1"></div>
                  <div class="h-3 bg-gray-300 rounded animate-pulse"></div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${skeletonRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
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

    // Show skeleton while loading
    showRoomStatusSkeleton();

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

    // 백그라운드에서 재고 동기화 (비동기로 실행, 에러 무시)
    syncInventoryInBackground(startDate, endDate);
  } catch (error) {
    console.error('Failed to load room status:', error);
    showToast('데이터 로딩 실패', 'error');
  }
}

async function syncInventoryInBackground(startDate, endDate) {
  try {
    await apiCall('/inventory/sync', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate })
    });
    console.log('Inventory synced in background');
  } catch (error) {
    console.error('Background inventory sync failed:', error);
    // 에러를 사용자에게 보여주지 않음 (백그라운드 작업)
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
  const { allocation: roomAllocation, unallocated } = allocateReservationsOptimally(rooms, reservations, dates);

  // Merge with existing unassigned reservations (preserve manually moved items)
  const existingUnassignedIds = new Set(unassignedReservations.map(r => r.id));
  const newUnallocated = unallocated.filter(r => !existingUnassignedIds.has(r.id));
  unassignedReservations = [...unassignedReservations, ...newUnallocated];

  renderUnassignedReservations();

  container.innerHTML = `
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full">
        <table class="min-w-full border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th class="sticky left-0 z-20 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-600 border-r-2 border-gray-300 min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              객실
            </th>
            ${dates.map(date => {
              const d = new Date(date);
              const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isHoliday = isKoreanHoliday(date);
              const isRed = isWeekend || isHoliday;
              return `
                <th class="px-2 py-3 text-center text-xs font-semibold border ${isRed ? 'bg-blue-50 text-red-600' : 'text-gray-600'} min-w-[120px]">
                  <div>${date.split('-')[1]}/${date.split('-')[2]}</div>
                  <div class="text-xs ${isRed ? 'text-red-600 font-bold' : 'text-gray-500'}">${dayOfWeek}</div>
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
                <td class="sticky left-0 z-10 bg-white px-3 py-2 border-r-2 border-gray-300 min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div class="font-medium text-gray-900 text-sm leading-tight break-words">${room.name}${getRoomNumberDisplay(room)}</div>
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
            data-display-id="${room.display_id}"
            data-unit-number="${room.unit_number}"
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
    let unpaidIndicator = '';

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

    // Highlight unpaid reservations
    if (reservation.payment_status === 'UNPAID' || !reservation.payment_status) {
      borderColor = 'border-yellow-500 border-2';
      unpaidIndicator = '<div class="text-xs text-yellow-700 font-bold bg-yellow-200 px-1 rounded">결제 필요</div>';
    }

    // Highlight manually placed reservations
    let manuallyPlacedIndicator = '';
    if (reservation.is_manually_placed) {
      borderColor = 'border-purple-500 border-2';
      manuallyPlacedIndicator = '<div class="text-xs text-purple-700 font-bold bg-purple-200 px-1 rounded">📌 고정</div>';
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
          ondragover="handleReservationDragOver(event)"
          ondragleave="handleReservationDragLeave(event)"
          ondrop="handleReservationDrop(event)"
          ontouchstart="handleTouchStart(event)"
          ontouchmove="handleTouchMove(event)"
          ontouchend="handleTouchEnd(event)"
          onclick="showReservationDetail('${reservation.id}')">
        <div class="text-xs font-semibold text-gray-800">${reservation.guest_name}</div>
        <div class="text-xs text-gray-600">${formatPrice(reservation.total_price, reservation.currency)}</div>
        <div class="text-xs text-gray-500">${getChannelName(reservation.channel)}</div>
        ${manuallyPlacedIndicator}
        ${unpaidIndicator}
        ${isCheckIn ? '<div class="text-xs text-blue-600 font-bold">IN</div>' : ''}
        ${isCheckOut ? '<div class="text-xs text-orange-600 font-bold">OUT</div>' : ''}
      </td>
    `;
  }).join('');
}

// Tetris-style allocation algorithm
function allocateReservationsOptimally(rooms, reservations, dates) {
  // Filter out cancelled reservations and already unassigned ones
  const unassignedIds = new Set(unassignedReservations.map(r => r.id));
  const activeReservations = reservations.filter(res =>
    res.status !== 'CANCELLED' && !unassignedIds.has(res.id)
  );

  // Separate manually placed and auto-allocatable reservations
  const manuallyPlacedReservations = activeReservations.filter(res => res.is_manually_placed);
  const autoAllocatableReservations = activeReservations.filter(res => !res.is_manually_placed);

  // Group auto-allocatable reservations by room type
  const reservationsByType = {};
  autoAllocatableReservations.forEach(res => {
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
  const unallocated = [];

  // Initialize allocation structure
  rooms.forEach(room => {
    allocation[room.display_id] = {};
  });

  // First, place all manually positioned reservations (they must not be moved)
  manuallyPlacedReservations.forEach(reservation => {
    // Find the specific room unit (display_id) for this reservation using room_unit_number
    let targetRoom;
    if (reservation.room_unit_number !== null && reservation.room_unit_number !== undefined) {
      // Find the exact unit based on room_id and unit_number
      targetRoom = rooms.find(r => r.room_type_id === reservation.room_id && r.unit_number === reservation.room_unit_number);
    } else {
      // Fallback: find any room of this type (for old data without room_unit_number)
      targetRoom = rooms.find(r => r.room_type_id === reservation.room_id);
    }

    if (!targetRoom) {
      console.warn('Manually placed reservation has invalid room_id or unit:', reservation);
      return;
    }

    const checkIn = new Date(reservation.check_in);
    const checkOut = new Date(reservation.check_out);

    // Mark this room unit as occupied for the reservation dates
    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        if (!allocation[targetRoom.display_id]) {
          allocation[targetRoom.display_id] = {};
        }
        allocation[targetRoom.display_id][dateStr] = {
          ...reservation,
          checkInDate: new Date(reservation.check_in).toISOString().split('T')[0],
          checkOutDate: new Date(reservation.check_out).toISOString().split('T')[0],
          nights: Math.ceil((new Date(reservation.check_out) - new Date(reservation.check_in)) / (1000 * 60 * 60 * 24))
        };
      }
    }
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
        unallocated.push(reservation);
      }
    });
  });

  return { allocation, unallocated };
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
  // Prevent duplicate modals
  const existingModal = document.getElementById('reservationDetailModal');
  if (existingModal) {
    existingModal.remove();
  }

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

    // Format dates for date input (YYYY-MM-DD)
    const checkInDate = reservation.check_in ? new Date(reservation.check_in).toISOString().split('T')[0] : '';
    const checkOutDate = reservation.check_out ? new Date(reservation.check_out).toISOString().split('T')[0] : '';

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
          <input type="hidden" id="originalStatus" value="${reservation.status}">
          <input type="hidden" id="originalRoomId" value="${reservation.room_id}">
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
                <input type="date" id="detailCheckIn" required value="${checkInDate}" class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm">
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">체크아웃 *</label>
                <input type="date" id="detailCheckOut" required value="${checkOutDate}" class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm">
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
                  <option value="WEBSITE" ${reservation.channel === 'WEBSITE' ? 'selected' : ''}>웹사이트</option>
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

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">결제 상태</label>
                <select id="detailPaymentStatus" class="w-full px-3 py-2 border rounded-lg">
                  <option value="UNPAID" ${!reservation.payment_status || reservation.payment_status === 'UNPAID' ? 'selected' : ''}>미결제</option>
                  <option value="PARTIAL" ${reservation.payment_status === 'PARTIAL' ? 'selected' : ''}>부분결제</option>
                  <option value="PAID" ${reservation.payment_status === 'PAID' ? 'selected' : ''}>결제완료</option>
                  <option value="REFUNDED" ${reservation.payment_status === 'REFUNDED' ? 'selected' : ''}>환불</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">결제 방법</label>
                <select id="detailPaymentMethod" class="w-full px-3 py-2 border rounded-lg">
                  <option value="" ${!reservation.payment_method ? 'selected' : ''}>선택 안함</option>
                  <option value="CASH" ${reservation.payment_method === 'CASH' ? 'selected' : ''}>현금</option>
                  <option value="CARD" ${reservation.payment_method === 'CARD' ? 'selected' : ''}>카드</option>
                  <option value="TRANSFER" ${reservation.payment_method === 'TRANSFER' ? 'selected' : ''}>계좌이체</option>
                  <option value="ONLINE" ${reservation.payment_method === 'ONLINE' ? 'selected' : ''}>온라인 결제</option>
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

  const originalStatus = document.getElementById('originalStatus').value;
  const newStatus = document.getElementById('detailStatus').value;
  const originalRoomId = document.getElementById('originalRoomId').value;
  const newRoomId = document.getElementById('detailRoomId').value;

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

  // Check-in 확인 로직
  if (newStatus === 'CHECKED_IN' && originalStatus !== 'CHECKED_IN') {
    await showCheckInConfirmation(reservationId, originalRoomId, newRoomId, {
      guestName, checkIn, checkOut, totalPrice, numberOfGuests
    });
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
        status: document.getElementById('detailStatus').value,
        payment_status: document.getElementById('detailPaymentStatus').value,
        payment_method: document.getElementById('detailPaymentMethod').value || null
      })
    });

    showToast('예약이 수정되었습니다', 'success');

    // 백그라운드에서 재고 동기화
    syncInventoryInBackground(checkIn, checkOut);

    closeReservationDetail();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Failed to update reservation:', error);
    showToast(error.message || '예약 수정 실패', 'error');
  }
}

async function showCheckInConfirmation(reservationId, originalRoomId, newRoomId, reservationData) {
  try {
    const properties = await apiCall('/properties');

    // Get room info
    let currentRoom = null;
    let roomOptions = '';

    properties.forEach(property => {
      if (property.rooms && property.rooms.length > 0) {
        property.rooms.forEach(room => {
          if (room.id === newRoomId) {
            currentRoom = { ...room, property_name: property.name };
          }
          let roomNumbersDisplay = '';
          if (room.room_numbers && room.room_numbers.length > 0) {
            roomNumbersDisplay = ` (${room.room_numbers.filter(n => n).join(', ')})`;
          }
          const roomDisplay = `${property.name} - ${room.name}${roomNumbersDisplay}`;
          roomOptions += `<option value="${room.id}">${roomDisplay}</option>`;
        });
      }
    });

    let roomDisplay = '알 수 없음';
    if (currentRoom) {
      let roomNumbersDisplay = '';
      if (currentRoom.room_numbers && currentRoom.room_numbers.length > 0) {
        roomNumbersDisplay = ` (${currentRoom.room_numbers.filter(n => n).join(', ')})`;
      }
      roomDisplay = `${currentRoom.property_name} - ${currentRoom.name}${roomNumbersDisplay}`;
    }

    const confirmModal = document.createElement('div');
    confirmModal.id = 'checkInConfirmModal';
    confirmModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmModal.innerHTML = `
      <div class="bg-white rounded-lg p-6 md:p-8 max-w-md w-full mx-4">
        <h3 class="text-lg font-bold mb-4">체크인 확인</h3>
        <p class="mb-4">배정된 객실: <strong>${roomDisplay}</strong></p>
        <p class="mb-6">고객이 이 객실에 입실하셨나요?</p>

        <div class="space-y-3">
          <button onclick="confirmCheckInSameRoom('${reservationId}', '${newRoomId}', ${JSON.stringify(reservationData).replace(/"/g, '&quot;')})"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            예, 이 객실에 입실했습니다
          </button>

          <div id="differentRoomSection" class="hidden">
            <label class="block text-sm text-gray-600 mb-2">다른 객실 선택:</label>
            <select id="differentRoomId" class="w-full px-3 py-2 border rounded-lg mb-2">
              ${roomOptions}
            </select>
            <button onclick="confirmCheckInDifferentRoom('${reservationId}', ${JSON.stringify(reservationData).replace(/"/g, '&quot;')})"
              class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              확인
            </button>
          </div>

          <button onclick="toggleDifferentRoomSection()"
            class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            아니오, 다른 객실에 입실했습니다
          </button>

          <button onclick="closeCheckInConfirm()"
            class="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
            취소
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(confirmModal);
  } catch (error) {
    console.error('Check-in confirmation error:', error);
    showToast('체크인 확인 중 오류가 발생했습니다', 'error');
  }
}

function toggleDifferentRoomSection() {
  const section = document.getElementById('differentRoomSection');
  section.classList.toggle('hidden');
}

async function confirmCheckInSameRoom(reservationId, roomId, reservationData) {
  try {
    await apiCall('/reservations/update', {
      method: 'POST',
      body: JSON.stringify({
        id: reservationId,
        room_id: roomId,
        guest_name: reservationData.guestName,
        guest_email: document.getElementById('detailGuestEmail').value || null,
        guest_phone: document.getElementById('detailGuestPhone').value || null,
        check_in: reservationData.checkIn,
        check_out: reservationData.checkOut,
        number_of_guests: parseInt(reservationData.numberOfGuests),
        total_price: parseFloat(reservationData.totalPrice),
        channel: document.getElementById('detailChannel').value,
        status: 'CHECKED_IN'
      })
    });

    showToast('체크인이 완료되었습니다', 'success');
    closeCheckInConfirm();
    closeReservationDetail();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Check-in error:', error);
    showToast(error.message || '체크인 처리 실패', 'error');
  }
}

async function confirmCheckInDifferentRoom(reservationId, reservationData) {
  const differentRoomId = document.getElementById('differentRoomId').value;

  try {
    await apiCall('/reservations/update', {
      method: 'POST',
      body: JSON.stringify({
        id: reservationId,
        room_id: differentRoomId,
        guest_name: reservationData.guestName,
        guest_email: document.getElementById('detailGuestEmail').value || null,
        guest_phone: document.getElementById('detailGuestPhone').value || null,
        check_in: reservationData.checkIn,
        check_out: reservationData.checkOut,
        number_of_guests: parseInt(reservationData.numberOfGuests),
        total_price: parseFloat(reservationData.totalPrice),
        channel: document.getElementById('detailChannel').value,
        status: 'CHECKED_IN'
      })
    });

    showToast('체크인이 완료되었습니다', 'success');
    closeCheckInConfirm();
    closeReservationDetail();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Check-in error:', error);
    showToast(error.message || '체크인 처리 실패', 'error');
  }
}

function closeCheckInConfirm() {
  const modal = document.getElementById('checkInConfirmModal');
  if (modal) {
    modal.remove();
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
                <option value="WEBSITE">웹사이트</option>
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

    // 백그라운드에서 재고 동기화
    syncInventoryInBackground(checkIn, checkOut);

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

// Unassigned reservations
let unassignedReservations = [];
let cachedProperties = null;

async function renderUnassignedReservations() {
  const container = document.getElementById('unassignedReservations');
  const list = document.getElementById('unassignedList');

  if (!container || !list) return;

  // Always show the container
  container.style.display = 'block';

  if (unassignedReservations.length === 0) {
    list.innerHTML = '<div class="text-center text-gray-500 py-4">배정되지 않은 예약이 없습니다</div>';
    return;
  }

  // Fetch properties if not cached
  if (!cachedProperties) {
    try {
      cachedProperties = await apiCall('/properties');
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  }

  list.innerHTML = unassignedReservations.map(reservation => {
    const checkIn = new Date(reservation.check_in).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    const checkOut = new Date(reservation.check_out).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

    // Find room name
    let roomName = '알 수 없음';
    let propertyName = '';
    if (cachedProperties) {
      for (const property of cachedProperties) {
        if (property.rooms) {
          const room = property.rooms.find(r => r.id === reservation.room_id);
          if (room) {
            roomName = room.name;
            propertyName = property.name;
            break;
          }
        }
      }
    }

    return `
      <div class="bg-white border-2 border-purple-400 rounded-lg p-3 cursor-move hover:shadow-lg transition-shadow unassigned-reservation"
           draggable="true"
           data-reservation-id="${reservation.id}"
           data-room-id="${reservation.room_id}"
           data-check-in="${reservation.check_in}"
           data-check-out="${reservation.check_out}"
           data-guest-name="${reservation.guest_name}"
           ondragstart="handleUnassignedDragStart(event)"
           ondragend="handleDragEnd(event)"
           onclick="showReservationDetail('${reservation.id}')">
        <div class="text-sm font-semibold text-gray-800">${reservation.guest_name}</div>
        <div class="text-xs text-gray-600">${checkIn} ~ ${checkOut}</div>
        <div class="text-xs text-blue-600 font-medium">${propertyName} - ${roomName}</div>
        <div class="text-xs text-gray-500">${getChannelName(reservation.channel)}</div>
        <div class="text-xs text-purple-600 font-bold mt-1">배정 대기</div>
      </div>
    `;
  }).join('');
}

function handleUnassignedDragStart(event) {
  const cell = event.currentTarget;
  draggedReservation = {
    id: cell.dataset.reservationId,
    roomId: cell.dataset.roomId,
    checkIn: cell.dataset.checkIn,
    checkOut: cell.dataset.checkOut,
    guestName: cell.dataset.guestName,
    isUnassigned: true
  };

  cell.style.opacity = '0.5';

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', cell.innerHTML);
  }

  event.stopPropagation();
}

function handleUnassignedDragOver(event) {
  if (event.preventDefault) {
    event.preventDefault();
  }

  const dropZone = event.currentTarget;
  dropZone.classList.add('bg-yellow-200', 'border-yellow-500');

  event.dataTransfer.dropEffect = 'move';
  return false;
}

function handleUnassignedDragLeave(event) {
  const dropZone = event.currentTarget;
  dropZone.classList.remove('bg-yellow-200', 'border-yellow-500');
}

async function handleUnassignedDrop(event) {
  if (event.stopPropagation) {
    event.stopPropagation();
  }

  event.preventDefault();

  const dropZone = event.currentTarget;
  dropZone.classList.remove('bg-yellow-200', 'border-yellow-500');

  if (!draggedReservation || draggedReservation.isUnassigned) {
    return false;
  }

  // Move reservation to unassigned
  try {
    // Get fresh reservation data
    const reservation = await apiCall(`/reservations/${draggedReservation.id}`);

    // Add to unassigned list if not already there
    if (!unassignedReservations.find(r => r.id === reservation.id)) {
      unassignedReservations.push(reservation);
    }

    renderUnassignedReservations();
    await loadRoomStatusData();

    showToast('예약이 배정 대기로 이동되었습니다', 'success');
  } catch (error) {
    console.error('Failed to move reservation to unassigned:', error);
    showToast('예약 이동 실패', 'error');
  }

  draggedReservation = null;
  return false;
}

function handleDragStart(event) {
  const cell = event.currentTarget;
  draggedReservation = {
    id: cell.dataset.reservationId,
    roomId: cell.dataset.roomId,
    checkIn: cell.dataset.checkIn,
    checkOut: cell.dataset.checkOut,
    guestName: cell.dataset.guestName,
    isUnassigned: false
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
  const newUnitNumber = parseInt(dropZone.dataset.unitNumber);
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
    newUnitNumber,
    newCheckInDate,
    newCheckOutDate.toISOString().split('T')[0]
  );

  draggedReservation = null;
}

function handleReservationDragOver(event) {
  if (event.preventDefault) {
    event.preventDefault();
  }

  if (!draggedReservation) return;

  const dropCell = event.currentTarget;
  const targetResId = dropCell.dataset.reservationId;

  // Don't allow dropping on itself
  if (draggedReservation.id === targetResId) {
    return;
  }

  dropCell.classList.add('ring-2', 'ring-purple-500');
  event.dataTransfer.dropEffect = 'move';
  return false;
}

function handleReservationDragLeave(event) {
  const dropCell = event.currentTarget;
  dropCell.classList.remove('ring-2', 'ring-purple-500');
}

async function handleReservationDrop(event) {
  if (event.stopPropagation) {
    event.stopPropagation();
  }

  event.preventDefault();

  const dropCell = event.currentTarget;
  dropCell.classList.remove('ring-2', 'ring-purple-500');

  if (!draggedReservation) {
    return false;
  }

  const targetReservation = {
    id: dropCell.dataset.reservationId,
    roomId: dropCell.dataset.roomId,
    checkIn: dropCell.dataset.checkIn,
    checkOut: dropCell.dataset.checkOut,
    guestName: dropCell.dataset.guestName
  };

  // Don't allow dropping on itself
  if (draggedReservation.id === targetReservation.id) {
    draggedReservation = null;
    return false;
  }

  // Show swap confirmation
  await showSwapConfirmation(draggedReservation, targetReservation);

  draggedReservation = null;
  return false;
}

async function showSwapConfirmation(reservation1, reservation2) {
  try {
    // Get room info
    const properties = await apiCall('/properties');
    let room1Name = '';
    let room2Name = '';

    for (const property of properties) {
      if (property.rooms) {
        const room1 = property.rooms.find(r => r.id === reservation1.roomId);
        const room2 = property.rooms.find(r => r.id === reservation2.roomId);

        if (room1) room1Name = `${property.name} - ${room1.name}`;
        if (room2) room2Name = `${property.name} - ${room2.name}`;
      }
    }

    const modal = document.createElement('div');
    modal.id = 'swapConfirmModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
        <h2 class="text-2xl font-bold mb-6">예약 교환 확인</h2>

        <div class="mb-6">
          <p class="text-lg mb-4">두 예약의 객실을 서로 바꾸시겠습니까?</p>

          <div class="bg-gray-50 p-4 rounded-lg space-y-4">
            <div class="border-b pb-3">
              <p class="text-sm text-gray-600 mb-1">예약 1</p>
              <p class="font-semibold">${reservation1.guestName}</p>
              <p class="text-sm text-blue-600">${room1Name}</p>
              <p class="text-xs text-gray-500">${new Date(reservation1.checkIn).toLocaleDateString('ko-KR')} ~ ${new Date(reservation1.checkOut).toLocaleDateString('ko-KR')}</p>
            </div>

            <div class="text-center text-2xl">⇅</div>

            <div class="border-t pt-3">
              <p class="text-sm text-gray-600 mb-1">예약 2</p>
              <p class="font-semibold">${reservation2.guestName}</p>
              <p class="text-sm text-blue-600">${room2Name}</p>
              <p class="text-xs text-gray-500">${new Date(reservation2.checkIn).toLocaleDateString('ko-KR')} ~ ${new Date(reservation2.checkOut).toLocaleDateString('ko-KR')}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3">
          <button onclick="closeSwapConfirm()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
            취소
          </button>
          <button onclick="confirmSwap('${reservation1.id}', '${reservation2.id}', '${reservation1.roomId}', '${reservation2.roomId}')"
                  class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            교환하기
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to show swap confirmation:', error);
    showToast('예약 교환 확인창을 열 수 없습니다', 'error');
  }
}

function closeSwapConfirm() {
  const modal = document.getElementById('swapConfirmModal');
  if (modal) {
    modal.remove();
  }
}

async function confirmSwap(reservation1Id, reservation2Id, room1Id, room2Id) {
  try {
    // Swap the room assignments and mark as manually placed
    await Promise.all([
      apiCall(`/reservations/update`, {
        method: 'POST',
        body: JSON.stringify({
          id: reservation1Id,
          room_id: room2Id,
          is_manually_placed: true
        })
      }),
      apiCall(`/reservations/update`, {
        method: 'POST',
        body: JSON.stringify({
          id: reservation2Id,
          room_id: room1Id,
          is_manually_placed: true
        })
      })
    ]);

    showToast('예약이 교환되었습니다 (수동 배치로 고정됨)', 'success');
    closeSwapConfirm();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Failed to swap reservations:', error);
    showToast(error.message || '예약 교환 실패', 'error');
  }
}

function handleDragEnd(event) {
  event.currentTarget.style.opacity = '1';

  // Remove any lingering visual effects
  document.querySelectorAll('.reservation-cell').forEach(cell => {
    cell.classList.remove('ring-2', 'ring-purple-500');
  });
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
  const newUnitNumber = parseInt(dropZone.dataset.unitNumber);
  const newCheckInDate = dropZone.dataset.date;

  // Calculate new checkout date (same duration)
  const oldCheckIn = new Date(draggedReservation.checkIn);
  const oldCheckOut = new Date(draggedReservation.checkOut);
  const durationDays = Math.ceil((oldCheckOut - oldCheckIn) / (1000 * 60 * 60 * 24));

  const newCheckOutDate = new Date(newCheckInDate);
  newCheckOutDate.setDate(newCheckOutDate.getDate() + durationDays);

  // If dragged from unassigned, remove from unassigned list
  if (draggedReservation.isUnassigned) {
    unassignedReservations = unassignedReservations.filter(r => r.id !== draggedReservation.id);
  }

  // Show confirmation modal
  await showMoveConfirmation(
    draggedReservation,
    newRoomId,
    newUnitNumber,
    newCheckInDate,
    newCheckOutDate.toISOString().split('T')[0]
  );

  draggedReservation = null;
  return false;
}

async function showMoveConfirmation(reservation, newRoomId, newUnitNumber, newCheckIn, newCheckOut) {
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
        if (newRoom) newRoomName = `${property.name} - ${newRoom.name} #${newUnitNumber}`;
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
          <button onclick="confirmMove('${reservation.id}', '${newRoomId}', ${newUnitNumber}, '${newCheckIn}', '${newCheckOut}')"
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

async function confirmMove(reservationId, newRoomId, newUnitNumber, newCheckIn, newCheckOut) {
  try {
    await apiCall(`/reservations/update`, {
      method: 'POST',
      body: JSON.stringify({
        id: reservationId,
        room_id: newRoomId,
        room_unit_number: newUnitNumber,
        check_in: newCheckIn,
        check_out: newCheckOut,
        is_manually_placed: true
      })
    });

    // Remove from unassigned list if it was there
    unassignedReservations = unassignedReservations.filter(r => r.id !== reservationId);

    showToast('예약이 이동되었습니다 (수동 배치로 고정됨)', 'success');
    closeMoveConfirm();
    await loadRoomStatusData();
  } catch (error) {
    console.error('Failed to move reservation:', error);
    showToast(error.message || '예약 이동 실패', 'error');
  }
}

// Helper functions
function getChannelName(channel) {
  const names = {
    'BOOKING_COM': 'Booking',
    'YANOLJA': '야놀자',
    'AIRBNB': 'Airbnb',
    'WEBSITE': '웹사이트',
    'DIRECT': '직접예약'
  };
  return names[channel] || channel;
}

function formatPrice(price, currency) {
  const amount = parseFloat(price);
  if (isNaN(amount)) return '0원';

  if (currency === 'USD') {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    // Default to KRW
    return amount.toLocaleString('ko-KR') + '원';
  }
}

router.register('room-status', loadRoomStatus);
