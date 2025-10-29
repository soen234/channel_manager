// 재고/요금 관리 페이지
async function loadInventory() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-4 md:mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">재고/요금 관리</h1>
      <p class="text-sm md:text-base text-gray-600">객실별 재고 및 요금을 관리합니다</p>
    </div>

    <!-- 객실 선택 -->
    <div class="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">숙소 선택</label>
          <select id="selectedProperty" onchange="loadPropertyRooms()" class="w-full px-3 py-2 border rounded-lg">
            <option value="">-- 숙소를 선택하세요 --</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">객실 선택</label>
          <select id="selectedRoom" onchange="loadInventoryData()" class="w-full px-3 py-2 border rounded-lg">
            <option value="">-- 객실을 선택하세요 --</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">조회 월</label>
          <input type="month" id="selectedMonth" onchange="loadInventoryData()"
            class="w-full px-3 py-2 border rounded-lg" value="${getCurrentMonth()}">
        </div>
        <div class="flex items-end">
          <button onclick="syncInventoryWithReservations()"
            class="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            id="syncInventoryBtn"
            title="페이지 로드 시 자동으로 동기화됩니다">
            🔄 수동 동기화
          </button>
        </div>
      </div>
    </div>

    <!-- 재고/요금 테이블 -->
    <div id="inventoryContent" class="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div class="text-center py-8 text-gray-500">
        숙소와 객실을 선택하세요
      </div>
    </div>
  `;

  // Wait for DOM to be fully rendered
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
  await loadPropertyList();
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function loadPropertyList() {
  try {
    const properties = await apiCall('/properties');
    const select = document.getElementById('selectedProperty');

    if (!select) {
      console.error('selectedProperty element not found');
      return;
    }

    select.innerHTML = '<option value="">-- 숙소를 선택하세요 --</option>' +
      properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

async function loadPropertyRooms() {
  const propertySelect = document.getElementById('selectedProperty');
  const roomSelect = document.getElementById('selectedRoom');
  const inventoryContent = document.getElementById('inventoryContent');

  if (!propertySelect || !roomSelect || !inventoryContent) {
    console.error('Required form elements not found');
    return;
  }

  const propertyId = propertySelect.value;

  if (!propertyId) {
    roomSelect.innerHTML = '<option value="">-- 객실을 선택하세요 --</option>';
    inventoryContent.innerHTML = `
      <div class="text-center py-8 text-gray-500">숙소와 객실을 선택하세요</div>
    `;
    return;
  }

  try {
    const property = await apiCall(`/properties?id=${propertyId}`);
    roomSelect.innerHTML = '<option value="">-- 객실을 선택하세요 --</option>' +
      property.rooms.map(r => `<option value="${r.id}">${r.name} (${r.type})</option>`).join('');
  } catch (error) {
    console.error('Failed to load rooms:', error);
  }
}

async function loadInventoryData() {
  const roomId = document.getElementById('selectedRoom').value;
  const month = document.getElementById('selectedMonth').value;

  if (!roomId || !month) return;

  const [year, monthNum] = month.split('-');
  const startDate = `${year}-${monthNum}-01`;
  const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

  try {
    const [inventory, pricing, room] = await Promise.all([
      apiCall(`/inventory/room/${roomId}?startDate=${startDate}&endDate=${endDate}`),
      apiCall(`/pricing/room/${roomId}?startDate=${startDate}&endDate=${endDate}`),
      apiCall(`/properties`).then(props => {
        for (const p of props) {
          const r = p.rooms?.find(room => room.id === roomId);
          if (r) return r;
        }
        return null;
      })
    ]);

    renderInventoryTable(inventory, pricing, room, startDate, endDate);

    // 백그라운드에서 재고 동기화
    syncInventoryInBackground(startDate, endDate);
  } catch (error) {
    console.error('Failed to load inventory data:', error);
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

function renderInventoryTable(inventory, pricing, room, startDate, endDate) {
  const container = document.getElementById('inventoryContent');

  // 날짜 배열 생성
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d).toISOString().split('T')[0]);
  }

  // 재고/요금 맵 생성
  const inventoryMap = {};
  inventory.forEach(inv => {
    const date = new Date(inv.date).toISOString().split('T')[0];
    inventoryMap[date] = inv;
  });

  const pricingMap = {};
  pricing.forEach(price => {
    const date = new Date(price.date).toISOString().split('T')[0];
    pricingMap[date] = price;
  });

  container.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">재고/요금 현황 - ${room?.name || '객실'}</h2>
      <div class="space-x-2">
        <button onclick="bulkUpdate('inventory')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          재고 일괄 설정
        </button>
        <button onclick="bulkUpdate('pricing')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          요금 일괄 설정
        </button>
        <button onclick="syncInventoryAndPricing()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          채널 동기화
        </button>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50">날짜</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">요일</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">재고</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">요금 ($)</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${dates.map(date => {
            const inv = inventoryMap[date];
            const price = pricingMap[date];
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(date).getDay()];
            const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;

            return `
              <tr class="${isWeekend ? 'bg-blue-50' : ''}">
                <td class="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 ${isWeekend ? 'bg-blue-50' : 'bg-white'}">
                  ${date}
                </td>
                <td class="px-4 py-3 text-sm ${isWeekend ? 'text-red-600 font-semibold' : 'text-gray-700'}">
                  ${dayOfWeek}
                </td>
                <td class="px-4 py-3 text-sm text-center">
                  <input type="number" value="${inv?.available || 0}" min="0" max="999"
                    data-date="${date}" data-type="inventory"
                    onchange="updateInventory('${date}', this.value)"
                    class="w-20 px-2 py-1 border rounded text-center ${inv?.available > 0 ? 'bg-green-50' : 'bg-red-50'}">
                </td>
                <td class="px-4 py-3 text-sm text-center">
                  <input type="number" value="${price?.price || room?.base_price || 0}" min="0" step="1"
                    data-date="${date}" data-type="pricing"
                    onchange="updatePricing('${date}', this.value)"
                    class="w-28 px-2 py-1 border rounded text-center">
                </td>
                <td class="px-4 py-3 text-sm text-center">
                  <button onclick="copyToWeek('${date}')" class="text-blue-600 hover:text-blue-800 text-xs">
                    → 주간복사
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function updateInventory(date, available) {
  const roomId = document.getElementById('selectedRoom').value;

  if (!roomId) {
    showToast('객실을 선택해주세요', 'error');
    return;
  }

  try {
    await apiCall('/inventory/update', {
      method: 'POST',
      body: JSON.stringify({
        room_id: roomId,
        date: date,
        available: parseInt(available)
      })
    });

    showToast('재고가 업데이트되었습니다', 'success');
  } catch (error) {
    console.error('Inventory update error:', error);
    showToast('재고 업데이트 실패: ' + (error.message || ''), 'error');
  }
}

