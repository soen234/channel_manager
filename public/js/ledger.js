// 장부 페이지
async function loadLedger() {
  const container = document.getElementById('mainContent');

  const currentMonth = getCurrentYearMonth();

  container.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">장부</h1>
      <p class="text-gray-600">월별 매출, 비용 및 예약율 현황</p>
    </div>

    <!-- 탭 메뉴 -->
    <div class="bg-white rounded-lg shadow-md mb-6">
      <div class="border-b">
        <nav class="flex">
          <button onclick="switchLedgerTab('revenue')" id="tab-revenue"
            class="ledger-tab px-6 py-3 font-semibold text-blue-600 border-b-2 border-blue-600">
            매출현황
          </button>
          <button onclick="switchLedgerTab('expenses')" id="tab-expenses"
            class="ledger-tab px-6 py-3 font-semibold text-gray-600 hover:text-gray-800">
            비용관리
          </button>
          <button onclick="switchLedgerTab('summary')" id="tab-summary"
            class="ledger-tab px-6 py-3 font-semibold text-gray-600 hover:text-gray-800">
            월간요약
          </button>
        </nav>
      </div>

      <div class="p-6">
        <div class="flex items-center gap-4 mb-4">
          <label class="text-gray-700 font-semibold">조회 월:</label>
          <input type="month" id="ledgerMonth" value="${currentMonth}"
            onchange="loadLedgerData()"
            class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <button onclick="exportLedger()" class="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            엑셀 내보내기
          </button>
        </div>
      </div>
    </div>

    <!-- 탭 콘텐츠 -->
    <div id="ledgerContent">
      <div class="text-center py-8 text-gray-500">
        로딩 중...
      </div>
    </div>
  `;

  await new Promise(resolve => setTimeout(resolve, 100));
  window.currentLedgerTab = 'revenue';
  await loadLedgerData();
}

function switchLedgerTab(tab) {
  window.currentLedgerTab = tab;

  // Update tab styling
  document.querySelectorAll('.ledger-tab').forEach(btn => {
    btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    btn.classList.add('text-gray-600');
  });

  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.remove('text-gray-600');
    activeTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
  }

  loadLedgerData();
}

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function loadLedgerData() {
  const monthInput = document.getElementById('ledgerMonth');
  if (!monthInput) return;

  const yearMonth = monthInput.value;
  if (!yearMonth) return;

  const [year, month] = yearMonth.split('-');
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  const tab = window.currentLedgerTab || 'revenue';

  try {
    if (tab === 'revenue') {
      // Fetch all reservations for the month
      const reservations = await apiCall(`/reservations?startDate=${startDate}&endDate=${endDate}`);

      // Fetch properties and rooms to get room types
      const properties = await apiCall('/properties');

      renderLedgerTable(reservations, properties, year, month);
    } else if (tab === 'expenses') {
      renderExpensesForm(yearMonth);
    } else if (tab === 'summary') {
      // Fetch both revenue and expenses
      const reservations = await apiCall(`/reservations?startDate=${startDate}&endDate=${endDate}`);
      const properties = await apiCall('/properties');
      renderMonthlySummary(reservations, properties, year, month, yearMonth);
    }
  } catch (error) {
    console.error('Failed to load ledger data:', error);
    showToast('장부 데이터 로딩 실패', 'error');
  }
}

function renderLedgerTable(reservations, properties, year, month) {
  const container = document.getElementById('ledgerContent');
  if (!container) return;

  // Build room map with type information
  const roomMap = {};
  const dormRoomIds = new Set();
  let totalRoomCount = 0;
  let dormRoomCount = 0;

  properties.forEach(property => {
    if (property.rooms) {
      property.rooms.forEach(room => {
        roomMap[room.id] = room;
        const isDorm = room.type.includes('도미토리') || room.type.includes('도미') || room.type.toLowerCase().includes('dorm');
        if (isDorm) {
          dormRoomIds.add(room.id);
          dormRoomCount += (room.total_rooms || 1);
        }
        totalRoomCount += (room.total_rooms || 1);
      });
    }
  });

  const nonDormRoomCount = totalRoomCount - dormRoomCount;

  // Get days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates = [];
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(day);
  }

  // Initialize daily stats
  const dailyStats = {};
  dates.forEach(day => {
    dailyStats[day] = {
      dormRevenue: 0,
      nonDormRevenue: 0,
      channels: {
        BOOKING_COM: 0,
        YANOLJA: 0,
        AIRBNB: 0,
        DIRECT: 0
      },
      paymentMethods: {
        card: 0,
        transfer: 0,
        cash: 0,
        paypal: 0,
        toss: 0
      },
      dormOccupied: 0,
      nonDormOccupied: 0
    };
  });

  // Process reservations (exclude cancelled)
  reservations.forEach(res => {
    // Skip cancelled reservations
    if (res.status === 'CANCELLED') {
      return;
    }

    const checkIn = new Date(res.check_in);
    const checkOut = new Date(res.check_out);
    const isDorm = dormRoomIds.has(res.room_id);
    const revenue = parseFloat(res.total_price) || 0;

    // Distribute revenue across nights
    let nights = 0;
    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() == year && d.getMonth() + 1 == month) {
        nights++;
      }
    }

    const revenuePerNight = nights > 0 ? revenue / nights : 0;

    // Add to daily stats
    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() == year && d.getMonth() + 1 == month) {
        const day = d.getDate();

        if (isDorm) {
          dailyStats[day].dormRevenue += revenuePerNight;
          dailyStats[day].dormOccupied += 1;
        } else {
          dailyStats[day].nonDormRevenue += revenuePerNight;
          dailyStats[day].nonDormOccupied += 1;
        }

        // Channel revenue
        const channel = res.channel || 'DIRECT';
        if (dailyStats[day].channels[channel] !== undefined) {
          dailyStats[day].channels[channel] += revenuePerNight;
        } else {
          dailyStats[day].channels.DIRECT += revenuePerNight;
        }

        // Payment method (default to card for now - can be extended)
        dailyStats[day].paymentMethods.card += revenuePerNight;
      }
    }
  });

  // Calculate totals
  let totalDormRevenue = 0;
  let totalNonDormRevenue = 0;
  let totalChannels = { BOOKING_COM: 0, YANOLJA: 0, AIRBNB: 0, DIRECT: 0 };
  let totalPaymentMethods = { card: 0, transfer: 0, cash: 0, paypal: 0, toss: 0 };
  let totalDormOccupied = 0;
  let totalNonDormOccupied = 0;

  dates.forEach(day => {
    const stats = dailyStats[day];
    totalDormRevenue += stats.dormRevenue;
    totalNonDormRevenue += stats.nonDormRevenue;
    totalDormOccupied += stats.dormOccupied;
    totalNonDormOccupied += stats.nonDormOccupied;

    Object.keys(totalChannels).forEach(channel => {
      totalChannels[channel] += stats.channels[channel];
    });

    Object.keys(totalPaymentMethods).forEach(method => {
      totalPaymentMethods[method] += stats.paymentMethods[method];
    });
  });

  const dormOccupancyRate = dormRoomCount > 0
    ? ((totalDormOccupied / (dormRoomCount * daysInMonth)) * 100).toFixed(1)
    : 0;
  const nonDormOccupancyRate = nonDormRoomCount > 0
    ? ((totalNonDormOccupied / (nonDormRoomCount * daysInMonth)) * 100).toFixed(1)
    : 0;
  const totalOccupancyRate = totalRoomCount > 0
    ? (((totalDormOccupied + totalNonDormOccupied) / (totalRoomCount * daysInMonth)) * 100).toFixed(1)
    : 0;

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-sm">
        <thead class="bg-gray-50 sticky top-0">
          <tr>
            <th class="border px-3 py-2 text-left font-semibold text-gray-700">날짜</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">도미토리<br/>매출</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">일반객실<br/>매출</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">부킹닷컴</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">야놀자</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">에어비앤비</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">직접예약</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">현장카드</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">계좌이체</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">현금</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">페이팔</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">토스</th>
            <th class="border px-3 py-2 text-right font-semibold text-blue-700 bg-blue-50">합계</th>
          </tr>
        </thead>
        <tbody>
          ${dates.map(day => {
            const stats = dailyStats[day];
            const dayTotal = stats.dormRevenue + stats.nonDormRevenue;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(dateStr).getDay()];
            const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

            return `
              <tr class="hover:bg-gray-50 ${isWeekend ? 'bg-blue-50' : ''}">
                <td class="border px-3 py-2 font-medium ${isWeekend ? 'text-red-600' : 'text-gray-700'}">
                  ${month}/${String(day).padStart(2, '0')} (${dayOfWeek})
                </td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.dormRevenue)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.nonDormRevenue)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.channels.BOOKING_COM)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.channels.YANOLJA)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.channels.AIRBNB)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.channels.DIRECT)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.card)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.transfer)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.cash)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.paypal)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.toss)}</td>
                <td class="border px-3 py-2 text-right font-bold text-blue-700 bg-blue-50">${formatCurrency(dayTotal)}</td>
              </tr>
            `;
          }).join('')}
          <tr class="bg-gray-100 font-bold">
            <td class="border px-3 py-2">합계</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalDormRevenue)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalNonDormRevenue)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalChannels.BOOKING_COM)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalChannels.YANOLJA)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalChannels.AIRBNB)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalChannels.DIRECT)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.card)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.transfer)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.cash)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.paypal)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.toss)}</td>
            <td class="border px-3 py-2 text-right text-lg text-blue-700 bg-blue-100">${formatCurrency(totalDormRevenue + totalNonDormRevenue)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 예약율 요약 -->
    <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div class="text-sm text-purple-600 font-semibold">도미토리 예약율</div>
        <div class="text-2xl font-bold text-purple-700">${dormOccupancyRate}%</div>
        <div class="text-xs text-purple-500 mt-1">${dormRoomCount}개 객실 × ${daysInMonth}일</div>
      </div>
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="text-sm text-green-600 font-semibold">일반객실 예약율</div>
        <div class="text-2xl font-bold text-green-700">${nonDormOccupancyRate}%</div>
        <div class="text-xs text-green-500 mt-1">${nonDormRoomCount}개 객실 × ${daysInMonth}일</div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="text-sm text-blue-600 font-semibold">전체 예약율</div>
        <div class="text-2xl font-bold text-blue-700">${totalOccupancyRate}%</div>
        <div class="text-xs text-blue-500 mt-1">${totalRoomCount}개 객실 × ${daysInMonth}일</div>
      </div>
    </div>
  `;
}

