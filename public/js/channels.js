// 채널 연동 관리 페이지
async function loadChannels() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-4 md:mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">채널 연동 관리</h1>
      <p class="text-sm md:text-base text-gray-600">예약 채널 연동 정보를 관리합니다</p>
    </div>

    <!-- 채널 카드 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
      <!-- Booking.com -->
      <div class="bg-white rounded-lg shadow-md p-4 md:p-6 border-t-4 border-blue-600">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              B
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-bold text-gray-800">Booking.com</h3>
              <p class="text-xs text-gray-500">글로벌 OTA</p>
            </div>
          </div>
          <div id="bookingStatus" class="flex items-center">
            <span class="w-3 h-3 bg-gray-400 rounded-full"></span>
            <span class="ml-2 text-sm text-gray-600">미연동</span>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-4">
          Booking.com API를 통해 예약, 재고, 요금 정보를 실시간으로 동기화합니다.
        </p>
        <button onclick="showChannelModal('booking')" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          연동 설정
        </button>
      </div>

      <!-- 야놀자 -->
      <div class="bg-white rounded-lg shadow-md p-4 md:p-6 border-t-4 border-green-600">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              Y
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-bold text-gray-800">야놀자</h3>
              <p class="text-xs text-gray-500">국내 OTA</p>
            </div>
          </div>
          <div id="yanoljaStatus" class="flex items-center">
            <span class="w-3 h-3 bg-gray-400 rounded-full"></span>
            <span class="ml-2 text-sm text-gray-600">미연동</span>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-4">
          야놀자 API를 통해 예약, 재고, 요금 정보를 실시간으로 동기화합니다.
        </p>
        <button onclick="showChannelModal('yanolja')" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          연동 설정
        </button>
      </div>

      <!-- Airbnb -->
      <div class="bg-white rounded-lg shadow-md p-4 md:p-6 border-t-4 border-red-600">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              A
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-bold text-gray-800">Airbnb</h3>
              <p class="text-xs text-gray-500">글로벌 공유숙박</p>
            </div>
          </div>
          <div id="airbnbStatus" class="flex items-center">
            <span class="w-3 h-3 bg-gray-400 rounded-full"></span>
            <span class="ml-2 text-sm text-gray-600">미연동</span>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-4">
          Airbnb API를 통해 예약, 재고, 요금 정보를 실시간으로 동기화합니다.
        </p>
        <button onclick="showChannelModal('airbnb')" class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          연동 설정
        </button>
      </div>
    </div>

    <!-- 연동된 숙소 목록 -->
    <div class="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 class="text-xl font-bold mb-4">연동된 숙소</h2>
      <div id="channelMappingsList">
        <div class="text-center py-8 text-gray-500">로딩중...</div>
      </div>
    </div>

    <!-- 채널 연동 모달 -->
    <div id="channelModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <h2 class="text-2xl font-bold mb-6" id="channelModalTitle">채널 연동</h2>

        <div id="channelFormContent"></div>

        <div class="flex justify-end space-x-3 mt-6">
          <button type="button" onclick="closeChannelModal()"
            class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
            취소
          </button>
          <button type="button" onclick="saveChannelConnection()"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            저장
          </button>
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
    await waitForElement('channelMappingsList');
    await loadChannelMappings();
  } catch (error) {
    console.error('Failed to initialize channels:', error);
  }
}

let currentChannel = null;

