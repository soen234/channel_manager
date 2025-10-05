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
        <button onclick="showExcelUploadModal()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          📊 엑셀 업로드
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

    <!-- 엑셀 업로드 모달 -->
    <div id="excelUploadModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
        <h2 class="text-2xl font-bold mb-4">예약 엑셀 파일 업로드</h2>

        <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 class="font-semibold text-blue-900 mb-2">📋 지원되는 엑셀 형식</h3>
          <p class="text-sm text-blue-800 mb-2"><strong>✅ 자동 인식 지원:</strong></p>
          <ul class="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
            <li><strong>Booking.com</strong> 내보내기 파일 (체크인, 체크아웃, 투숙객, 객실 유형, 요금 등)</li>
            <li><strong>야놀자</strong> 예약목록 파일 (입실일시, 퇴실일시, 예약자, 객실타입, 판매금액 등)</li>
            <li><strong>사용자 정의</strong> 형식 (아래 컬럼명 사용)</li>
          </ul>
          <p class="text-sm text-blue-800 mb-2"><strong>사용자 정의 형식 컬럼명:</strong></p>
          <ul class="text-sm text-blue-800 list-disc list-inside space-y-1">
            <li><strong>객실명/객실</strong> (필수): 시스템에 등록된 객실명과 일치</li>
            <li><strong>게스트명/투숙객</strong> (필수)</li>
            <li><strong>체크인/입실일시</strong> (필수)</li>
            <li><strong>체크아웃/퇴실일시</strong> (필수)</li>
            <li><strong>총금액/판매금액</strong> (필수)</li>
            <li>인원수, 이메일, 전화번호, 메모 (선택)</li>
          </ul>
          <p class="text-xs text-blue-700 mt-2">💡 채널 형식을 자동으로 감지하여 처리합니다.</p>
        </div>

        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2">엑셀 파일 선택</label>
          <input type="file" id="excelFileInput" accept=".xlsx,.xls"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
          <p class="text-xs text-gray-500 mt-1">Excel 파일(.xlsx, .xls)만 업로드 가능</p>
        </div>

        <div id="uploadProgress" class="hidden mb-4">
          <div class="bg-gray-200 rounded-full h-4 overflow-hidden">
            <div id="uploadProgressBar" class="bg-purple-600 h-full transition-all duration-300" style="width: 0%"></div>
          </div>
          <p id="uploadStatus" class="text-sm text-gray-600 mt-2 text-center"></p>
        </div>

        <div class="flex justify-end space-x-3">
          <button type="button" onclick="closeExcelUploadModal()"
            class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
            취소
          </button>
          <button type="button" onclick="uploadExcelFile()"
            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            업로드
          </button>
        </div>
      </div>
    </div>
  `;

  // Wait for DOM elements to be ready
  try {
    await waitForElement('reservationsList');
    await loadReservationsList();
  } catch (error) {
    console.error('Failed to initialize reservations:', error);
  }
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

function showExcelUploadModal() {
  document.getElementById('excelUploadModal').classList.remove('hidden');
  document.getElementById('excelFileInput').value = '';
  document.getElementById('uploadProgress').classList.add('hidden');
}

function closeExcelUploadModal() {
  document.getElementById('excelUploadModal').classList.add('hidden');
}

async function uploadExcelFile() {
  const fileInput = document.getElementById('excelFileInput');
  const file = fileInput.files[0];

  if (!file) {
    showToast('파일을 선택해주세요.', 'error');
    return;
  }

  if (!file.name.match(/\.(xlsx|xls)$/)) {
    showToast('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.', 'error');
    return;
  }

  const progressDiv = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('uploadProgressBar');
  const statusText = document.getElementById('uploadStatus');

  progressDiv.classList.remove('hidden');
  progressBar.style.width = '0%';
  statusText.textContent = '파일 읽는 중...';

  try {
    // Load SheetJS library if not already loaded
    if (typeof XLSX === 'undefined') {
      statusText.textContent = 'SheetJS 라이브러리 로딩 중...';
      await loadSheetJS();
    }

    progressBar.style.width = '20%';
    statusText.textContent = '엑셀 파일 파싱 중...';

    const data = await readExcelFile(file);

    progressBar.style.width = '40%';
    statusText.textContent = `${data.length}개의 예약 데이터 발견. 검증 중...`;

    // Validate and transform data
    const reservations = await validateAndTransformReservations(data);

    progressBar.style.width = '60%';
    statusText.textContent = `${reservations.length}개의 유효한 예약. 서버에 업로드 중...`;

    // Upload to server
    const result = await apiCall('/reservations/bulk', {
      method: 'POST',
      body: JSON.stringify({ reservations })
    });

    progressBar.style.width = '100%';
    statusText.textContent = '완료!';

    showToast(`성공: ${result.created}건 생성, ${result.updated}건 업데이트, ${result.errors}건 오류`);

    setTimeout(() => {
      closeExcelUploadModal();
      loadReservationsList();
    }, 1500);

  } catch (error) {
    console.error('Excel upload error:', error);
    showToast(`업로드 실패: ${error.message}`, 'error');
    progressDiv.classList.add('hidden');
  }
}

function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (typeof XLSX !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('SheetJS 라이브러리 로딩 실패'));
    document.head.appendChild(script);
  });
}

function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // Debug: Log first row column names
        if (jsonData.length > 0) {
          console.log('엑셀 파일의 컬럼명:', Object.keys(jsonData[0]));
          console.log('첫 번째 행 데이터:', jsonData[0]);
        }

        resolve(jsonData);
      } catch (error) {
        reject(new Error('엑셀 파일 파싱 실패: ' + error.message));
      }
    };

    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

async function validateAndTransformReservations(data) {
  const properties = await apiCall('/properties');

  // Create room name to ID mapping (including variations)
  const roomMap = {};
  properties.forEach(property => {
    if (property.rooms) {
      property.rooms.forEach(room => {
        roomMap[room.name] = room.id;
        // Also map without spaces for fuzzy matching
        roomMap[room.name.replace(/\s+/g, '')] = room.id;
      });
    }
  });

  const validReservations = [];
  const errors = [];
  const missingRooms = new Set();

  data.forEach((row, index) => {
    try {
      // Detect channel format and extract data
      const extracted = extractReservationData(row);

      if (!extracted.roomName || !extracted.guestName || !extracted.checkIn || !extracted.checkOut || !extracted.totalPrice) {
        errors.push(`행 ${index + 2}: 필수 항목 누락 (객실명, 게스트명, 체크인, 체크아웃, 총금액)`);
        return;
      }

      // Find room ID (try exact match first, then without spaces)
      let roomId = roomMap[extracted.roomName];
      if (!roomId) {
        roomId = roomMap[extracted.roomName.replace(/\s+/g, '')];
      }

      if (!roomId) {
        missingRooms.add(extracted.roomName);
        errors.push(`행 ${index + 2}: 객실 '${extracted.roomName}'을 찾을 수 없습니다`);
        return;
      }

      // Parse dates
      let checkInDate, checkOutDate;
      try {
        checkInDate = parseExcelDate(extracted.checkIn);
        checkOutDate = parseExcelDate(extracted.checkOut);
      } catch (e) {
        errors.push(`행 ${index + 2}: 날짜 형식 오류 (${e.message})`);
        return;
      }

      validReservations.push({
        room_id: roomId,
        guest_name: extracted.guestName,
        guest_email: extracted.email,
        guest_phone: extracted.phone,
        check_in: checkInDate,
        check_out: checkOutDate,
        num_guests: extracted.numGuests,
        total_price: extracted.totalPrice,
        channel: extracted.channel,
        notes: extracted.notes,
        status: extracted.status
      });
    } catch (error) {
      errors.push(`행 ${index + 2}: ${error.message}`);
    }
  });

  // If there are missing rooms, offer to create them
  if (missingRooms.size > 0) {
    const shouldCreate = await showMissingRoomsDialog(Array.from(missingRooms), properties);
    if (shouldCreate) {
      // User cancelled or error occurred
      throw new Error('객실 생성이 필요합니다.');
    }
    // If rooms were created, throw error to retry upload
    throw new Error('객실이 생성되었습니다. 다시 업로드해주세요.');
  }

  if (errors.length > 0) {
    console.warn('Validation errors:', errors);
    if (validReservations.length === 0) {
      throw new Error('유효한 예약 데이터가 없습니다.\n' + errors.slice(0, 5).join('\n'));
    }
  }

  return validReservations;
}

function extractReservationData(row) {
  // Booking.com format detection
  if (row['예약 번호'] || row['Booker country']) {
    return {
      roomName: row['객실 유형'] || row['객실타입'] || row['객실명'] || '',
      guestName: row['투숙객'] || row['예약자'] || '',
      checkIn: row['체크인'] || '',
      checkOut: row['체크아웃'] || '',
      totalPrice: parsePriceString(row['요금'] || row['판매금액'] || '0'),
      email: '',
      phone: String(row['전화번호'] || ''),
      numGuests: parseInt(row['인원'] || row['성인'] || '1'),
      channel: 'BOOKING_COM',
      notes: `예약번호: ${row['예약 번호'] || ''}`,
      status: mapStatus(row['예약 상태'] || 'CONFIRMED')
    };
  }

  // Yanolja format detection
  if (row['NOL 숙소 예약번호'] || row['입실일시'] || row['퇴실일시']) {
    // Parse datetime format "2025-09-21 15:00" to "2025-09-21"
    const checkInDate = row['입실일시'] ? row['입실일시'].split(' ')[0] : '';
    const checkOutDate = row['퇴실일시'] ? row['퇴실일시'].split(' ')[0] : '';

    return {
      roomName: row['객실타입'] || row['객실 유형'] || row['객실명'] || '',
      guestName: row['예약자'] || '',
      checkIn: checkInDate || row['체크인'] || '',
      checkOut: checkOutDate || row['체크아웃'] || '',
      totalPrice: parsePriceString(row['판매금액'] || row['입금예정가'] || '0'),
      email: '',
      phone: String(row['050안심번호'] || '').replace(/^82/, '0'),
      numGuests: parseInt(String(row['이용시간'] || '1박').match(/\d+/)?.[0] || '1'),
      channel: detectChannel(row),
      notes: row['외부 판매채널 예약번호'] || '',
      status: mapStatus(row['예약상태'] || 'CONFIRMED')
    };
  }

  // Generic format (user's custom format)
  return {
    roomName: row['객실명'] || row['객실'] || row['room'] || '',
    guestName: row['게스트명'] || row['투숙객'] || row['guest_name'] || '',
    checkIn: row['체크인'] || row['checkin'] || row['check_in'] || '',
    checkOut: row['체크아웃'] || row['checkout'] || row['check_out'] || '',
    totalPrice: parsePriceString(row['총금액'] || row['금액'] || row['price'] || '0'),
    email: row['이메일'] || row['email'] || '',
    phone: row['전화번호'] || row['phone'] || '',
    numGuests: parseInt(row['인원수'] || row['인원'] || row['guests'] || '1'),
    channel: row['채널'] || row['channel'] || 'DIRECT',
    notes: row['메모'] || row['notes'] || '',
    status: 'CONFIRMED'
  };
}

function parsePriceString(priceStr) {
  if (typeof priceStr === 'number') return priceStr;

  // Remove all non-numeric characters except decimal point
  const cleaned = String(priceStr).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function detectChannel(row) {
  const externalBooking = row['외부 판매채널 예약번호'] || '';

  if (externalBooking.includes('아고다') || externalBooking.toLowerCase().includes('agoda')) {
    return 'BOOKING_COM'; // Agoda uses Booking.com system
  }
  if (externalBooking.includes('씨트립') || externalBooking.toLowerCase().includes('ctrip')) {
    return 'BOOKING_COM';
  }
  if (row['NOL 숙소 예약번호'] || row['입실일시']) {
    return 'YANOLJA';
  }
  if (row['예약 번호'] || row['Booker country']) {
    return 'BOOKING_COM';
  }

  return 'DIRECT';
}

function mapStatus(statusStr) {
  const status = String(statusStr).toLowerCase().trim();

  // Cancelled statuses
  if (status.includes('취소') || status.includes('cancel') || status.includes('cancelled_by')) {
    return 'CANCELLED';
  }

  // Confirmed statuses
  if (status.includes('ok') || status.includes('완료') || status.includes('확정') || status.includes('예약')) {
    return 'CONFIRMED';
  }

  if (status.includes('체크인') || (status.includes('check') && status.includes('in'))) {
    return 'CHECKED_IN';
  }
  if (status.includes('체크아웃') || (status.includes('check') && status.includes('out'))) {
    return 'CHECKED_OUT';
  }
  if (status.includes('노쇼') || (status.includes('no') && status.includes('show'))) {
    return 'NO_SHOW';
  }

  return 'CONFIRMED';
}

function parseExcelDate(value) {
  // Handle Excel serial date numbers
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  // Handle string dates
  if (typeof value === 'string') {
    // Remove leading/trailing whitespace
    value = value.trim();

    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Try YYYY-MM-DD HH:MM format (Yanolja format)
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(value)) {
      return value.split(' ')[0];
    }

    // Try parsing as date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  throw new Error('잘못된 날짜 형식');
}

async function showMissingRoomsDialog(missingRoomNames, properties) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-4 text-gray-800">누락된 객실 발견</h2>
        <p class="text-gray-600 mb-4">엑셀 파일에서 다음 객실들을 찾을 수 없습니다. 자동으로 생성하시겠습니까?</p>

        <div class="mb-6">
          <div class="space-y-3">
            ${missingRoomNames.map(roomName => `
              <div class="border rounded-lg p-4 bg-gray-50">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">객실명</label>
                    <input type="text" value="${roomName}" readonly class="w-full px-3 py-2 border rounded bg-white text-gray-800">
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">숙소 선택</label>
                    <select class="property-select w-full px-3 py-2 border rounded" data-room-name="${roomName}">
                      ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">기본 요금 (원)</label>
                    <input type="number" class="base-price w-full px-3 py-2 border rounded" value="50000" min="0" step="1000" data-room-name="${roomName}">
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">수용인원</label>
                    <input type="number" class="capacity w-full px-3 py-2 border rounded" value="2" min="1" max="10" data-room-name="${roomName}">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex justify-end space-x-3">
          <button id="cancelMissingRooms" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
            취소
          </button>
          <button id="createMissingRooms" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            객실 생성 (${missingRoomNames.length}개)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('cancelMissingRooms').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true); // User cancelled
    });

    document.getElementById('createMissingRooms').addEventListener('click', async () => {
      try {
        const createButton = document.getElementById('createMissingRooms');
        createButton.disabled = true;
        createButton.textContent = '생성 중...';

        // Collect all room data
        const roomsToCreate = missingRoomNames.map(roomName => {
          const propertyId = modal.querySelector(`.property-select[data-room-name="${roomName}"]`).value;
          const basePrice = parseFloat(modal.querySelector(`.base-price[data-room-name="${roomName}"]`).value);
          const capacity = parseInt(modal.querySelector(`.capacity[data-room-name="${roomName}"]`).value);

          return {
            propertyId,
            roomName,
            basePrice,
            capacity
          };
        });

        // Create rooms one by one
        for (const room of roomsToCreate) {
          await apiCall(`/properties?propertyId=${room.propertyId}`, {
            method: 'POST',
            body: JSON.stringify({
              name: room.roomName,
              type: room.roomName,
              totalRooms: 1,
              capacity: room.capacity,
              basePrice: room.basePrice
            })
          });
        }

        showToast(`${roomsToCreate.length}개의 객실이 생성되었습니다.`, 'success');
        document.body.removeChild(modal);
        resolve(false); // Rooms created successfully
      } catch (error) {
        showToast('객실 생성 중 오류가 발생했습니다: ' + error.message, 'error');
        document.body.removeChild(modal);
        resolve(true); // Error occurred
      }
    });
  });
}

router.register('reservations', loadReservations);