function formatCurrency(amount) {
  if (!amount || amount === 0) return '-';
  return Math.round(amount).toLocaleString();
}

function renderExpensesForm(yearMonth) {
  const container = document.getElementById('ledgerContent');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-bold mb-4 text-gray-800">월별 고정 비용</h3>
      <p class="text-sm text-gray-600 mb-6">아래 항목들을 입력하면 자동으로 집계됩니다.</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">월세</label>
          <input type="number" id="exp-rent" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">인터넷 비용</label>
          <input type="number" id="exp-internet" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">화재보험료</label>
          <input type="number" id="exp-fire-insurance" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">정수기</label>
          <input type="number" id="exp-water-purifier" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">세탁비</label>
          <input type="number" id="exp-laundry" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">방역비</label>
          <input type="number" id="exp-pest-control" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">세무사 대리 비용</label>
          <input type="number" id="exp-tax-service" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">4대 보험료</label>
          <input type="number" id="exp-social-insurance" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">전기요금</label>
          <input type="number" id="exp-electricity" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">가스요금</label>
          <input type="number" id="exp-gas" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">수도요금</label>
          <input type="number" id="exp-water" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">채널매니저 비용</label>
          <input type="number" id="exp-channel-manager" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <button onclick="saveExpenses('${yearMonth}')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          저장
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 class="text-xl font-bold mb-4 text-gray-800">수수료 설정</h3>
      <p class="text-sm text-gray-600 mb-6">채널별 수수료율 및 기타 수수료를 설정합니다.</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">네이버 수수료 (%)</label>
          <input type="number" id="comm-naver" placeholder="3" step="0.1" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">부킹닷컴 수수료 (%)</label>
          <input type="number" id="comm-booking" placeholder="18" step="0.1" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">야놀자 수수료 (%)</label>
          <input type="number" id="comm-yanolja" placeholder="16" step="0.1" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">에어비앤비 수수료 (%)</label>
          <input type="number" id="comm-airbnb" placeholder="5" step="0.1" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">카드 수수료 (%)</label>
          <input type="number" id="comm-card" placeholder="2.5" step="0.1" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">페이팔 수수료 (%)</label>
          <input type="number" id="comm-paypal" placeholder="4.4" step="0.1" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">토스 수수료 (%)</label>
          <input type="number" id="comm-toss" placeholder="2.8" step="0.1" class="w-full px-3 py-2 border rounded-lg">
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <button onclick="saveCommissionRates()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          수수료율 저장
        </button>
      </div>
    </div>
  `;

  // Load existing data if any
  loadExistingExpenses(yearMonth);
}

async function loadExistingExpenses(yearMonth) {
  try {
    // This would load from API when implemented
    showToast('비용 데이터는 준비 중입니다.', 'error');
  } catch (error) {
    console.error('Failed to load expenses:', error);
  }
}

function saveExpenses(yearMonth) {
  const expenses = {
    year_month: yearMonth,
    rent: parseFloat(document.getElementById('exp-rent').value) || 0,
    internet: parseFloat(document.getElementById('exp-internet').value) || 0,
    fire_insurance: parseFloat(document.getElementById('exp-fire-insurance').value) || 0,
    water_purifier: parseFloat(document.getElementById('exp-water-purifier').value) || 0,
    laundry: parseFloat(document.getElementById('exp-laundry').value) || 0,
    pest_control: parseFloat(document.getElementById('exp-pest-control').value) || 0,
    tax_service: parseFloat(document.getElementById('exp-tax-service').value) || 0,
    social_insurance: parseFloat(document.getElementById('exp-social-insurance').value) || 0,
    electricity: parseFloat(document.getElementById('exp-electricity').value) || 0,
    gas: parseFloat(document.getElementById('exp-gas').value) || 0,
    water: parseFloat(document.getElementById('exp-water').value) || 0,
    channel_manager: parseFloat(document.getElementById('exp-channel-manager').value) || 0
  };

  console.log('Saving expenses:', expenses);
  showToast('비용 저장 기능은 API 연결 후 활성화됩니다.', 'error');
}

function saveCommissionRates() {
  const rates = {
    NAVER: parseFloat(document.getElementById('comm-naver').value) || 3,
    BOOKING_COM: parseFloat(document.getElementById('comm-booking').value) || 18,
    YANOLJA: parseFloat(document.getElementById('comm-yanolja').value) || 16,
    AIRBNB: parseFloat(document.getElementById('comm-airbnb').value) || 5,
    card: parseFloat(document.getElementById('comm-card').value) || 2.5,
    paypal: parseFloat(document.getElementById('comm-paypal').value) || 4.4,
    toss: parseFloat(document.getElementById('comm-toss').value) || 2.8
  };

  console.log('Saving commission rates:', rates);
  showToast('수수료율 저장 기능은 API 연결 후 활성화됩니다.', 'error');
}

function renderMonthlySummary(reservations, properties, year, month, yearMonth) {
  const container = document.getElementById('ledgerContent');
  if (!container) return;

  // Calculate revenue
  const roomMap = {};
  const dormRoomIds = new Set();
  let totalRoomCount = 0;
  let dormRoomCount = 0;

  properties.forEach(property => {
    if (property.rooms) {
      property.rooms.forEach(room => {
        roomMap[room.id] = room;
        const isDorm = room.type.includes('도미토리') || room.type.includes('도미') || room.type.toLowerCase().includes('dorm');
        if (isDorm) {
          dormRoomIds.add(room.id);
          dormRoomCount += (room.total_rooms || 1);
        }
        totalRoomCount += (room.total_rooms || 1);
      });
    }
  });

  const nonDormRoomCount = totalRoomCount - dormRoomCount;
  const daysInMonth = new Date(year, month, 0).getDate();

  let totalRevenue = 0;
  let dormRevenue = 0;
  let nonDormRevenue = 0;
  let channelRevenue = {
    BOOKING_COM: 0,
    YANOLJA: 0,
    AIRBNB: 0,
    DIRECT: 0
  };
  let totalDormOccupied = 0;
  let totalNonDormOccupied = 0;

  // Calculate revenue from reservations (exclude cancelled)
  const activeReservations = reservations.filter(res => res.status !== 'CANCELLED');

  activeReservations.forEach(res => {
    const checkIn = new Date(res.check_in);
    const checkOut = new Date(res.check_out);
    const isDorm = dormRoomIds.has(res.room_id);
    const revenue = parseFloat(res.total_price) || 0;

    totalRevenue += revenue;

    if (isDorm) {
      dormRevenue += revenue;
    } else {
      nonDormRevenue += revenue;
    }

    // Channel revenue
    const channel = res.channel || 'DIRECT';
    if (channelRevenue[channel] !== undefined) {
      channelRevenue[channel] += revenue;
    } else {
      channelRevenue.DIRECT += revenue;
    }

    // Count occupied room-nights
    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() == year && d.getMonth() + 1 == month) {
        if (isDorm) {
          totalDormOccupied += 1;
        } else {
          totalNonDormOccupied += 1;
        }
      }
    }
  });

  // Calculate expenses (using default commission rates for now)
  const commissionRates = {
    BOOKING_COM: 18,
    YANOLJA: 16,
    AIRBNB: 5,
    DIRECT: 0
  };

  let totalCommission = 0;
  Object.keys(channelRevenue).forEach(channel => {
    const rate = commissionRates[channel] || 0;
    totalCommission += channelRevenue[channel] * (rate / 100);
  });

  // VAT (10% on card payments - simplified)
  const vatRate = 10;
  const estimatedVAT = totalRevenue * (vatRate / 100);

  // Total expenses (commission + VAT + fixed costs placeholder)
  const fixedCostsPlaceholder = 0; // Would come from API
  const totalExpenses = totalCommission + estimatedVAT + fixedCostsPlaceholder;

  // Net profit
  const netProfit = totalRevenue - totalExpenses;

  // Occupancy rates
  const dormOccupancyRate = dormRoomCount > 0
    ? ((totalDormOccupied / (dormRoomCount * daysInMonth)) * 100).toFixed(1)
    : 0;
  const nonDormOccupancyRate = nonDormRoomCount > 0
    ? ((totalNonDormOccupied / (nonDormRoomCount * daysInMonth)) * 100).toFixed(1)
    : 0;
  const totalOccupancyRate = totalRoomCount > 0
    ? (((totalDormOccupied + totalNonDormOccupied) / (totalRoomCount * daysInMonth)) * 100).toFixed(1)
    : 0;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- 주요 지표 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-bold mb-4 text-gray-800">${year}년 ${month}월 월간 요약</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div class="text-sm text-blue-600 font-semibold mb-2">총 매출</div>
            <div class="text-3xl font-bold text-blue-700">${formatCurrency(totalRevenue)}원</div>
            <div class="text-xs text-blue-500 mt-2">예약 ${activeReservations.length}건 (취소 제외)</div>
          </div>

          <div class="border-2 border-red-200 rounded-lg p-6 bg-red-50">
            <div class="text-sm text-red-600 font-semibold mb-2">총 비용</div>
            <div class="text-3xl font-bold text-red-700">${formatCurrency(totalExpenses)}원</div>
            <div class="text-xs text-red-500 mt-2">수수료 + VAT</div>
          </div>

          <div class="border-2 border-green-200 rounded-lg p-6 bg-green-50">
            <div class="text-sm text-green-600 font-semibold mb-2">순이익</div>
            <div class="text-3xl font-bold text-green-700">${formatCurrency(netProfit)}원</div>
            <div class="text-xs text-green-500 mt-2">이익률 ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</div>
          </div>
        </div>
      </div>

      <!-- 매출 분석 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h4 class="text-lg font-bold mb-4 text-gray-800">매출 분석</h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 객실 유형별 매출 -->
          <div>
            <h5 class="font-semibold mb-3 text-gray-700">객실 유형별 매출</h5>
            <div class="space-y-2">
              <div class="flex justify-between items-center p-3 bg-purple-50 rounded">
                <span class="text-sm font-medium">도미토리</span>
                <span class="text-sm font-bold text-purple-700">${formatCurrency(dormRevenue)}원</span>
              </div>
              <div class="flex justify-between items-center p-3 bg-green-50 rounded">
                <span class="text-sm font-medium">일반 객실</span>
                <span class="text-sm font-bold text-green-700">${formatCurrency(nonDormRevenue)}원</span>
              </div>
            </div>
          </div>

          <!-- 채널별 매출 -->
          <div>
            <h5 class="font-semibold mb-3 text-gray-700">채널별 매출</h5>
            <div class="space-y-2">
              <div class="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span class="text-sm font-medium">부킹닷컴</span>
                <span class="text-sm font-bold text-blue-700">${formatCurrency(channelRevenue.BOOKING_COM)}원</span>
              </div>
              <div class="flex justify-between items-center p-3 bg-green-50 rounded">
                <span class="text-sm font-medium">야놀자</span>
                <span class="text-sm font-bold text-green-700">${formatCurrency(channelRevenue.YANOLJA)}원</span>
              </div>
              <div class="flex justify-between items-center p-3 bg-red-50 rounded">
                <span class="text-sm font-medium">에어비앤비</span>
                <span class="text-sm font-bold text-red-700">${formatCurrency(channelRevenue.AIRBNB)}원</span>
              </div>
              <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span class="text-sm font-medium">직접예약</span>
                <span class="text-sm font-bold text-gray-700">${formatCurrency(channelRevenue.DIRECT)}원</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 비용 분석 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h4 class="text-lg font-bold mb-4 text-gray-800">비용 분석</h4>

        <div class="space-y-3">
          <div class="flex justify-between items-center p-3 bg-orange-50 rounded">
            <div>
              <span class="text-sm font-medium">채널 수수료</span>
              <div class="text-xs text-gray-500 mt-1">
                부킹 ${commissionRates.BOOKING_COM}% · 야놀자 ${commissionRates.YANOLJA}% · 에어비앤비 ${commissionRates.AIRBNB}%
              </div>
            </div>
            <span class="text-sm font-bold text-orange-700">${formatCurrency(totalCommission)}원</span>
          </div>

          <div class="flex justify-between items-center p-3 bg-yellow-50 rounded">
            <div>
              <span class="text-sm font-medium">부가가치세 (VAT)</span>
              <div class="text-xs text-gray-500 mt-1">매출의 ${vatRate}% (예상)</div>
            </div>
            <span class="text-sm font-bold text-yellow-700">${formatCurrency(estimatedVAT)}원</span>
          </div>

          <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
            <div>
              <span class="text-sm font-medium">고정 비용</span>
              <div class="text-xs text-gray-500 mt-1">월세, 인건비, 공과금 등</div>
            </div>
            <span class="text-sm font-bold text-gray-700">${formatCurrency(fixedCostsPlaceholder)}원</span>
          </div>
        </div>

        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="text-xs text-blue-600 mb-1">💡 안내</div>
          <div class="text-sm text-blue-700">
            고정 비용은 "비용관리" 탭에서 입력하실 수 있습니다. 입력하시면 자동으로 집계됩니다.
          </div>
        </div>
      </div>

      <!-- 예약율 현황 -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h4 class="text-lg font-bold mb-4 text-gray-800">예약율 현황</h4>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <div class="text-sm text-purple-600 font-semibold mb-1">도미토리 예약율</div>
            <div class="text-3xl font-bold text-purple-700">${dormOccupancyRate}%</div>
            <div class="text-xs text-purple-500 mt-2">
              ${totalDormOccupied} / ${dormRoomCount * daysInMonth} 룸나이트
            </div>
            <div class="mt-2">
              <div class="bg-purple-200 rounded-full h-2">
                <div class="bg-purple-600 rounded-full h-2" style="width: ${dormOccupancyRate}%"></div>
              </div>
            </div>
          </div>

          <div class="border border-green-200 rounded-lg p-4 bg-green-50">
            <div class="text-sm text-green-600 font-semibold mb-1">일반객실 예약율</div>
            <div class="text-3xl font-bold text-green-700">${nonDormOccupancyRate}%</div>
            <div class="text-xs text-green-500 mt-2">
              ${totalNonDormOccupied} / ${nonDormRoomCount * daysInMonth} 룸나이트
            </div>
            <div class="mt-2">
              <div class="bg-green-200 rounded-full h-2">
                <div class="bg-green-600 rounded-full h-2" style="width: ${nonDormOccupancyRate}%"></div>
              </div>
            </div>
          </div>

          <div class="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div class="text-sm text-blue-600 font-semibold mb-1">전체 예약율</div>
            <div class="text-3xl font-bold text-blue-700">${totalOccupancyRate}%</div>
            <div class="text-xs text-blue-500 mt-2">
              ${totalDormOccupied + totalNonDormOccupied} / ${totalRoomCount * daysInMonth} 룸나이트
            </div>
            <div class="mt-2">
              <div class="bg-blue-200 rounded-full h-2">
                <div class="bg-blue-600 rounded-full h-2" style="width: ${totalOccupancyRate}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function exportLedger() {
  showToast('엑셀 내보내기 기능은 준비 중입니다.', 'error');
}

router.register('ledger', loadLedger);
