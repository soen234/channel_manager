// 숙소 관리 페이지
async function loadProperties() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">숙소 관리</h1>
        <p class="text-gray-600">숙소 및 객실 정보를 관리합니다</p>
      </div>
      <button onclick="showAddPropertyModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
        + 숙소 추가
      </button>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6">
      <div id="propertiesList" class="space-y-4">
        <div class="text-center py-8 text-gray-500">로딩중...</div>
      </div>
    </div>

    <!-- 숙소 추가/수정 모달 -->
    <div id="propertyModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 class="text-2xl font-bold mb-4" id="modalTitle">숙소 추가</h2>
        <form id="propertyForm" onsubmit="saveProperty(event)">
          <input type="hidden" id="propertyId">

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">숙소명</label>
            <input type="text" id="propertyName" required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">주소</label>
            <input type="text" id="propertyAddress" required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">설명</label>
            <textarea id="propertyDescription" rows="3"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>

          <div class="flex justify-end space-x-3">
            <button type="button" onclick="closePropertyModal()"
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

    <!-- 객실 추가 모달 -->
    <div id="roomModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 class="text-2xl font-bold mb-4">객실 추가</h2>
        <form id="roomForm" onsubmit="saveRoom(event)">
          <input type="hidden" id="roomPropertyId">

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">객실명</label>
            <input type="text" id="roomName" required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">객실 타입</label>
            <input type="text" id="roomType" required placeholder="예: 디럭스, 스위트, 패밀리 등"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <p class="text-xs text-gray-500 mt-1">자유롭게 입력하세요 (예: 디럭스 더블, 스위트룸, 패밀리 트윈)</p>
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">객실 수량</label>
            <input type="number" id="roomTotalRooms" required min="1" max="999" value="1"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <p class="text-xs text-gray-500 mt-1">이 타입의 객실이 총 몇 개인지 입력하세요</p>
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">수용인원 (1개 객실당)</label>
            <input type="number" id="roomCapacity" required min="1" max="10"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <p class="text-xs text-gray-500 mt-1">1개 객실에 최대 몇 명까지 투숙 가능한지 입력하세요</p>
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">기본 요금 (원)</label>
            <input type="number" id="roomBasePrice" required min="0" step="1000"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="flex justify-end space-x-3">
            <button type="button" onclick="closeRoomModal()"
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
  `;

  await refreshProperties();
}

async function refreshProperties() {
  try {
    const properties = await apiCall('/properties');
    const container = document.getElementById('propertiesList');

    if (properties.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">숙소가 없습니다</h3>
          <p class="mt-1 text-sm text-gray-500">새로운 숙소를 추가하여 시작하세요.</p>
          <div class="mt-6">
            <button onclick="showAddPropertyModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              + 숙소 추가
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = properties.map(property => `
      <div class="border rounded-lg p-6 hover:shadow-lg transition">
        <div class="flex justify-between items-start mb-4">
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-800">${property.name}</h3>
            <p class="text-gray-600 text-sm">${property.address}</p>
            ${property.description ? `<p class="text-gray-500 text-sm mt-2">${property.description}</p>` : ''}
          </div>
          <div class="flex space-x-2">
            <button onclick="editProperty('${property.id}')"
              class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
              수정
            </button>
            <button onclick="deleteProperty('${property.id}')"
              class="px-3 py-1 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded">
              삭제
            </button>
          </div>
        </div>

        <div class="border-t pt-4">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold text-gray-700">객실 목록 (${property.rooms?.length || 0}개)</h4>
            <button onclick="showAddRoomModal('${property.id}')"
              class="px-3 py-1 text-sm bg-blue-100 text-blue-600 hover:bg-blue-200 rounded">
              + 객실 추가
            </button>
          </div>

          ${property.rooms && property.rooms.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              ${property.rooms.map(room => `
                <div class="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <p class="font-medium text-gray-900">${room.name}</p>
                        <span class="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                          ${room.totalRooms || 1}개
                        </span>
                      </div>
                      <p class="text-sm text-gray-600">타입: ${room.type}</p>
                      <p class="text-sm text-gray-500">수용인원: 최대 ${room.capacity}명/객실</p>
                      <p class="text-sm font-semibold text-blue-600 mt-1">${room.basePrice.toLocaleString()}원/박</p>
                    </div>
                    <button onclick="deleteRoom('${property.id}', '${room.id}')"
                      class="text-red-500 hover:text-red-700 text-sm ml-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-gray-500 text-sm">등록된 객실이 없습니다.</p>'}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

function showAddPropertyModal() {
  document.getElementById('modalTitle').textContent = '숙소 추가';
  document.getElementById('propertyForm').reset();
  document.getElementById('propertyId').value = '';
  document.getElementById('propertyModal').classList.remove('hidden');
}

function closePropertyModal() {
  document.getElementById('propertyModal').classList.add('hidden');
}

async function saveProperty(event) {
  event.preventDefault();

  const id = document.getElementById('propertyId').value;
  const data = {
    name: document.getElementById('propertyName').value,
    address: document.getElementById('propertyAddress').value,
    description: document.getElementById('propertyDescription').value
  };

  try {
    if (id) {
      await apiCall(`/properties?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('숙소가 수정되었습니다.');
    } else {
      await apiCall('/properties', { method: 'POST', body: JSON.stringify(data) });
      showToast('숙소가 추가되었습니다.');
    }

    closePropertyModal();
    await refreshProperties();
  } catch (error) {
    showToast('저장 중 오류가 발생했습니다.', 'error');
  }
}

