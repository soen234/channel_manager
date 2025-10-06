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

    <!-- 객실 추가/수정 모달 -->
    <div id="roomModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 class="text-2xl font-bold mb-4" id="roomModalTitle">객실 추가</h2>
        <form id="roomForm" onsubmit="saveRoom(event)">
          <input type="hidden" id="roomPropertyId">
          <input type="hidden" id="roomId">

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
    const container = await waitForElement('propertiesList');

    if (!container) {
      console.error('propertiesList element not found');
      return;
    }

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
            ${property.invite_code ? `
              <div class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span class="text-sm text-blue-700 font-semibold">초대 코드:</span>
                <span class="font-mono text-lg text-blue-900">${property.invite_code}</span>
                <button onclick="copyInviteCode('${property.invite_code}')"
                  class="text-blue-600 hover:text-blue-800" title="복사">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </button>
              </div>
            ` : ''}
          </div>
          <div class="flex space-x-2">
            <button onclick="managePropertyStaff('${property.id}', '${property.name}')"
              class="px-3 py-1 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded">
              스태프 관리
            </button>
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
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              ${property.rooms.map(room => `
                <div class="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <p class="font-medium text-gray-900">${room.name}</p>
                        <span class="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                          ${room.total_rooms || 1}개
                        </span>
                      </div>
                      <p class="text-sm text-gray-600">타입: ${room.type}</p>
                      <p class="text-sm text-gray-500">수용인원: 최대 ${room.capacity}명/객실</p>
                      <p class="text-sm font-semibold text-blue-600 mt-1">${parseFloat(room.base_price).toLocaleString()}원/박</p>
                    </div>
                    <div class="flex flex-col gap-1">
                      <button onclick="editRoom('${property.id}', '${room.id}')"
                        class="text-blue-500 hover:text-blue-700 text-sm"
                        title="수정">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button onclick="deleteRoom('${property.id}', '${room.id}')"
                        class="text-red-500 hover:text-red-700 text-sm"
                        title="삭제">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
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
  document.getElementById('roomModalTitle').textContent = '객실 추가';
  document.getElementById('roomForm').reset();
  document.getElementById('roomPropertyId').value = propertyId;
  document.getElementById('roomId').value = '';
  document.getElementById('roomModal').classList.remove('hidden');
}

function closeRoomModal() {
  document.getElementById('roomModal').classList.add('hidden');
}

async function editRoom(propertyId, roomId) {
  try {
    const properties = await apiCall('/properties');
    const property = properties.find(p => p.id === propertyId);

    if (!property) {
      showToast('숙소를 찾을 수 없습니다.', 'error');
      return;
    }

    const room = property.rooms.find(r => r.id === roomId);

    if (!room) {
      showToast('객실을 찾을 수 없습니다.', 'error');
      return;
    }

    document.getElementById('roomModalTitle').textContent = '객실 수정';
    document.getElementById('roomPropertyId').value = propertyId;
    document.getElementById('roomId').value = roomId;
    document.getElementById('roomName').value = room.name;
    document.getElementById('roomType').value = room.type;
    document.getElementById('roomTotalRooms').value = room.total_rooms || 1;
    document.getElementById('roomCapacity').value = room.capacity;
    document.getElementById('roomBasePrice').value = room.base_price;
    document.getElementById('roomModal').classList.remove('hidden');
  } catch (error) {
    showToast('객실 정보를 불러오는데 실패했습니다.', 'error');
  }
}

async function saveRoom(event) {
  event.preventDefault();

  const propertyId = document.getElementById('roomPropertyId').value;
  const roomId = document.getElementById('roomId').value;
  const data = {
    name: document.getElementById('roomName').value,
    type: document.getElementById('roomType').value,
    totalRooms: parseInt(document.getElementById('roomTotalRooms').value),
    capacity: parseInt(document.getElementById('roomCapacity').value),
    basePrice: parseFloat(document.getElementById('roomBasePrice').value)
  };

  try {
    if (roomId) {
      // Update existing room
      await apiCall(`/properties?propertyId=${propertyId}&roomId=${roomId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('객실이 수정되었습니다.');
    } else {
      // Create new room
      await apiCall(`/properties?propertyId=${propertyId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('객실이 추가되었습니다.');
    }
    closeRoomModal();
    await refreshProperties();
  } catch (error) {
    showToast('저장 중 오류가 발생했습니다.', 'error');
  }
}

async function deleteRoom(propertyId, roomId) {
  if (!confirm('이 객실을 삭제하시겠습니까?\n\n참고: 예약 내역이 있는 객실은 삭제할 수 없습니다.')) return;

  try {
    await apiCall(`/properties?propertyId=${propertyId}&roomId=${roomId}`, { method: 'DELETE' });
    showToast('객실이 삭제되었습니다.', 'success');
    await refreshProperties();
  } catch (error) {
    console.error('Delete room error:', error);
    // Error message is already shown by apiCall
    // Just prevent further action
  }
}

function copyInviteCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast('초대 코드가 복사되었습니다', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('복사 실패', 'error');
  });
}

async function managePropertyStaff(propertyId, propertyName) {
  // Create modal HTML if it doesn't exist
  let modal = document.getElementById('staffManagementModal');
  if (!modal) {
    const modalHTML = `
      <div id="staffManagementModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold" id="staffModalPropertyName"></h2>
            <button onclick="closeStaffModal()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <input type="hidden" id="currentPropertyId">

          <!-- 스태프 목록 -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-4">스태프 목록</h3>
            <div id="propertyStaffList">
              <div class="text-center py-4 text-gray-500">로딩중...</div>
            </div>
          </div>

          <!-- 스태프 추가 -->
          <div class="border-t pt-6">
            <h3 class="text-lg font-semibold mb-4">스태프 추가</h3>
            <form id="addStaffForm" onsubmit="addStaffToProperty(event)">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="md:col-span-2">
                  <label class="block text-gray-700 text-sm font-bold mb-2">이메일</label>
                  <input type="email" id="newStaffEmail" required placeholder="staff@example.com"
                    class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">역할</label>
                  <select id="newStaffRole" required
                    class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="STAFF">스태프</option>
                    <option value="ADMIN">관리자</option>
                  </select>
                </div>
              </div>
              <button type="submit" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                스태프 추가
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('staffManagementModal');
  }

  // Set property info
  document.getElementById('staffModalPropertyName').textContent = `${propertyName} - 스태프 관리`;
  document.getElementById('currentPropertyId').value = propertyId;

  // Load staff list
  await loadPropertyStaff(propertyId);

  // Show modal
  modal.classList.remove('hidden');
}

function closeStaffModal() {
  document.getElementById('staffManagementModal').classList.add('hidden');
  document.getElementById('addStaffForm').reset();
}

async function loadPropertyStaff(propertyId) {
  try {
    const staff = await apiCall(`/properties/staff?propertyId=${propertyId}`);
    renderPropertyStaffList(staff);
  } catch (error) {
    console.error('Failed to load property staff:', error);
    document.getElementById('propertyStaffList').innerHTML = `
      <div class="text-center py-4 text-red-500">스태프 목록 로딩 실패</div>
    `;
  }
}

function renderPropertyStaffList(staff) {
  const container = document.getElementById('propertyStaffList');

  if (!staff || staff.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>이 숙소에 배정된 스태프가 없습니다.</p>
        <p class="text-sm mt-2">아래 양식으로 스태프를 추가하거나, 초대 코드를 공유하세요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">이메일</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">역할</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">추가일</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${staff.map(s => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">${s.email}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded ${
                  s.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }">
                  ${s.role === 'ADMIN' ? '관리자' : '스태프'}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded ${
                  s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                  ${s.status === 'ACTIVE' ? '활성' : '비활성'}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${s.created_at ? new Date(s.created_at).toLocaleDateString('ko-KR') : '-'}
              </td>
              <td class="px-4 py-3 text-center">
                ${s.status === 'ACTIVE' ? `
                  <button onclick="removeStaffFromProperty('${s.property_id}', '${s.user_id}', '${s.email}')"
                    class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                    제거
                  </button>
                ` : `
                  <span class="text-xs text-gray-500">비활성</span>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function addStaffToProperty(event) {
  event.preventDefault();

  const propertyId = document.getElementById('currentPropertyId').value;
  const email = document.getElementById('newStaffEmail').value;
  const role = document.getElementById('newStaffRole').value;

  try {
    // First, find user by email
    const response = await apiCall('/admin/find-user-by-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (!response || !response.userId) {
      showToast('해당 이메일로 가입된 사용자를 찾을 수 없습니다.', 'error');
      return;
    }

    // Add staff to property
    await apiCall(`/properties/staff?propertyId=${propertyId}`, {
      method: 'POST',
      body: JSON.stringify({
        userId: response.userId,
        role
      })
    });

    showToast('스태프가 추가되었습니다.', 'success');
    document.getElementById('addStaffForm').reset();
    await loadPropertyStaff(propertyId);
  } catch (error) {
    console.error('Failed to add staff:', error);
    if (error.message.includes('already assigned')) {
      showToast('이미 이 숙소에 배정된 사용자입니다.', 'error');
    } else {
      showToast('스태프 추가 실패', 'error');
    }
  }
}

async function removeStaffFromProperty(propertyId, userId, email) {
  if (!confirm(`${email}을(를) 이 숙소에서 제거하시겠습니까?`)) {
    return;
  }

  try {
    await apiCall(`/properties/staff?propertyId=${propertyId}&userId=${userId}`, {
      method: 'DELETE'
    });

    showToast('스태프가 제거되었습니다.', 'success');
    await loadPropertyStaff(propertyId);
  } catch (error) {
    console.error('Failed to remove staff:', error);
    showToast('스태프 제거 실패', 'error');
  }
}

// 라우터에 등록
router.register('properties', loadProperties);
