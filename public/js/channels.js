// 채널 연동 관리 페이지
async function loadChannels() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">채널 연동 관리</h1>
      <p class="text-gray-600">예약 채널 연동 정보를 관리합니다</p>
    </div>

    <!-- 채널 카드 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <!-- Booking.com -->
      <div class="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-600">
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
      <div class="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-600">
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
      <div class="bg-white rounded-lg shadow-md p-6 border-t-4 border-red-600">
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
    <div class="bg-white rounded-lg shadow-md p-6">
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

  await loadChannelMappings();
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
          <h4 class="font-semibold text-blue-900 mb-2">📘 연동 방법</h4>
          <ol class="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Booking.com Extranet에 로그인</li>
            <li>Settings → Channel Manager → API Access 메뉴로 이동</li>
            <li>API Key와 Hotel ID를 확인</li>
            <li>아래 양식에 정보를 입력하세요</li>
          </ol>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Hotel ID *</label>
          <input type="text" id="bookingHotelId" required
            placeholder="예: 12345678"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <p class="text-xs text-gray-500 mt-1">Booking.com에서 부여받은 숙소 ID</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">API Key *</label>
          <input type="text" id="bookingApiKey" required
            placeholder="예: abcd1234-efgh-5678-ijkl-9012mnop3456"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <p class="text-xs text-gray-500 mt-1">Booking.com API 키</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">API Secret</label>
          <input type="password" id="bookingApiSecret"
            placeholder="API Secret (선택사항)"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <p class="text-xs text-gray-500 mt-1">일부 API에서 요구하는 Secret Key</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">연동할 숙소 선택 *</label>
          <select id="bookingPropertyId" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- 숙소를 선택하세요 --</option>
          </select>
        </div>

        <div class="flex items-center">
          <input type="checkbox" id="bookingAutoSync" checked
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
          <label for="bookingAutoSync" class="ml-2 text-sm text-gray-700">
            자동 동기화 활성화 (5분마다)
          </label>
        </div>
      </div>
    `;
  } else if (channel === 'yanolja') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h4 class="font-semibold text-green-900 mb-2">📗 연동 방법</h4>
          <ol class="text-sm text-green-800 space-y-1 list-decimal list-inside">
            <li>야놀자 파트너센터에 로그인</li>
            <li>설정 → API 연동 메뉴로 이동</li>
            <li>API Key와 Partner Code를 확인</li>
            <li>아래 양식에 정보를 입력하세요</li>
          </ol>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Partner Code *</label>
          <input type="text" id="yanoljaPartnerCode" required
            placeholder="예: YNJ-12345"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
          <p class="text-xs text-gray-500 mt-1">야놀자 파트너 코드</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Property Code *</label>
          <input type="text" id="yanoljaPropertyCode" required
            placeholder="예: PROP-67890"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
          <p class="text-xs text-gray-500 mt-1">야놀자에 등록된 숙소 코드</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">API Key *</label>
          <input type="text" id="yanoljaApiKey" required
            placeholder="예: ynj_1234567890abcdef"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
          <p class="text-xs text-gray-500 mt-1">야놀자 API 키</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">API Secret</label>
          <input type="password" id="yanoljaApiSecret"
            placeholder="API Secret (선택사항)"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">연동할 숙소 선택 *</label>
          <select id="yanoljaPropertyId" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">-- 숙소를 선택하세요 --</option>
          </select>
        </div>

        <div class="flex items-center">
          <input type="checkbox" id="yanoljaAutoSync" checked
            class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500">
          <label for="yanoljaAutoSync" class="ml-2 text-sm text-gray-700">
            자동 동기화 활성화 (5분마다)
          </label>
        </div>
      </div>
    `;
  } else if (channel === 'airbnb') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h4 class="font-semibold text-red-900 mb-2">📕 연동 방법</h4>
          <ol class="text-sm text-red-800 space-y-1 list-decimal list-inside">
            <li>Airbnb 호스트 대시보드에 로그인</li>
            <li>계정 → 통합 및 연결 → API 설정 메뉴로 이동</li>
            <li>OAuth 앱을 생성하고 Client ID/Secret을 확인</li>
            <li>Redirect URI: <code class="bg-white px-1 rounded">${window.location.origin}/api/auth/airbnb/callback</code></li>
            <li>아래 양식에 정보를 입력하세요</li>
          </ol>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Listing ID *</label>
          <input type="text" id="airbnbListingId" required
            placeholder="예: 12345678"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
          <p class="text-xs text-gray-500 mt-1">Airbnb 숙소 등록 ID</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Client ID *</label>
          <input type="text" id="airbnbClientId" required
            placeholder="예: d12345abcdefg"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
          <p class="text-xs text-gray-500 mt-1">Airbnb OAuth Client ID</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Client Secret *</label>
          <input type="password" id="airbnbClientSecret" required
            placeholder="Client Secret"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
          <p class="text-xs text-gray-500 mt-1">Airbnb OAuth Client Secret</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">Access Token</label>
          <textarea id="airbnbAccessToken" rows="3"
            placeholder="OAuth 인증 후 발급받은 Access Token (선택사항)"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"></textarea>
          <p class="text-xs text-gray-500 mt-1">이미 발급받은 토큰이 있다면 입력하세요</p>
        </div>

        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">연동할 숙소 선택 *</label>
          <select id="airbnbPropertyId" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
            <option value="">-- 숙소를 선택하세요 --</option>
          </select>
        </div>

        <div class="flex items-center">
          <input type="checkbox" id="airbnbAutoSync" checked
            class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500">
          <label for="airbnbAutoSync" class="ml-2 text-sm text-gray-700">
            자동 동기화 활성화 (5분마다)
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
      const hotelId = document.getElementById('bookingHotelId').value;
      const apiKey = document.getElementById('bookingApiKey').value;
      const apiSecret = document.getElementById('bookingApiSecret').value;
      const propertyId = document.getElementById('bookingPropertyId').value;
      const autoSync = document.getElementById('bookingAutoSync').checked;

      if (!hotelId || !apiKey || !propertyId) {
        showToast('필수 항목을 모두 입력해주세요.', 'error');
        return;
      }

      data = {
        channel: 'BOOKING_COM',
        propertyId,
        channelPropertyId: hotelId,
        credentials: JSON.stringify({
          apiKey,
          apiSecret,
          autoSync
        })
      };
    } else if (currentChannel === 'yanolja') {
      const partnerCode = document.getElementById('yanoljaPartnerCode').value;
      const propertyCode = document.getElementById('yanoljaPropertyCode').value;
      const apiKey = document.getElementById('yanoljaApiKey').value;
      const apiSecret = document.getElementById('yanoljaApiSecret').value;
      const propertyId = document.getElementById('yanoljaPropertyId').value;
      const autoSync = document.getElementById('yanoljaAutoSync').checked;

      if (!partnerCode || !propertyCode || !apiKey || !propertyId) {
        showToast('필수 항목을 모두 입력해주세요.', 'error');
        return;
      }

      data = {
        channel: 'YANOLJA',
        propertyId,
        channelPropertyId: propertyCode,
        credentials: JSON.stringify({
          partnerCode,
          apiKey,
          apiSecret,
          autoSync
        })
      };
    } else if (currentChannel === 'airbnb') {
      const listingId = document.getElementById('airbnbListingId').value;
      const clientId = document.getElementById('airbnbClientId').value;
      const clientSecret = document.getElementById('airbnbClientSecret').value;
      const accessToken = document.getElementById('airbnbAccessToken').value;
      const propertyId = document.getElementById('airbnbPropertyId').value;
      const autoSync = document.getElementById('airbnbAutoSync').checked;

      if (!listingId || !clientId || !clientSecret || !propertyId) {
        showToast('필수 항목을 모두 입력해주세요.', 'error');
        return;
      }

      data = {
        channel: 'AIRBNB',
        propertyId,
        channelPropertyId: listingId,
        credentials: JSON.stringify({
          clientId,
          clientSecret,
          accessToken,
          autoSync
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
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${mappings.map(mapping => `
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
                <td class="px-4 py-3 text-center">
                  <button onclick="testChannelConnection('${mapping.id}')"
                    class="text-blue-600 hover:text-blue-800 text-sm mr-2">
                    테스트
                  </button>
                  <button onclick="deleteChannelMapping('${mapping.id}')"
                    class="text-red-600 hover:text-red-800 text-sm">
                    삭제
                  </button>
                </td>
              </tr>
            `).join('')}
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

async function testChannelConnection(mappingId) {
  showToast('채널 연결 테스트 기능은 준비 중입니다.', 'error');
}

async function deleteChannelMapping(mappingId) {
  if (!confirm('이 채널 연동을 삭제하시겠습니까?')) return;
  showToast('채널 연동 삭제 기능은 준비 중입니다.', 'error');
}

router.register('channels', loadChannels);
