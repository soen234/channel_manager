// 예약 관리 페이지
async function loadReservations() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-4 md:mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">예약 관리</h1>
      <p class="text-sm md:text-base text-gray-600">전 채널의 예약을 통합 관리합니다</p>
    </div>

    <!-- 필터 -->
    <div class="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <!-- 채널 필터 -->
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-3">채널</label>
          <div class="space-y-2" id="channelFilters">
            <label class="flex items-center"><input type="checkbox" value="BOOKING_COM" class="mr-2" onchange="applyFilters()"> Booking.com</label>
            <label class="flex items-center"><input type="checkbox" value="YANOLJA" class="mr-2" onchange="applyFilters()"> 야놀자</label>
            <label class="flex items-center"><input type="checkbox" value="AIRBNB" class="mr-2" onchange="applyFilters()"> Airbnb</label>
            <label class="flex items-center"><input type="checkbox" value="DIRECT" class="mr-2" onchange="applyFilters()"> 직접 예약</label>
          </div>
        </div>

        <!-- 숙소/객실 필터 -->
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-3">숙소/객실</label>
          <div class="space-y-2 max-h-40 overflow-y-auto" id="propertyFilters">
            <div class="text-sm text-gray-500">로딩중...</div>
          </div>
        </div>

        <!-- 상태 필터 -->
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-3">상태</label>
          <div class="space-y-2" id="statusFilters">
            <label class="flex items-center"><input type="checkbox" value="CONFIRMED" class="mr-2" onchange="applyFilters()"> 확정</label>
            <label class="flex items-center"><input type="checkbox" value="CHECKED_IN" class="mr-2" onchange="applyFilters()"> 체크인</label>
            <label class="flex items-center"><input type="checkbox" value="CHECKED_OUT" class="mr-2" onchange="applyFilters()"> 체크아웃</label>
            <label class="flex items-center"><input type="checkbox" value="CANCELLED" class="mr-2" onchange="applyFilters()"> 취소</label>
            <label class="flex items-center"><input type="checkbox" value="NO_SHOW" class="mr-2" onchange="applyFilters()"> 노쇼</label>
          </div>
        </div>
      </div>

      <!-- 날짜 및 가격 필터 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">체크인 시작</label>
          <input type="date" id="filterCheckInStart" onchange="applyFilters()"
            class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm">
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">체크인 종료</label>
          <input type="date" id="filterCheckInEnd" onchange="applyFilters()"
            class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm">
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">최소 가격</label>
          <input type="number" id="filterPriceMin" placeholder="0" onchange="applyFilters()"
            class="w-full px-3 py-2 border rounded-lg text-sm">
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">최대 가격</label>
          <input type="number" id="filterPriceMax" placeholder="1000000" onchange="applyFilters()"
            class="w-full px-3 py-2 border rounded-lg text-sm">
        </div>
      </div>

      <div class="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <button onclick="resetFilters()" class="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm md:text-base">
          필터 초기화
        </button>
        <div class="flex flex-wrap gap-2">
          <button onclick="showCreateReservationModal()" class="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base whitespace-nowrap">
            + 예약 생성
          </button>
          <button onclick="showExcelUploadModal()" class="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm md:text-base whitespace-nowrap">
            📊 엑셀 업로드
          </button>
          <button onclick="syncReservations()" class="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm md:text-base whitespace-nowrap">
            예약 동기화
          </button>
        </div>
      </div>
    </div>

    <!-- 예약 목록 -->
    <div class="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">예약 목록</h2>
        <div id="reservationsCount" class="text-sm text-gray-500"></div>
      </div>
      <div id="reservationsList" class="overflow-x-auto">
        <div class="text-center py-8 text-gray-500">로딩중...</div>
      </div>
      <!-- 페이지네이션 -->
      <div id="pagination" class="mt-6 flex justify-center items-center space-x-2"></div>
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
          <button type="button" id="cancelUploadButton" onclick="closeExcelUploadModal()"
            class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
            취소
          </button>
          <button type="button" id="uploadButton" onclick="uploadExcelFile()"
            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
            업로드
          </button>
        </div>
      </div>
    </div>

    <!-- 예약 수정 모달 -->
    <div id="editReservationModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-6">예약 수정</h2>
        <form id="editReservationForm" onsubmit="saveReservation(event)">
          <input type="hidden" id="editReservationId">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">객실 *</label>
              <select id="editRoomId" required class="w-full px-3 py-2 border rounded-lg">
                <option value="">객실 선택</option>
              </select>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">채널</label>
              <select id="editChannel" class="w-full px-3 py-2 border rounded-lg">
                <option value="DIRECT">직접 예약</option>
                <option value="BOOKING_COM">Booking.com</option>
                <option value="YANOLJA">야놀자</option>
                <option value="AIRBNB">Airbnb</option>
              </select>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">투숙객명 *</label>
              <input type="text" id="editGuestName" required class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">이메일</label>
              <input type="email" id="editGuestEmail" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">전화번호</label>
              <input type="tel" id="editGuestPhone" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">인원 *</label>
              <input type="number" id="editNumberOfGuests" required min="1" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">체크인 *</label>
              <input type="date" id="editCheckIn" required class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">체크아웃 *</label>
              <input type="date" id="editCheckOut" required class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">총 금액 *</label>
              <input type="number" id="editTotalPrice" required min="0" step="1000" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">상태</label>
              <select id="editStatus" class="w-full px-3 py-2 border rounded-lg">
                <option value="CONFIRMED">확정</option>
                <option value="CHECKED_IN">체크인</option>
                <option value="CHECKED_OUT">체크아웃</option>
                <option value="CANCELLED">취소</option>
                <option value="NO_SHOW">노쇼</option>
              </select>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">결제 상태</label>
              <select id="editPaymentStatus" class="w-full px-3 py-2 border rounded-lg">
                <option value="UNPAID">미결제</option>
                <option value="PAID">결제완료</option>
                <option value="PARTIAL">부분결제</option>
                <option value="REFUNDED">환불</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" onclick="closeEditReservationModal()"
              class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
              취소
            </button>
            <button type="submit"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 예약 생성 모달 -->
    <div id="createReservationModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-6">예약 생성</h2>
        <form id="createReservationForm" onsubmit="createReservation(event)">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">객실 *</label>
              <select id="createRoomId" required class="w-full px-3 py-2 border rounded-lg">
                <option value="">객실 선택</option>
              </select>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">채널 *</label>
              <select id="createChannel" required class="w-full px-3 py-2 border rounded-lg">
                <option value="DIRECT">직접 예약</option>
                <option value="BOOKING_COM">Booking.com</option>
                <option value="YANOLJA">야놀자</option>
                <option value="AIRBNB">Airbnb</option>
              </select>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">투숙객명 *</label>
              <input type="text" id="createGuestName" required class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">이메일</label>
              <input type="email" id="createGuestEmail" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">전화번호</label>
              <input type="tel" id="createGuestPhone" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">투숙 인원 *</label>
              <input type="number" id="createNumberOfGuests" required min="1" value="2" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">체크인 *</label>
              <input type="date" id="createCheckIn" required class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">체크아웃 *</label>
              <input type="date" id="createCheckOut" required class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">총 금액 *</label>
              <input type="number" id="createTotalPrice" required step="0.01" class="w-full px-3 py-2 border rounded-lg">
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">상태 *</label>
              <select id="createStatus" required class="w-full px-3 py-2 border rounded-lg">
                <option value="CONFIRMED">확정</option>
                <option value="CHECKED_IN">체크인</option>
                <option value="CHECKED_OUT">체크아웃</option>
                <option value="CANCELLED">취소</option>
                <option value="NO_SHOW">노쇼</option>
              </select>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">결제 상태 *</label>
              <select id="createPaymentStatus" required class="w-full px-3 py-2 border rounded-lg">
                <option value="UNPAID">미결제</option>
                <option value="PAID">결제완료</option>
                <option value="PARTIAL">부분결제</option>
                <option value="REFUNDED">환불</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" onclick="closeCreateReservationModal()"
              class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
              취소
            </button>
            <button type="submit"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Wait for DOM elements to be ready
  await new Promise(resolve => setTimeout(resolve, 100));
  await loadPropertyFilters();
  await loadReservationsList();
}