async function updatePricing(date, price) {
  const roomId = document.getElementById('selectedRoom').value;

  if (!roomId) {
    showToast('객실을 선택해주세요', 'error');
    return;
  }

  try {
    await apiCall('/pricing/update', {
      method: 'POST',
      body: JSON.stringify({
        room_id: roomId,
        date: date,
        price: parseFloat(price)
      })
    });

    showToast('요금이 업데이트되었습니다', 'success');
  } catch (error) {
    console.error('Pricing update error:', error);
    showToast('요금 업데이트 실패: ' + (error.message || ''), 'error');
  }
}

async function bulkUpdate(type) {
  showToast('일괄 업데이트 기능은 준비 중입니다.', 'error');
}

async function syncInventoryAndPricing() {
  showToast('채널 동기화 기능은 준비 중입니다.', 'error');
}

function copyToWeek(startDate) {
  showToast('주간복사 기능은 준비 중입니다.', 'error');
}

async function syncInventoryWithReservations() {
  const syncBtn = document.getElementById('syncInventoryBtn');
  const month = document.getElementById('selectedMonth').value;

  if (!month) {
    showToast('조회 월을 선택해주세요', 'error');
    return;
  }

  // Calculate date range for selected month
  const [year, monthNum] = month.split('-');
  const startDate = `${year}-${monthNum}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${year}-${monthNum}-${lastDay}`;

  try {
    syncBtn.disabled = true;
    syncBtn.textContent = '동기화 중...';

    const result = await apiCall('/inventory/sync', {
      method: 'POST',
      body: JSON.stringify({
        startDate: startDate,
        endDate: endDate
      })
    });

    showToast(`재고가 동기화되었습니다 (${result.updated}건 업데이트)`, 'success');

    // Reload inventory data if a room is selected
    const roomId = document.getElementById('selectedRoom').value;
    if (roomId) {
      await loadInventoryData();
    }
  } catch (error) {
    console.error('Inventory sync error:', error);
    showToast('재고 동기화 실패: ' + (error.message || ''), 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = '🔄 재고 동기화';
  }
}

router.register('inventory', loadInventory);