async function editProperty(id) {
  try {
    const property = await apiCall(`/properties?id=${id}`);

    document.getElementById('modalTitle').textContent = '숙소 수정';
    document.getElementById('propertyId').value = property.id;
    document.getElementById('propertyName').value = property.name;
    document.getElementById('propertyAddress').value = property.address;
    document.getElementById('propertyDescription').value = property.description || '';
    document.getElementById('propertyModal').classList.remove('hidden');
  } catch (error) {
    showToast('숙소 정보를 불러오는데 실패했습니다.', 'error');
  }
}

async function deleteProperty(id) {
  if (!confirm('이 숙소를 삭제하시겠습니까?')) return;

  try {
    await apiCall(`/properties?id=${id}`, { method: 'DELETE' });
    showToast('숙소가 삭제되었습니다.');
    await refreshProperties();
  } catch (error) {
    showToast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

function showAddRoomModal(propertyId) {
  document.getElementById('roomForm').reset();
  document.getElementById('roomPropertyId').value = propertyId;
  document.getElementById('roomModal').classList.remove('hidden');
}

function closeRoomModal() {
  document.getElementById('roomModal').classList.add('hidden');
}

async function saveRoom(event) {
  event.preventDefault();

  const propertyId = document.getElementById('roomPropertyId').value;
  const data = {
    name: document.getElementById('roomName').value,
    type: document.getElementById('roomType').value,
    totalRooms: parseInt(document.getElementById('roomTotalRooms').value),
    capacity: parseInt(document.getElementById('roomCapacity').value),
    basePrice: parseFloat(document.getElementById('roomBasePrice').value)
  };

  try {
    await apiCall(`/properties?propertyId=${propertyId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    showToast('객실이 추가되었습니다.');
    closeRoomModal();
    await refreshProperties();
  } catch (error) {
    showToast('저장 중 오류가 발생했습니다.', 'error');
  }
}

async function deleteRoom(propertyId, roomId) {
  if (!confirm('이 객실을 삭제하시겠습니까?')) return;

  try {
    await apiCall(`/properties?propertyId=${propertyId}&roomId=${roomId}`, { method: 'DELETE' });
    showToast('객실이 삭제되었습니다.');
    await refreshProperties();
  } catch (error) {
    showToast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

// 라우터에 등록
router.register('properties', loadProperties);