function showChannelModal(channel) {
  currentChannel = channel;
  const modal = document.getElementById('channelModal');
  const title = document.getElementById('channelModalTitle');
  const content = document.getElementById('channelFormContent');

  const channelNames = {
    booking: 'Booking.com',
    yanolja: '야놀자',
    airbnb: 'Airbnb'
  };

  title.textContent = `${channelNames[channel]} 연동 설정`;

  if (channel === 'booking') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 class="font-semibold text-blue-900 mb-2">📘 iCal 연동 방법</h4>
          <ol class="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Booking.com Extranet에 로그인</li>
            <li>숙소 선택 → Calendar → Sync calendars</li>
            <li>"Export calendar" 섹션에서 iCal URL 복사</li>
            <li>아래에 URL을 붙여넣으세요</li>
          </ol>
          <p class="text-xs text-blue-700 mt-2">💡 iCal은 예약 정보를 자동으로 가져옵니다 (읽기 전용)</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">숙소 이름 *</label>
          <input type="text" id="bookingPropertyName" required
            placeholder="예: 서울 게스트하우스"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <p class="text-xs text-gray-500 mt-1">Booking.com에 등록된 숙소 이름</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">iCal URL *</label>
          <textarea id="bookingIcalUrl" required rows="3"
            placeholder="예: https://admin.booking.com/hotel/hoteladmin/ical.html?id=12345678&token=abcd1234..."
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          <p class="text-xs text-gray-500 mt-1">Booking.com에서 복사한 iCal Export URL</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">연동할 내부 숙소 선택 *</label>
          <select id="bookingPropertyId" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- 숙소를 선택하세요 --</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">시스템에 등록된 숙소 중 연동할 숙소를 선택하세요</p>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p class="text-xs text-yellow-800">
            <strong>⚠️ 주의:</strong> iCal은 예약 정보만 가져올 수 있습니다.
            재고/요금 업데이트는 Booking.com Extranet에서 직접 관리하세요.
          </p>
        </div>

        <div class="flex items-center">
          <input type="checkbox" id="bookingAutoSync" checked
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
          <label for="bookingAutoSync" class="ml-2 text-sm text-gray-700">
            자동 동기화 활성화 (1시간마다)
          </label>
        </div>
      </div>
    `;
  } else if (channel === 'yanolja') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h4 class="font-semibold text-green-900 mb-2">📗 iCal 연동 방법</h4>
          <ol class="text-sm text-green-800 space-y-1 list-decimal list-inside">
            <li>야놀자 파트너센터에 로그인</li>
            <li>숙소 관리 → 예약 캘린더 → 외부 캘린더 연동</li>
            <li>"캘린더 내보내기" URL 복사</li>
            <li>아래에 URL을 붙여넣으세요</li>
          </ol>
          <p class="text-xs text-green-700 mt-2">💡 iCal은 예약 정보를 자동으로 가져옵니다 (읽기 전용)</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">숙소 이름 *</label>
          <input type="text" id="yanoljaPropertyName" required
            placeholder="예: 부산 호텔"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
          <p class="text-xs text-gray-500 mt-1">야놀자에 등록된 숙소 이름</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">iCal URL *</label>
          <textarea id="yanoljaIcalUrl" required rows="3"
            placeholder="예: https://www.yanolja.com/partner/ical/export?property_id=12345&token=abcd..."
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"></textarea>
          <p class="text-xs text-gray-500 mt-1">야놀자에서 복사한 iCal Export URL</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">연동할 내부 숙소 선택 *</label>
          <select id="yanoljaPropertyId" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">-- 숙소를 선택하세요 --</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">시스템에 등록된 숙소 중 연동할 숙소를 선택하세요</p>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p class="text-xs text-yellow-800">
            <strong>⚠️ 주의:</strong> iCal은 예약 정보만 가져올 수 있습니다.
            재고/요금 업데이트는 야놀자 파트너센터에서 직접 관리하세요.
          </p>
        </div>

        <div class="flex items-center">
          <input type="checkbox" id="yanoljaAutoSync" checked
            class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500">
          <label for="yanoljaAutoSync" class="ml-2 text-sm text-gray-700">
            자동 동기화 활성화 (1시간마다)
          </label>
        </div>
      </div>
    `;
  } else if (channel === 'airbnb') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h4 class="font-semibold text-red-900 mb-2">📕 iCal 연동 방법</h4>
          <ol class="text-sm text-red-800 space-y-1 list-decimal list-inside">
            <li>Airbnb 호스트 대시보드에 로그인</li>
            <li>숙소 선택 → Calendar → Availability settings</li>
            <li>"Sync calendars" → "Export calendar" 링크 복사</li>
            <li>아래에 URL을 붙여넣으세요</li>
          </ol>
          <p class="text-xs text-red-700 mt-2">💡 iCal은 예약 정보를 자동으로 가져옵니다 (읽기 전용)</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">숙소 이름 *</label>
          <input type="text" id="airbnbPropertyName" required
            placeholder="예: 제주 풀빌라"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
          <p class="text-xs text-gray-500 mt-1">Airbnb에 등록된 숙소 이름</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">iCal URL *</label>
          <textarea id="airbnbIcalUrl" required rows="3"
            placeholder="예: https://www.airbnb.com/calendar/ical/12345678.ics?s=abcdef123456..."
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"></textarea>
          <p class="text-xs text-gray-500 mt-1">Airbnb에서 복사한 iCal Export URL</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">연동할 내부 숙소 선택 *</label>
          <select id="airbnbPropertyId" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
            <option value="">-- 숙소를 선택하세요 --</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">시스템에 등록된 숙소 중 연동할 숙소를 선택하세요</p>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p class="text-xs text-yellow-800">
            <strong>⚠️ 주의:</strong> iCal은 예약 정보만 가져올 수 있습니다.
            재고/요금 업데이트는 Airbnb 호스트 대시보드에서 직접 관리하세요.
          </p>
        </div>

        <div class="flex items-center">
          <input type="checkbox" id="airbnbAutoSync" checked
            class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500">
          <label for="airbnbAutoSync" class="ml-2 text-sm text-gray-700">
            자동 동기화 활성화 (1시간마다)
          </label>
        </div>
      </div>
    `;
  }

  // 숙소 목록 로드
  loadPropertiesForChannel();

  modal.classList.remove('hidden');
}

function closeChannelModal() {
  document.getElementById('channelModal').classList.add('hidden');
  currentChannel = null;
}

async function loadPropertiesForChannel() {
  try {
    const properties = await apiCall('/properties');

    const selects = [
      document.getElementById('bookingPropertyId'),
      document.getElementById('yanoljaPropertyId'),
      document.getElementById('airbnbPropertyId')
    ];

    selects.forEach(select => {
      if (select) {
        select.innerHTML = '<option value="">-- 숙소를 선택하세요 --</option>' +
          properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      }
    });
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

async function saveChannelConnection() {
  if (!currentChannel) return;

  try {
    let data = {};

    if (currentChannel === 'booking') {
      const propertyName = document.getElementById('bookingPropertyName').value;
      const icalUrl = document.getElementById('bookingIcalUrl').value;
      const propertyId = document.getElementById('bookingPropertyId').value;
      const autoSync = document.getElementById('bookingAutoSync').checked;

      if (!propertyName || !icalUrl || !propertyId) {
        showToast('필수 항목을 모두 입력해주세요.', 'error');
        return;
      }

      // iCal URL 유효성 검사
      if (!icalUrl.startsWith('http')) {
        showToast('올바른 iCal URL을 입력해주세요.', 'error');
        return;
      }

      data = {
        channel: 'BOOKING_COM',
        propertyId,
        channelPropertyId: propertyName,
        credentials: JSON.stringify({
          icalUrl,
          propertyName,
          autoSync,
          syncType: 'ical'
        })
      };
    } else if (currentChannel === 'yanolja') {
      const propertyName = document.getElementById('yanoljaPropertyName').value;
      const icalUrl = document.getElementById('yanoljaIcalUrl').value;
      const propertyId = document.getElementById('yanoljaPropertyId').value;
      const autoSync = document.getElementById('yanoljaAutoSync').checked;

      if (!propertyName || !icalUrl || !propertyId) {
        showToast('필수 항목을 모두 입력해주세요.', 'error');
        return;
      }

      if (!icalUrl.startsWith('http')) {
        showToast('올바른 iCal URL을 입력해주세요.', 'error');
        return;
      }

      data = {
        channel: 'YANOLJA',
        propertyId,
        channelPropertyId: propertyName,
        credentials: JSON.stringify({
          icalUrl,
          propertyName,
          autoSync,
          syncType: 'ical'
        })
      };
    } else if (currentChannel === 'airbnb') {
      const propertyName = document.getElementById('airbnbPropertyName').value;
      const icalUrl = document.getElementById('airbnbIcalUrl').value;
      const propertyId = document.getElementById('airbnbPropertyId').value;
      const autoSync = document.getElementById('airbnbAutoSync').checked;

      if (!propertyName || !icalUrl || !propertyId) {
        showToast('필수 항목을 모두 입력해주세요.', 'error');
        return;
      }

      if (!icalUrl.startsWith('http')) {
        showToast('올바른 iCal URL을 입력해주세요.', 'error');
        return;
      }

      data = {
        channel: 'AIRBNB',
        propertyId,
        channelPropertyId: propertyName,
        credentials: JSON.stringify({
          icalUrl,
          propertyName,
          autoSync,
          syncType: 'ical'
        })
      };
    }

    showToast('채널 연동 정보가 저장되었습니다.');
    closeChannelModal();
    await loadChannelMappings();

  } catch (error) {
    console.error('Channel connection error:', error);
    showToast('저장 중 오류가 발생했습니다.', 'error');
  }
}

async function loadChannelMappings() {
  try {
    const properties = await apiCall('/properties');
    const container = document.getElementById('channelMappingsList');

    if (!container) {
      console.error('channelMappingsList element not found');
      return;
    }

    // 채널 매핑 정보 수집
    const mappings = [];
    properties.forEach(property => {
      if (property.channel_mappings && property.channel_mappings.length > 0) {
        property.channel_mappings.forEach(mapping => {
          mappings.push({
            ...mapping,
            property_name: property.name
          });
        });
      }
    });

    if (mappings.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">연동된 채널이 없습니다</h3>
          <p class="mt-1 text-sm text-gray-500">위의 채널 카드에서 연동 설정을 시작하세요.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">채널</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">숙소</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">채널 숙소 ID</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">상태</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">마지막 동기화</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${mappings.map(mapping => {
              const lastSync = mapping.last_sync
                ? new Date(mapping.last_sync).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '동기화 안됨';

              return `
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <span class="inline-block px-2 py-1 text-xs rounded ${getChannelColor(mapping.channel)}">
                      ${getChannelName(mapping.channel)}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900">${mapping.property_name}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">${mapping.channel_property_id}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="inline-block px-2 py-1 text-xs rounded ${mapping.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      ${mapping.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-xs text-gray-600">
                    ${lastSync}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <button onclick="syncChannelNow('${mapping.id}')"
                      class="text-green-600 hover:text-green-800 text-sm mr-2"
                      title="지금 동기화">
                      🔄 동기화
                    </button>
                    <button onclick="deleteChannelMapping('${mapping.id}')"
                      class="text-red-600 hover:text-red-800 text-sm">
                      삭제
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // 상태 업데이트
    updateChannelStatus(mappings);
  } catch (error) {
    console.error('Failed to load channel mappings:', error);
  }
}