// Pagination state
let currentPage = 1;
const itemsPerPage = 50;
let allReservations = [];
let filteredReservations = [];

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
    allReservations = await apiCall(url);
    currentPage = 1;
    renderReservationsList();
  } catch (error) {
    console.error('Failed to load reservations:', error);
  }
}

function goToPage(page) {
  currentPage = page;
  renderReservationsList();
}

function renderReservationsList() {
  const container = document.getElementById('reservationsList');
  const countEl = document.getElementById('reservationsCount');
  const paginationEl = document.getElementById('pagination');

  if (!container) {
    console.error('reservationsList element not found');
    return;
  }

  // Use filteredReservations if filters are applied, otherwise use allReservations
  const dataToDisplay = filteredReservations.length > 0 || hasActiveFilters() ? filteredReservations : allReservations;

  const totalItems = dataToDisplay.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageReservations = dataToDisplay.slice(startIndex, endIndex);

  // Update count display
  if (countEl) {
    countEl.textContent = `총 ${totalItems}건 (${startIndex + 1}-${endIndex}건 표시)`;
  }

  if (totalItems === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">예약이 없습니다</h3>
        <p class="mt-1 text-sm text-gray-500">필터 조건을 변경하거나 예약 동기화를 실행하세요.</p>
      </div>
    `;
    if (paginationEl) {
      paginationEl.innerHTML = '';
    }
    return;
  }

  container.innerHTML = `
    <table class="min-w-full">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">채널</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 min-w-[140px]">숙소/객실</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">고객 정보</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">체크인</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">체크아웃</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">인원</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">금액</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">상태</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">결제</th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        ${pageReservations.map(res => {
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
              <td class="px-4 py-3 min-w-[140px]">
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
                <select onchange="updateReservationPaymentStatus('${res.id}', this.value)"
                  class="px-2 py-1 text-xs rounded border ${getPaymentStatusColorForSelect(res.payment_status)}">
                  <option value="UNPAID" ${(res.payment_status === 'UNPAID' || !res.payment_status) ? 'selected' : ''}>미결제</option>
                  <option value="PAID" ${res.payment_status === 'PAID' ? 'selected' : ''}>결제완료</option>
                  <option value="PARTIAL" ${res.payment_status === 'PARTIAL' ? 'selected' : ''}>부분결제</option>
                  <option value="REFUNDED" ${res.payment_status === 'REFUNDED' ? 'selected' : ''}>환불</option>
                </select>
              </td>
              <td class="px-4 py-3 text-center">
                <button onclick="editReservation('${res.id}')"
                  class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                  수정
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Render pagination
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const paginationEl = document.getElementById('pagination');

  if (!paginationEl || totalPages <= 1) {
    if (paginationEl) {
      paginationEl.innerHTML = '';
    }
    return;
  }

  const maxVisiblePages = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust start if we're near the end
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pages = [];

  // Previous button
  pages.push(`
    <button onclick="goToPage(${currentPage - 1})"
      ${currentPage === 1 ? 'disabled' : ''}
      class="px-3 py-2 rounded-lg border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}">
      ‹
    </button>
  `);

  // First page + ellipsis
  if (startPage > 1) {
    pages.push(`
      <button onclick="goToPage(1)"
        class="px-4 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50">
        1
      </button>
    `);
    if (startPage > 2) {
      pages.push(`<span class="px-2 py-2 text-gray-500">...</span>`);
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    pages.push(`
      <button onclick="goToPage(${i})"
        class="px-4 py-2 rounded-lg border ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}">
        ${i}
      </button>
    `);
  }

  // Ellipsis + last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push(`<span class="px-2 py-2 text-gray-500">...</span>`);
    }
    pages.push(`
      <button onclick="goToPage(${totalPages})"
        class="px-4 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50">
        ${totalPages}
      </button>
    `);
  }

  // Next button
  pages.push(`
    <button onclick="goToPage(${currentPage + 1})"
      ${currentPage === totalPages ? 'disabled' : ''}
      class="px-3 py-2 rounded-lg border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}">
      ›
    </button>
  `);

  paginationEl.innerHTML = pages.join('');
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

function getPaymentStatusColorForSelect(paymentStatus) {
  const colors = {
    'PAID': 'bg-green-50 text-green-800 border-green-200',
    'PARTIAL': 'bg-blue-50 text-blue-800 border-blue-200',
    'UNPAID': 'bg-yellow-50 text-yellow-800 border-yellow-200',
    'REFUNDED': 'bg-purple-50 text-purple-800 border-purple-200'
  };
  return colors[paymentStatus] || 'bg-yellow-50 text-yellow-800 border-yellow-200';
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
  try {
    await apiCall('/reservations/update', {
      method: 'POST',
      body: JSON.stringify({
        id: id,
        status: status
      })
    });

    showToast('예약 상태가 업데이트되었습니다', 'success');
    await loadReservations();
  } catch (error) {
    console.error('Failed to update reservation status:', error);
    showToast(error.message || '예약 상태 업데이트 실패', 'error');
  }
}

async function updateReservationPaymentStatus(id, paymentStatus) {
  try {
    await apiCall('/reservations/update', {
      method: 'POST',
      body: JSON.stringify({
        id: id,
        payment_status: paymentStatus
      })
    });

    showToast('결제 상태가 업데이트되었습니다', 'success');
    await loadReservations();
  } catch (error) {
    console.error('Failed to update payment status:', error);
    showToast(error.message || '결제 상태 업데이트 실패', 'error');
  }
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
  const uploadButton = document.getElementById('uploadButton');
  const cancelButton = document.getElementById('cancelUploadButton');

  // Disable buttons during upload
  uploadButton.disabled = true;
  uploadButton.textContent = '업로드 중...';
  cancelButton.disabled = true;

  progressDiv.classList.remove('hidden');
  progressBar.style.width = '0%';
  statusText.textContent = '파일 읽는 중...';

  try {
    // Load SheetJS library if not already loaded
    if (typeof XLSX === 'undefined') {
      statusText.textContent = 'SheetJS 라이브러리 로딩 중...';
      await loadSheetJS();
    }

    progressBar.style.width = '10%';
    statusText.textContent = '엑셀 파일 파싱 중...';

    const data = await readExcelFile(file);

    progressBar.style.width = '20%';
    statusText.textContent = `${data.length}개의 예약 데이터 발견. 검증 중...`;

    // Validate and transform data
    const reservations = await validateAndTransformReservations(data);

    const totalCount = reservations.length;
    progressBar.style.width = '30%';
    statusText.textContent = `${totalCount}개의 유효한 예약 확인됨. 업로드 시작...`;

    // Upload in batches for better progress tracking
    const BATCH_SIZE = 20;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const allErrorDetails = [];

    for (let i = 0; i < reservations.length; i += BATCH_SIZE) {
      const batch = reservations.slice(i, Math.min(i + BATCH_SIZE, reservations.length));
      const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(reservations.length / BATCH_SIZE);

      // Update progress
      const uploadedCount = i;
      const progress = 30 + ((uploadedCount / totalCount) * 60);
      progressBar.style.width = `${progress}%`;
      statusText.innerHTML = `
        <div>업로드 중: ${uploadedCount}/${totalCount} (배치 ${currentBatch}/${totalBatches})</div>
        <div class="text-sm text-gray-600 mt-1">생성: ${totalCreated}, 업데이트: ${totalUpdated}, 건너뜀: ${totalSkipped}, 오류: ${totalErrors}</div>
      `;

      try {
        const result = await apiCall('/reservations/bulk', {
          method: 'POST',
          body: JSON.stringify({ reservations: batch })
        });

        totalCreated += result.created || 0;
        totalUpdated += result.updated || 0;
        totalSkipped += result.skipped || 0;
        totalErrors += result.errors || 0;

        if (result.errorDetails && result.errorDetails.length > 0) {
          allErrorDetails.push(...result.errorDetails);
        }

        // Small delay between batches to avoid overwhelming the server
        if (i + BATCH_SIZE < reservations.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('Batch upload error:', error);
        totalErrors += batch.length;
        allErrorDetails.push({
          batch: currentBatch,
          error: error.message
        });
      }
    }

    progressBar.style.width = '100%';
    statusText.innerHTML = `
      <div class="font-bold text-green-600">완료!</div>
      <div class="text-sm mt-1">생성: ${totalCreated}, 업데이트: ${totalUpdated}, 건너뜀: ${totalSkipped}, 오류: ${totalErrors}</div>
    `;

    let message = `업로드 완료! 생성: ${totalCreated}건, 업데이트: ${totalUpdated}건`;
    if (totalSkipped > 0) {
      message += `, 건너뜀: ${totalSkipped}건`;
    }
    if (totalErrors > 0) {
      message += `, 오류: ${totalErrors}건`;
    }
    showToast(message, totalErrors > 0 ? 'warning' : 'success');

    // Show error details if any
    if (allErrorDetails.length > 0 && allErrorDetails.length <= 10) {
      console.error('Upload errors:', allErrorDetails);
    }

    setTimeout(() => {
      closeExcelUploadModal();
      loadReservationsList();

      // Re-enable buttons
      uploadButton.disabled = false;
      uploadButton.textContent = '업로드';
      cancelButton.disabled = false;
    }, 2000);

  } catch (error) {
    console.error('Excel upload error:', error);
    showToast(`업로드 실패: ${error.message}`, 'error');
    progressBar.style.width = '0%';
    statusText.textContent = '업로드 실패';

    // Re-enable buttons on error
    uploadButton.disabled = false;
    uploadButton.textContent = '업로드';
    cancelButton.disabled = false;
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

  // Create room name to ID mapping and room type mapping
  const roomMap = {};
  const roomTypeMap = {}; // Maps room type to first room of that type

  properties.forEach(property => {
    if (property.rooms) {
      property.rooms.forEach(room => {
        roomMap[room.name] = room.id;
        // Also map without spaces for fuzzy matching
        roomMap[room.name.replace(/\s+/g, '')] = room.id;

        // Map room type to room ID (for multiple rooms of same type)
        const roomType = room.type || room.name;
        if (!roomTypeMap[roomType]) {
          roomTypeMap[roomType] = room.id;
        }
        roomTypeMap[roomType.replace(/\s+/g, '')] = room.id;
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

      // Parse dates
      let checkInDate, checkOutDate;
      try {
        checkInDate = parseExcelDate(extracted.checkIn);
        checkOutDate = parseExcelDate(extracted.checkOut);
      } catch (e) {
        errors.push(`행 ${index + 2}: 날짜 형식 오류 (${e.message})`);
        return;
      }

      // Handle comma-separated room names (multiple rooms)
      const roomNames = extracted.roomName.split(',').map(r => r.trim()).filter(r => r);

      if (roomNames.length > 1) {
        // Multiple rooms - create separate reservation for each
        console.log(`행 ${index + 2}: 여러 객실 예약 감지 (${roomNames.length}개)`);

        roomNames.forEach((roomName, roomIndex) => {
          // Find room ID (try exact match first, then without spaces, then by type)
          let roomId = roomMap[roomName];
          if (!roomId) {
            roomId = roomMap[roomName.replace(/\s+/g, '')];
          }
          if (!roomId) {
            roomId = roomTypeMap[roomName] || roomTypeMap[roomName.replace(/\s+/g, '')];
          }

          if (!roomId) {
            missingRooms.add(roomName);
            errors.push(`행 ${index + 2}: 객실 '${roomName}'을 찾을 수 없습니다`);
          }

          // Create reservation (with or without room_id)
          validReservations.push({
            room_id: roomId,
            _originalRoomName: roomName, // Store for later room creation
            guest_name: extracted.guestName,
            guest_email: extracted.email,
            guest_phone: extracted.phone,
            guest_country: extracted.country,
            check_in: checkInDate,
            check_out: checkOutDate,
            num_guests: Math.ceil(extracted.numGuests / roomNames.length), // Distribute guests
            total_price: extracted.totalPrice / roomNames.length, // Split price
            channel: extracted.channel,
            payment_status: extracted.paymentStatus,
            notes: `${extracted.notes}${roomNames.length > 1 ? ` (${roomIndex + 1}/${roomNames.length} 객실)` : ''}`,
            status: extracted.status
          });
        });
      } else {
        // Single room
        const roomName = roomNames[0];

        // Find room ID (try exact match first, then without spaces, then by type)
        let roomId = roomMap[roomName];
        if (!roomId) {
          roomId = roomMap[roomName.replace(/\s+/g, '')];
        }
        if (!roomId) {
          roomId = roomTypeMap[roomName] || roomTypeMap[roomName.replace(/\s+/g, '')];
        }

        if (!roomId) {
          missingRooms.add(roomName);
          errors.push(`행 ${index + 2}: 객실 '${roomName}'을 찾을 수 없습니다`);
        }

        validReservations.push({
          room_id: roomId,
          _originalRoomName: roomName, // Store for later room creation
          guest_name: extracted.guestName,
          guest_email: extracted.email,
          guest_phone: extracted.phone,
          guest_country: extracted.country,
          check_in: checkInDate,
          check_out: checkOutDate,
          num_guests: extracted.numGuests,
          total_price: extracted.totalPrice,
          channel: extracted.channel,
          payment_status: extracted.paymentStatus,
          notes: extracted.notes,
          status: extracted.status
        });
      }
    } catch (error) {
      errors.push(`행 ${index + 2}: ${error.message}`);
    }
  });

  // If there are missing rooms, offer to map or create them
  if (missingRooms.size > 0) {
    const result = await showMissingRoomsDialog(Array.from(missingRooms), properties);

    if (result.skip) {
      // User chose to skip - filter out reservations with missing rooms
      const filteredReservations = validReservations.filter(res => {
        // Keep only reservations that have valid room_id
        return res.room_id !== undefined && res.room_id !== null;
      });

      const skippedCount = validReservations.length - filteredReservations.length + errors.filter(e => e.includes('객실')).length;

      if (filteredReservations.length === 0) {
        throw new Error(`모든 예약 내역이 누락된 객실을 참조합니다. ${skippedCount}개 건을 건너뛰었습니다.`);
      }

      console.log(`${skippedCount}개 예약 건너뜀 (누락된 객실)`);
      showToast(`${skippedCount}개 예약이 누락된 객실로 인해 제외됩니다.`, 'warning');

      return filteredReservations;
    } else if (result.mappings) {
      // User provided mappings (either to existing rooms or newly created ones)
      const mappings = result.mappings;

      // Apply mappings to reservations
      validReservations.forEach(res => {
        if (!res.room_id && res._originalRoomName) {
          const mappedRoomId = mappings[res._originalRoomName];
          if (mappedRoomId) {
            res.room_id = mappedRoomId;
          }
        }
      });

      // Check if any reservations still don't have room_id
      const stillMissing = validReservations.filter(res => !res.room_id);
      if (stillMissing.length > 0) {
        const missingRoomNames = [...new Set(stillMissing.map(res => res._originalRoomName))];
        throw new Error(`일부 객실 매핑에 실패했습니다: ${missingRoomNames.join(', ')}`);
      }

      const mappedCount = Object.keys(mappings).length;
      showToast(`${mappedCount}개 객실이 매핑되었습니다. 업로드를 계속 진행합니다.`, 'success');
      return validReservations;
    }
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
      country: row['Booker country'] || row['국가'] || '',
      notes: `예약번호: ${row['예약 번호'] || ''}`,
      status: mapStatus(row['예약 상태'] || 'CONFIRMED'),
      paymentStatus: mapPaymentStatus(row['결제상태'] || row['결제 상태'] || row['payment_status'] || '')
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
      country: row['국가'] || '',
      notes: row['외부 판매채널 예약번호'] || '',
      status: mapStatus(row['예약상태'] || 'CONFIRMED'),
      paymentStatus: mapPaymentStatus(row['결제상태'] || row['결제 상태'] || row['payment_status'] || '')
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
    country: row['국가'] || row['country'] || '',
    notes: row['메모'] || row['notes'] || '',
    status: 'CONFIRMED',
    paymentStatus: mapPaymentStatus(row['결제상태'] || row['결제 상태'] || row['payment_status'] || '')
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

function mapPaymentStatus(statusStr) {
  const status = String(statusStr).toLowerCase().trim();

  // No status provided, default to UNPAID
  if (!status) {
    return 'UNPAID';
  }

  // Paid statuses
  if (status.includes('결제완료') || status.includes('paid') || status.includes('결제') && !status.includes('미') && !status.includes('부분')) {
    return 'PAID';
  }

  // Partial payment
  if (status.includes('부분결제') || status.includes('부분') || status.includes('partial')) {
    return 'PARTIAL';
  }

  // Refunded
  if (status.includes('환불') || status.includes('refund')) {
    return 'REFUNDED';
  }

  // Unpaid
  if (status.includes('미결제') || status.includes('unpaid')) {
    return 'UNPAID';
  }

  // Default to UNPAID if unknown
  return 'UNPAID';
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

// Calculate string similarity (0-100%)
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().replace(/\s+/g, '');
  const s2 = str2.toLowerCase().replace(/\s+/g, '');

  // Exact match (ignoring spaces)
  if (s1 === s2) return 100;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 80;

  // Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i-1) === s1.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1, // substitution
          matrix[i][j-1] + 1,   // insertion
          matrix[i-1][j] + 1    // deletion
        );
      }
    }
  }

  const maxLen = Math.max(s1.length, s2.length);
  const distance = matrix[s2.length][s1.length];
  return Math.round((1 - distance / maxLen) * 100);
}

async function showMissingRoomsDialog(missingRoomNames, properties) {
  // Load saved mappings from localStorage
  const savedMappings = JSON.parse(localStorage.getItem('roomNameMappings') || '{}');

  // Build list of all existing rooms with similarity scores
  const allRooms = [];
  properties.forEach(property => {
    if (property.rooms) {
      property.rooms.forEach(room => {
        allRooms.push({
          id: room.id,
          name: room.name,
          propertyName: property.name,
          propertyId: property.id,
          displayName: `${property.name} - ${room.name}`
        });
      });
    }
  });

  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-4 text-gray-800">객실 매핑 필요</h2>
        <p class="text-gray-600 mb-2">엑셀 파일의 객실 이름을 기존 객실에 매핑하거나 새로 생성하세요.</p>
        <p class="text-sm text-gray-500 mb-4">💡 시스템이 유사한 객실을 추천합니다. 드롭다운에서 선택하거나 "새 객실 생성"을 선택하세요.</p>

        <div class="mb-6 space-y-4">
          ${missingRoomNames.map((roomName, index) => {
            // Calculate similarity for each existing room
            const roomsWithSimilarity = allRooms.map(room => ({
              ...room,
              similarity: calculateSimilarity(roomName, room.name)
            })).sort((a, b) => b.similarity - a.similarity);

            // Get best match or saved mapping
            const savedRoomId = savedMappings[roomName];
            const bestMatch = roomsWithSimilarity[0];
            const suggestedRoomId = savedRoomId || (bestMatch && bestMatch.similarity >= 50 ? bestMatch.id : 'new');

            return `
              <div class="border-2 rounded-lg p-4 ${bestMatch && bestMatch.similarity >= 70 ? 'border-green-200 bg-green-50' : 'bg-gray-50 border-gray-200'}">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <div class="font-bold text-lg text-gray-800">${roomName}</div>
                    ${bestMatch && bestMatch.similarity >= 50 ? `<div class="text-xs text-green-600 mt-1">✓ 추천: ${bestMatch.displayName} (${bestMatch.similarity}% 유사)</div>` : ''}
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">매핑 대상 선택</label>
                    <select class="room-mapping-select w-full px-3 py-2 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            data-room-name="${roomName}"
                            data-index="${index}">
                      <option value="new">🆕 새 객실로 생성</option>
                      <optgroup label="기존 객실 (유사도순)">
                        ${roomsWithSimilarity.map(room => `
                          <option value="${room.id}" ${room.id === suggestedRoomId ? 'selected' : ''}>
                            ${room.displayName} ${room.similarity >= 70 ? '⭐' : room.similarity >= 50 ? '💡' : ''} (${room.similarity}%)
                          </option>
                        `).join('')}
                      </optgroup>
                    </select>
                  </div>

                  <!-- New room creation fields (hidden by default) -->
                  <div class="new-room-fields hidden" data-index="${index}">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">숙소</label>
                        <select class="property-select w-full px-2 py-1.5 text-sm border rounded" data-room-name="${roomName}">
                          ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">기본 요금</label>
                        <input type="number" class="base-price w-full px-2 py-1.5 text-sm border rounded" value="50000" min="0" step="1000" data-room-name="${roomName}">
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1">수용인원</label>
                        <input type="number" class="capacity w-full px-2 py-1.5 text-sm border rounded" value="2" min="1" max="10" data-room-name="${roomName}">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="flex justify-end space-x-3">
          <button id="skipMissingRooms" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
            취소
          </button>
          <button id="applyMappings" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            매핑 적용하고 업로드
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Toggle new room fields based on selection
    modal.querySelectorAll('.room-mapping-select').forEach(select => {
      const index = select.dataset.index;
      const newRoomFields = modal.querySelector(`.new-room-fields[data-index="${index}"]`);

      select.addEventListener('change', () => {
        if (select.value === 'new') {
          newRoomFields.classList.remove('hidden');
        } else {
          newRoomFields.classList.add('hidden');
        }
      });

      // Initialize visibility
      if (select.value === 'new') {
        newRoomFields.classList.remove('hidden');
      }
    });

    document.getElementById('skipMissingRooms').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve({ skip: true });
    });

    document.getElementById('applyMappings').addEventListener('click', async () => {
      try {
        const applyButton = document.getElementById('applyMappings');
        applyButton.disabled = true;
        applyButton.textContent = '처리 중...';

        const mappings = {};
        const roomsToCreate = [];

        // Collect mapping decisions
        missingRoomNames.forEach(roomName => {
          const select = modal.querySelector(`.room-mapping-select[data-room-name="${roomName}"]`);
          const selectedValue = select.value;

          if (selectedValue === 'new') {
            // User wants to create new room
            const propertyId = modal.querySelector(`.property-select[data-room-name="${roomName}"]`).value;
            const basePrice = parseFloat(modal.querySelector(`.base-price[data-room-name="${roomName}"]`).value);
            const capacity = parseInt(modal.querySelector(`.capacity[data-room-name="${roomName}"]`).value);

            roomsToCreate.push({
              propertyId,
              roomName,
              basePrice,
              capacity
            });
          } else {
            // User mapped to existing room
            mappings[roomName] = selectedValue;
          }
        });

        // Create new rooms if needed
        if (roomsToCreate.length > 0) {
          for (const room of roomsToCreate) {
            const result = await apiCall(`/properties?propertyId=${room.propertyId}`, {
              method: 'POST',
              body: JSON.stringify({
                name: room.roomName,
                type: room.roomName,
                totalRooms: 1,
                capacity: room.capacity,
                basePrice: room.basePrice
              })
            });

            // Add the newly created room to mappings
            if (result && result.id) {
              mappings[room.roomName] = result.id;
            }
          }
        }

        // Save mappings to localStorage for future uploads
        const existingMappings = JSON.parse(localStorage.getItem('roomNameMappings') || '{}');
        const updatedMappings = { ...existingMappings, ...mappings };
        localStorage.setItem('roomNameMappings', JSON.stringify(updatedMappings));

        document.body.removeChild(modal);
        resolve({ mappings, created: roomsToCreate.length > 0 });
      } catch (error) {
        showToast('매핑 처리 중 오류 발생: ' + error.message, 'error');
        document.body.removeChild(modal);
        resolve({ skip: true, error: true });
      }
    });
  });
}

// Load property/room filters
async function loadPropertyFilters() {
  try {
    const container = await waitForElement('propertyFilters');
    const properties = await apiCall('/properties');

    if (!properties || properties.length === 0) {
      container.innerHTML = '<div class="text-sm text-gray-500">숙소 없음</div>';
      return;
    }

    let html = '';
    properties.forEach(property => {
      if (property.rooms && property.rooms.length > 0) {
        property.rooms.forEach(room => {
          html += `<label class="flex items-center text-sm">
            <input type="checkbox" value="${room.id}" class="mr-2 room-filter" onchange="applyFilters()">
            ${property.name} - ${room.name}
          </label>`;
        });
      }
    });

    container.innerHTML = html || '<div class="text-sm text-gray-500">객실 없음</div>';
  } catch (error) {
    console.error('Failed to load property filters:', error);
  }
}

// Apply all filters
async function applyFilters() {
  const channels = Array.from(document.querySelectorAll('#channelFilters input:checked')).map(cb => cb.value);
  const rooms = Array.from(document.querySelectorAll('.room-filter:checked')).map(cb => cb.value);
  const statuses = Array.from(document.querySelectorAll('#statusFilters input:checked')).map(cb => cb.value);

  const checkInStart = document.getElementById('filterCheckInStart')?.value;
  const checkInEnd = document.getElementById('filterCheckInEnd')?.value;
  const priceMin = document.getElementById('filterPriceMin')?.value;
  const priceMax = document.getElementById('filterPriceMax')?.value;

  // Only fetch from API if date range changed
  const needsRefetch = checkInStart || checkInEnd;

  if (needsRefetch || allReservations.length === 0) {
    let url = '/reservations?';
    if (checkInStart) url += `startDate=${checkInStart}&`;
    if (checkInEnd) url += `endDate=${checkInEnd}&`;

    try {
      allReservations = await apiCall(url);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      showToast('예약 목록 로딩 실패', 'error');
      return;
    }
  }

  // Client-side filtering - work with a copy of allReservations
  let filtered = [...allReservations];

  if (channels.length > 0) {
    filtered = filtered.filter(r => channels.includes(r.channel));
  }

  if (rooms.length > 0) {
    filtered = filtered.filter(r => rooms.includes(r.room_id));
  }

  if (statuses.length > 0) {
    filtered = filtered.filter(r => statuses.includes(r.status));
  }

  if (priceMin) {
    filtered = filtered.filter(r => parseFloat(r.total_price) >= parseFloat(priceMin));
  }

  if (priceMax) {
    filtered = filtered.filter(r => parseFloat(r.total_price) <= parseFloat(priceMax));
  }

  // Store filtered results separately
  filteredReservations = filtered;
  currentPage = 1;
  renderReservationsList();
}

// Check if any filters are active
function hasActiveFilters() {
  const channels = document.querySelectorAll('#channelFilters input:checked').length > 0;
  const rooms = document.querySelectorAll('.room-filter:checked').length > 0;
  const statuses = document.querySelectorAll('#statusFilters input:checked').length > 0;
  const checkInStart = document.getElementById('filterCheckInStart')?.value;
  const checkInEnd = document.getElementById('filterCheckInEnd')?.value;
  const priceMin = document.getElementById('filterPriceMin')?.value;
  const priceMax = document.getElementById('filterPriceMax')?.value;

  return channels || rooms || statuses || checkInStart || checkInEnd || priceMin || priceMax;
}

// Reset all filters
function resetFilters() {
  document.querySelectorAll('#channelFilters input, .room-filter, #statusFilters input').forEach(cb => cb.checked = false);
  document.getElementById('filterCheckInStart').value = '';
  document.getElementById('filterCheckInEnd').value = '';
  document.getElementById('filterPriceMin').value = '';
  document.getElementById('filterPriceMax').value = '';

  // Clear filtered results
  filteredReservations = [];
  currentPage = 1;
  renderReservationsList();
}

// Edit reservation
async function editReservation(id) {
  try {
    const reservation = allReservations.find(r => r.id === id);
    if (!reservation) {
      showToast('예약을 찾을 수 없습니다', 'error');
      return;
    }

    // Load rooms for select
    const properties = await apiCall('/properties');
    const roomSelect = document.getElementById('editRoomId');
    roomSelect.innerHTML = '<option value="">객실 선택</option>';

    properties.forEach(property => {
      if (property.rooms) {
        property.rooms.forEach(room => {
          const option = document.createElement('option');
          option.value = room.id;
          option.textContent = `${property.name} - ${room.name}`;
          if (room.id === reservation.room_id) option.selected = true;
          roomSelect.appendChild(option);
        });
      }
    });

    // Fill form
    document.getElementById('editReservationId').value = reservation.id;
    document.getElementById('editChannel').value = reservation.channel || 'DIRECT';
    document.getElementById('editGuestName').value = reservation.guest_name;
    document.getElementById('editGuestEmail').value = reservation.guest_email || '';
    document.getElementById('editGuestPhone').value = reservation.guest_phone || '';
    document.getElementById('editNumberOfGuests').value = reservation.number_of_guests || 1;
    document.getElementById('editCheckIn').value = reservation.check_in;
    document.getElementById('editCheckOut').value = reservation.check_out;
    document.getElementById('editTotalPrice').value = reservation.total_price;
    document.getElementById('editStatus').value = reservation.status;
    document.getElementById('editPaymentStatus').value = reservation.payment_status || 'UNPAID';

    // Show modal
    document.getElementById('editReservationModal').classList.remove('hidden');
  } catch (error) {
    console.error('Failed to edit reservation:', error);
    showToast('예약 수정 준비 실패', 'error');
  }
}

// Close edit modal
function closeEditReservationModal() {
  document.getElementById('editReservationModal').classList.add('hidden');
  document.getElementById('editReservationForm').reset();
}

// Save reservation
async function saveReservation(event) {
  event.preventDefault();

  const id = document.getElementById('editReservationId').value;
  const data = {
    room_id: document.getElementById('editRoomId').value,
    channel: document.getElementById('editChannel').value,
    guest_name: document.getElementById('editGuestName').value,
    guest_email: document.getElementById('editGuestEmail').value,
    guest_phone: document.getElementById('editGuestPhone').value,
    number_of_guests: parseInt(document.getElementById('editNumberOfGuests').value),
    check_in: document.getElementById('editCheckIn').value,
    check_out: document.getElementById('editCheckOut').value,
    total_price: parseFloat(document.getElementById('editTotalPrice').value),
    status: document.getElementById('editStatus').value,
    payment_status: document.getElementById('editPaymentStatus').value
  };

  try {
    await apiCall(`/reservations/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    showToast('예약이 수정되었습니다', 'success');
    closeEditReservationModal();
    await loadReservationsList();
  } catch (error) {
    console.error('Failed to save reservation:', error);
    showToast('예약 수정 실패: ' + (error.message || ''), 'error');
  }
}

// Show create reservation modal
async function showCreateReservationModal() {
  try {
    const properties = await apiCall('/properties');
    const roomSelect = document.getElementById('createRoomId');

    // Clear existing options except first
    roomSelect.innerHTML = '<option value="">객실 선택</option>';

    // Add rooms grouped by property
    properties.forEach(property => {
      if (property.rooms && property.rooms.length > 0) {
        property.rooms.forEach(room => {
          const option = document.createElement('option');
          option.value = room.id;
          option.textContent = `${property.name} - ${room.name}`;
          roomSelect.appendChild(option);
        });
      }
    });

    // Set default dates (today and tomorrow)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkInInput = document.getElementById('createCheckIn');
    const checkOutInput = document.getElementById('createCheckOut');

    // Set min date to today
    checkInInput.min = today.toISOString().split('T')[0];
    checkOutInput.min = tomorrow.toISOString().split('T')[0];

    checkInInput.value = today.toISOString().split('T')[0];
    checkOutInput.value = tomorrow.toISOString().split('T')[0];

    // Add date change listeners for validation
    checkInInput.addEventListener('change', function() {
      const checkIn = new Date(this.value);
      const nextDay = new Date(checkIn);
      nextDay.setDate(nextDay.getDate() + 1);
      checkOutInput.min = nextDay.toISOString().split('T')[0];

      // If check-out is before new minimum, update it
      if (checkOutInput.value && new Date(checkOutInput.value) <= checkIn) {
        checkOutInput.value = nextDay.toISOString().split('T')[0];
      }
    });

    // Show modal
    document.getElementById('createReservationModal').classList.remove('hidden');
  } catch (error) {
    console.error('Failed to load properties for creation:', error);
    showToast('객실 목록 로딩 실패', 'error');
  }
}

// Close create reservation modal
function closeCreateReservationModal() {
  document.getElementById('createReservationModal').classList.add('hidden');
  document.getElementById('createReservationForm').reset();
}

// Create reservation
async function createReservation(event) {
  event.preventDefault();

  const roomId = document.getElementById('createRoomId').value;
  const guestName = document.getElementById('createGuestName').value.trim();
  const checkIn = document.getElementById('createCheckIn').value;
  const checkOut = document.getElementById('createCheckOut').value;
  const totalPrice = document.getElementById('createTotalPrice').value;
  const numberOfGuests = document.getElementById('createNumberOfGuests').value;

  // Frontend validation
  if (!roomId) {
    showToast('객실을 선택해주세요', 'error');
    return;
  }

  if (!guestName) {
    showToast('투숙객명을 입력해주세요', 'error');
    return;
  }

  if (!checkIn) {
    showToast('체크인 날짜를 선택해주세요', 'error');
    return;
  }

  if (!checkOut) {
    showToast('체크아웃 날짜를 선택해주세요', 'error');
    return;
  }

  if (new Date(checkIn) >= new Date(checkOut)) {
    showToast('체크아웃 날짜는 체크인 날짜보다 뒤여야 합니다', 'error');
    return;
  }

  if (!totalPrice || parseFloat(totalPrice) <= 0) {
    showToast('유효한 총 금액을 입력해주세요', 'error');
    return;
  }

  if (!numberOfGuests || parseInt(numberOfGuests) < 1) {
    showToast('투숙 인원은 최소 1명 이상이어야 합니다', 'error');
    return;
  }

  const data = {
    room_id: roomId,
    channel: document.getElementById('createChannel').value,
    guest_name: guestName,
    guest_email: document.getElementById('createGuestEmail').value || null,
    guest_phone: document.getElementById('createGuestPhone').value || null,
    check_in: checkIn,
    check_out: checkOut,
    number_of_guests: parseInt(numberOfGuests),
    total_price: parseFloat(totalPrice),
    status: document.getElementById('createStatus').value,
    payment_status: document.getElementById('createPaymentStatus').value
  };

  try {
    await apiCall('/reservations', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    showToast('예약이 생성되었습니다', 'success');
    closeCreateReservationModal();
    await loadReservationsList();
  } catch (error) {
    console.error('Failed to create reservation:', error);
    const errorMessage = error.message || '예약 생성 실패';
    showToast(errorMessage, 'error');
  }
}

router.register('reservations', loadReservations);