function updateChannelStatus(mappings) {
  const channels = {
    BOOKING_COM: 'bookingStatus',
    YANOLJA: 'yanoljaStatus',
    AIRBNB: 'airbnbStatus'
  };

  Object.keys(channels).forEach(channel => {
    const statusEl = document.getElementById(channels[channel]);
    const hasMapping = mappings.some(m => m.channel === channel && m.is_active);

    if (statusEl) {
      if (hasMapping) {
        statusEl.innerHTML = `
          <span class="w-3 h-3 bg-green-500 rounded-full"></span>
          <span class="ml-2 text-sm text-green-600 font-semibold">연동됨</span>
        `;
      } else {
        statusEl.innerHTML = `
          <span class="w-3 h-3 bg-gray-400 rounded-full"></span>
          <span class="ml-2 text-sm text-gray-600">미연동</span>
        `;
      }
    }
  });
}

async function syncChannelNow(mappingId) {
  try {
    showToast('동기화를 시작합니다...', 'info');

    const result = await apiCall('/channels/sync-ical', {
      method: 'POST',
      body: JSON.stringify({ channelMappingId: mappingId })
    });

    if (result.success) {
      showToast(`동기화 완료! 생성: ${result.created}건, 중복: ${result.skipped}건, 오류: ${result.errors}건`);
      await loadChannelMappings();
    } else {
      showToast('동기화에 실패했습니다.', 'error');
    }
  } catch (error) {
    console.error('Sync error:', error);
    showToast(`동기화 중 오류 발생: ${error.message}`, 'error');
  }
}

async function deleteChannelMapping(mappingId) {
  if (!confirm('이 채널 연동을 삭제하시겠습니까?')) return;

  try {
    await apiCall(`/channels?id=${mappingId}`, { method: 'DELETE' });
    showToast('채널 연동이 삭제되었습니다.');
    await loadChannelMappings();
  } catch (error) {
    console.error('Delete error:', error);
    showToast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

router.register('channels', loadChannels);
