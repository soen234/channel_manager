// 장부 페이지
async function loadLedger() {
  const container = document.getElementById('mainContent');

  const currentMonth = getCurrentYearMonth();

  container.innerHTML = `
    <div class="mb-4 md:mb-6">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800">장부</h1>
      <p class="text-sm md:text-base text-gray-600">월별 매출, 비용 및 예약율 현황</p>
    </div>

    <!-- 탭 메뉴 -->
    <div class="bg-white rounded-lg shadow-md mb-4 md:mb-6">
      <div class="border-b overflow-x-auto">
        <nav class="flex min-w-max sm:min-w-0">
          <button onclick="switchLedgerTab('revenue')" id="tab-revenue"
            class="ledger-tab px-4 md:px-6 py-2 md:py-3 font-semibold text-sm md:text-base text-blue-600 border-b-2 border-blue-600 whitespace-nowrap">
            매출현황
          </button>
          <button onclick="switchLedgerTab('expenses')" id="tab-expenses"
            class="ledger-tab px-4 md:px-6 py-2 md:py-3 font-semibold text-sm md:text-base text-gray-600 hover:text-gray-800 whitespace-nowrap">
            비용관리
          </button>
          <button onclick="switchLedgerTab('summary')" id="tab-summary"
            class="ledger-tab px-4 md:px-6 py-2 md:py-3 font-semibold text-sm md:text-base text-gray-600 hover:text-gray-800 whitespace-nowrap">
            월간요약
          </button>
        </nav>
      </div>

      <div class="p-4 md:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-4">
          <label class="text-gray-700 font-semibold text-sm md:text-base">조회 월:</label>
          <input type="month" id="ledgerMonth" value="${currentMonth}"
            onchange="loadLedgerData()"
            class="px-3 md:px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base">
          <button onclick="exportLedger()" class="sm:ml-auto px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm md:text-base whitespace-nowrap">
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
        platform: 0,  // 플랫폼 결제 (채널 예약)
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

        // Payment method
        // 채널 예약 (부킹닷컴, 야놀자, 에어비앤비 등)은 플랫폼 결제로 분류
        if (channel !== 'DIRECT') {
          dailyStats[day].paymentMethods.platform += revenuePerNight;
        } else {
          // 직접 예약만 실제 결제 방식으로 분류
          const paymentMethod = res.payment_method || 'card';
          if (dailyStats[day].paymentMethods[paymentMethod] !== undefined) {
            dailyStats[day].paymentMethods[paymentMethod] += revenuePerNight;
          } else {
            dailyStats[day].paymentMethods.card += revenuePerNight;
          }
        }
      }
    }
  });

  // Calculate totals
  let totalDormRevenue = 0;
  let totalNonDormRevenue = 0;
  let totalChannels = { BOOKING_COM: 0, YANOLJA: 0, AIRBNB: 0, DIRECT: 0 };
  let totalPaymentMethods = { platform: 0, card: 0, transfer: 0, cash: 0, paypal: 0, toss: 0 };
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
    <!-- 예약율 요약 -->
    <div class="mb-4 md:mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <th class="border px-3 py-2 text-right font-semibold text-purple-700 bg-purple-50">플랫폼</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">현장카드</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">계좌이체</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">현금</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">페이팔</th>
            <th class="border px-3 py-2 text-right font-semibold text-gray-700">토스</th>
            <th class="border px-3 py-2 text-right font-semibold text-blue-700 bg-blue-50">합계</th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-gray-100 font-bold">
            <td class="border px-3 py-2">합계</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalDormRevenue)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalNonDormRevenue)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalChannels.BOOKING_COM)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalChannels.YANOLJA)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalChannels.AIRBNB)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalChannels.DIRECT)}</td>
            <td class="border px-3 py-2 text-right text-purple-700 bg-purple-50">${formatCurrency(totalPaymentMethods.platform)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.card)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.transfer)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.cash)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.paypal)}</td>
            <td class="border px-3 py-2 text-right text-blue-700">${formatCurrency(totalPaymentMethods.toss)}</td>
            <td class="border px-3 py-2 text-right text-lg text-blue-700 bg-blue-100">${formatCurrency(totalDormRevenue + totalNonDormRevenue)}</td>
          </tr>
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
                <td class="border px-3 py-2 text-right bg-purple-50">${formatCurrency(stats.paymentMethods.platform)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.card)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.transfer)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.cash)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.paypal)}</td>
                <td class="border px-3 py-2 text-right">${formatCurrency(stats.paymentMethods.toss)}</td>
                <td class="border px-3 py-2 text-right font-bold text-blue-700 bg-blue-50">${formatCurrency(dayTotal)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
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
    <div class="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h3 class="text-xl font-bold mb-4 text-gray-800">월별 고정 비용</h3>
      <p class="text-sm text-gray-600 mb-6">아래 항목들을 입력하면 자동으로 집계됩니다.</p>

      <!-- 고정 항목 -->
      <div class="mb-6">
        <h4 class="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-500">
          고정 항목
          <span class="text-sm font-normal text-gray-500 ml-2">(매월 일정한 금액)</span>
        </h4>
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
            <label class="block text-sm font-semibold text-gray-700 mb-1">채널매니저 비용</label>
            <input type="number" id="exp-channel-manager" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
          </div>
        </div>
      </div>

      <!-- 변동 항목 -->
      <div class="mb-6">
        <h4 class="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-orange-500">
          변동 항목
          <span class="text-sm font-normal text-gray-500 ml-2">(매월 변동되는 금액)</span>
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">인건비</label>
            <input type="number" id="exp-labor" placeholder="0" class="w-full px-3 py-2 border rounded-lg">
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
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <button onclick="saveExpenses('${yearMonth}')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          저장
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-md p-4 md:p-6 mt-4 md:mt-6">
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

    <!-- 기타 비용 (비품 구매 등) -->
    <div class="bg-white rounded-lg shadow-md p-4 md:p-6 mt-4 md:mt-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 class="text-xl font-bold text-gray-800">기타 비용</h3>
          <p class="text-sm text-gray-600">비품 구매, 소모품 등 기타 비용을 입력합니다.</p>
        </div>
        <button onclick="showAddSupplyModal('${yearMonth}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 비용 추가
        </button>
      </div>

      <div id="supplyPurchasesList" class="mt-4">
        <div class="text-center py-4 text-gray-500">로딩 중...</div>
      </div>
    </div>
  `;

  // Load existing data if any
  loadExistingExpenses(yearMonth);
  loadSupplyPurchases(yearMonth);
}

async function loadExistingExpenses(yearMonth) {
  try {
    const fixedExpenses = await apiCall(`/expenses/fixed?year_month=${yearMonth}`);

    if (fixedExpenses) {
      // Populate form with existing data
      document.getElementById('exp-rent').value = fixedExpenses.rent || 0;
      document.getElementById('exp-internet').value = fixedExpenses.internet || 0;
      document.getElementById('exp-fire-insurance').value = fixedExpenses.fire_insurance || 0;
      document.getElementById('exp-water-purifier').value = fixedExpenses.water_purifier || 0;
      document.getElementById('exp-laundry').value = fixedExpenses.laundry || 0;
      document.getElementById('exp-pest-control').value = fixedExpenses.pest_control || 0;
      document.getElementById('exp-tax-service').value = fixedExpenses.tax_service || 0;
      document.getElementById('exp-channel-manager').value = fixedExpenses.channel_manager || 0;
      document.getElementById('exp-labor').value = fixedExpenses.labor || 0;
      document.getElementById('exp-social-insurance').value = fixedExpenses.social_insurance || 0;
      document.getElementById('exp-electricity').value = fixedExpenses.electricity || 0;
      document.getElementById('exp-gas').value = fixedExpenses.gas || 0;
      document.getElementById('exp-water').value = fixedExpenses.water || 0;
    }
  } catch (error) {
    console.error('Failed to load expenses:', error);
  }
}

async function saveExpenses(yearMonth) {
  const expenses = {
    rent: parseFloat(document.getElementById('exp-rent').value) || 0,
    internet: parseFloat(document.getElementById('exp-internet').value) || 0,
    fire_insurance: parseFloat(document.getElementById('exp-fire-insurance').value) || 0,
    water_purifier: parseFloat(document.getElementById('exp-water-purifier').value) || 0,
    laundry: parseFloat(document.getElementById('exp-laundry').value) || 0,
    pest_control: parseFloat(document.getElementById('exp-pest-control').value) || 0,
    tax_service: parseFloat(document.getElementById('exp-tax-service').value) || 0,
    channel_manager: parseFloat(document.getElementById('exp-channel-manager').value) || 0,
    labor: parseFloat(document.getElementById('exp-labor').value) || 0,
    social_insurance: parseFloat(document.getElementById('exp-social-insurance').value) || 0,
    electricity: parseFloat(document.getElementById('exp-electricity').value) || 0,
    gas: parseFloat(document.getElementById('exp-gas').value) || 0,
    water: parseFloat(document.getElementById('exp-water').value) || 0
  };

  try {
    await apiCall('/expenses/fixed', {
      method: 'POST',
      body: JSON.stringify({
        year_month: yearMonth,
        expenses
      })
    });

    showToast('고정비용이 저장되었습니다.', 'success');
  } catch (error) {
    console.error('Failed to save expenses:', error);
    showToast('비용 저장 실패', 'error');
  }
}

async function saveCommissionRates() {
  const channelRates = {
    NAVER: parseFloat(document.getElementById('comm-naver').value) || 3,
    BOOKING_COM: parseFloat(document.getElementById('comm-booking').value) || 18,
    YANOLJA: parseFloat(document.getElementById('comm-yanolja').value) || 16,
    AIRBNB: parseFloat(document.getElementById('comm-airbnb').value) || 5
  };

  const cardRate = parseFloat(document.getElementById('comm-card').value) || 2.5;
  const paypalRate = parseFloat(document.getElementById('comm-paypal').value) || 4.4;
  const tossRate = parseFloat(document.getElementById('comm-toss').value) || 2.8;

  try {
    await Promise.all([
      apiCall('/expenses/settings', {
        method: 'PUT',
        body: JSON.stringify({
          setting_key: 'channel_commission_rates',
          setting_value: channelRates
        })
      }),
      apiCall('/expenses/settings', {
        method: 'PUT',
        body: JSON.stringify({
          setting_key: 'card_commission_rate',
          setting_value: { rate: cardRate }
        })
      }),
      apiCall('/expenses/settings', {
        method: 'PUT',
        body: JSON.stringify({
          setting_key: 'paypal_commission_rate',
          setting_value: { rate: paypalRate }
        })
      }),
      apiCall('/expenses/settings', {
        method: 'PUT',
        body: JSON.stringify({
          setting_key: 'toss_commission_rate',
          setting_value: { rate: tossRate }
        })
      })
    ]);

    showToast('수수료율이 저장되었습니다.', 'success');
  } catch (error) {
    console.error('Failed to save commission rates:', error);
    showToast('수수료율 저장 실패', 'error');
  }
}

// Supply purchases (기타 비용) functions
async function loadSupplyPurchases(yearMonth) {
  try {
    const [year, month] = yearMonth.split('-');
    const supplies = await apiCall(`/expenses/supplies?year_month=${yearMonth}`);
    renderSupplyPurchasesList(supplies, yearMonth);
  } catch (error) {
    console.error('Failed to load supply purchases:', error);
    document.getElementById('supplyPurchasesList').innerHTML = `
      <div class="text-center py-4 text-red-500">기타 비용 로딩 실패</div>
    `;
  }
}

function renderSupplyPurchasesList(supplies, yearMonth) {
  const container = document.getElementById('supplyPurchasesList');
  if (!container) return;

  if (!supplies || supplies.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>등록된 기타 비용이 없습니다.</p>
        <p class="text-sm mt-2">비품 구매, 소모품 등 기타 비용을 추가하세요.</p>
      </div>
    `;
    return;
  }

  const totalAmount = supplies.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">구매일</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">품목</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">구매처</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">카테고리</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600">금액</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">메모</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${supplies.map(item => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">${item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('ko-KR') : '-'}</td>
              <td class="px-4 py-3 text-sm text-gray-900">${item.item_name || '-'}</td>
              <td class="px-4 py-3 text-sm text-gray-700">${item.store || '-'}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                  ${item.category || '기타'}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                ${parseFloat(item.amount || 0).toLocaleString()}원
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">${item.notes || '-'}</td>
              <td class="px-4 py-3 text-center">
                <button onclick="deleteSupplyPurchase('${item.id}', '${yearMonth}')"
                  class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                  삭제
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot class="bg-gray-50">
          <tr>
            <td colspan="4" class="px-4 py-3 text-right font-bold text-gray-800">합계</td>
            <td class="px-4 py-3 text-right font-bold text-blue-600">${totalAmount.toLocaleString()}원</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function showAddSupplyModal(yearMonth) {
  const modalHTML = `
    <div id="addSupplyModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 class="text-2xl font-bold mb-4">기타 비용 추가</h2>
        <form id="addSupplyForm" onsubmit="saveSupplyPurchase(event, '${yearMonth}')">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">구매일 <span class="text-red-500">*</span></label>
            <input type="date" id="supply-date" required
              class="w-full max-w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">품목 <span class="text-red-500">*</span></label>
            <input type="text" id="supply-item" required placeholder="예: 세제, 수건, 청소용품"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">구매처</label>
            <input type="text" id="supply-store" placeholder="예: 이마트, 쿠팡"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">카테고리</label>
            <select id="supply-category"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="비품">비품</option>
              <option value="소모품">소모품</option>
              <option value="청소용품">청소용품</option>
              <option value="침구류">침구류</option>
              <option value="주방용품">주방용품</option>
              <option value="욕실용품">욕실용품</option>
              <option value="세금">세금</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">금액 (원) <span class="text-red-500">*</span></label>
            <input type="number" id="supply-amount" required min="0" step="1" placeholder="0"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">메모</label>
            <textarea id="supply-notes" rows="2" placeholder="추가 정보 (선택사항)"
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>

          <div class="flex justify-end space-x-3">
            <button type="button" onclick="closeSupplyModal()"
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

  // Remove existing modal if any
  const existing = document.getElementById('addSupplyModal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('supply-date').value = today;
}

function closeSupplyModal() {
  const modal = document.getElementById('addSupplyModal');
  if (modal) modal.remove();
}

async function saveSupplyPurchase(event, yearMonth) {
  event.preventDefault();

  const data = {
    purchase_date: document.getElementById('supply-date').value,
    item_name: document.getElementById('supply-item').value,
    store: document.getElementById('supply-store').value || null,
    category: document.getElementById('supply-category').value,
    amount: parseFloat(document.getElementById('supply-amount').value),
    notes: document.getElementById('supply-notes').value || null
  };

  try {
    await apiCall('/expenses/supplies', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    showToast('기타 비용이 추가되었습니다.', 'success');
    closeSupplyModal();
    await loadSupplyPurchases(yearMonth);
  } catch (error) {
    console.error('Failed to save supply purchase:', error);
    showToast('기타 비용 저장 실패', 'error');
  }
}

async function deleteSupplyPurchase(id, yearMonth) {
  if (!confirm('이 비용 내역을 삭제하시겠습니까?')) {
    return;
  }

  try {
    await apiCall(`/expenses/supplies?id=${id}`, {
      method: 'DELETE'
    });

    showToast('비용 내역이 삭제되었습니다.', 'success');
    await loadSupplyPurchases(yearMonth);
  } catch (error) {
    console.error('Failed to delete supply purchase:', error);
    showToast('비용 내역 삭제 실패', 'error');
  }
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

  // Initial values (will be updated async)
  let fixedCosts = 0;
  let supplyCosts = 0;
  let totalExpenses = totalCommission + estimatedVAT;
  let netProfit = totalRevenue - totalExpenses;

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
      <div class="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 class="text-xl font-bold mb-4 text-gray-800">${year}년 ${month}월 월간 요약</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div class="text-sm text-blue-600 font-semibold mb-2">총 매출</div>
            <div class="text-3xl font-bold text-blue-700">${formatCurrency(totalRevenue)}원</div>
            <div class="text-xs text-blue-500 mt-2">예약 ${activeReservations.length}건 (취소 제외)</div>
          </div>

          <div class="border-2 border-red-200 rounded-lg p-6 bg-red-50">
            <div class="text-sm text-red-600 font-semibold mb-2">총 비용</div>
            <div class="text-3xl font-bold text-red-700" id="totalExpensesDisplay">${formatCurrency(totalExpenses)}원</div>
            <div class="text-xs text-red-500 mt-2">수수료 + VAT + 고정비 + 기타비용</div>
          </div>

          <div class="border-2 border-green-200 rounded-lg p-6 bg-green-50">
            <div class="text-sm text-green-600 font-semibold mb-2">순이익</div>
            <div class="text-3xl font-bold text-green-700" id="netProfitDisplay">${formatCurrency(netProfit)}원</div>
            <div class="text-xs text-green-500 mt-2">이익률 <span id="profitMarginDisplay">${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}</span>%</div>
          </div>
        </div>
      </div>

      <!-- 비용 상세 내역 -->
      <div class="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 class="text-xl font-bold mb-4 text-gray-800">비용 상세 내역</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="text-sm text-gray-600 mb-1">채널 수수료</div>
            <div class="text-2xl font-bold text-gray-800" id="commissionCost">${formatCurrency(totalCommission)}</div>
            <div class="text-xs text-gray-500 mt-1">원</div>
          </div>
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="text-sm text-gray-600 mb-1">부가세 (VAT)</div>
            <div class="text-2xl font-bold text-gray-800" id="vatCost">${formatCurrency(estimatedVAT)}</div>
            <div class="text-xs text-gray-500 mt-1">원</div>
          </div>
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="text-sm text-gray-600 mb-1">고정 비용</div>
            <div class="text-2xl font-bold text-gray-800" id="fixedCost">0</div>
            <div class="text-xs text-gray-500 mt-1">원</div>
          </div>
          <div class="border rounded-lg p-4 bg-purple-50">
            <div class="text-sm text-purple-600 mb-1">기타 비용</div>
            <div class="text-2xl font-bold text-purple-800" id="supplyCost">0</div>
            <div class="text-xs text-purple-500 mt-1">원 (비품/소모품)</div>
          </div>
        </div>
      </div>

      <!-- 매출 분석 -->
      <div class="bg-white rounded-lg shadow-md p-4 md:p-6">
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
      <div class="bg-white rounded-lg shadow-md p-4 md:p-6">
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

        </div>
      </div>

      <!-- 예약율 현황 -->
      <div class="bg-white rounded-lg shadow-md p-4 md:p-6">
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

  // Load actual expenses asynchronously and update the display
  (async () => {
    try {
      const [fixedExpenses, supplies] = await Promise.all([
        apiCall(`/expenses/fixed?year_month=${yearMonth}`).catch(() => null),
        apiCall(`/expenses/supplies?year_month=${yearMonth}`).catch(() => [])
      ]);

      let actualFixedCosts = 0;
      let actualSupplyCosts = 0;

      if (fixedExpenses) {
        actualFixedCosts = Object.keys(fixedExpenses)
          .filter(key => !['id', 'year_month', 'created_at', 'updated_at', 'organization_id'].includes(key))
          .reduce((sum, key) => sum + (parseFloat(fixedExpenses[key]) || 0), 0);
      }

      if (supplies && supplies.length > 0) {
        actualSupplyCosts = supplies.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      }

      const actualTotalExpenses = totalCommission + estimatedVAT + actualFixedCosts + actualSupplyCosts;
      const actualNetProfit = totalRevenue - actualTotalExpenses;

      // Update the displayed values
      const totalExpensesEl = document.getElementById('totalExpensesDisplay');
      const netProfitEl = document.getElementById('netProfitDisplay');
      const profitMarginEl = document.getElementById('profitMarginDisplay');
      const fixedCostEl = document.getElementById('fixedCost');
      const supplyCostEl = document.getElementById('supplyCost');

      if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(actualTotalExpenses) + '원';
      if (netProfitEl) netProfitEl.textContent = formatCurrency(actualNetProfit) + '원';
      if (profitMarginEl) profitMarginEl.textContent = totalRevenue > 0 ? ((actualNetProfit / totalRevenue) * 100).toFixed(1) : 0;
      if (fixedCostEl) fixedCostEl.textContent = formatCurrency(actualFixedCosts);
      if (supplyCostEl) supplyCostEl.textContent = formatCurrency(actualSupplyCosts);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    }
  })();
}

async function exportLedger() {
  const monthInput = document.getElementById('ledgerMonth');
  if (!monthInput) return;

  const yearMonth = monthInput.value;
  if (!yearMonth) return;

  const [year, month] = yearMonth.split('-');
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  try {
    showToast('엑셀 파일을 생성하고 있습니다...', 'success');

    // Load SheetJS library if not already loaded
    if (typeof XLSX === 'undefined') {
      await loadSheetJSForExport();
    }

    // Fetch data
    const reservations = await apiCall(`/reservations?startDate=${startDate}&endDate=${endDate}`);
    const properties = await apiCall('/properties');

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Build room map
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
        channels: { BOOKING_COM: 0, YANOLJA: 0, AIRBNB: 0, DIRECT: 0 },
        paymentMethods: { platform: 0, card: 0, transfer: 0, cash: 0, paypal: 0, toss: 0 },
        dormOccupied: 0,
        nonDormOccupied: 0
      };
    });

    // Process reservations (exclude cancelled)
    reservations.forEach(res => {
      if (res.status === 'CANCELLED') return;

      const checkIn = new Date(res.check_in);
      const checkOut = new Date(res.check_out);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const revenue = parseFloat(res.total_price || 0);
      const revenuePerNight = nights > 0 ? revenue / nights : 0;

      const isDorm = dormRoomIds.has(res.room_id);

      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year)) {
          const day = d.getDate();
          if (dailyStats[day]) {
            if (isDorm) {
              dailyStats[day].dormRevenue += revenuePerNight;
              dailyStats[day].dormOccupied += 1;
            } else {
              dailyStats[day].nonDormRevenue += revenuePerNight;
              dailyStats[day].nonDormOccupied += 1;
            }

            const channel = res.channel || 'DIRECT';
            if (dailyStats[day].channels[channel] !== undefined) {
              dailyStats[day].channels[channel] += revenuePerNight;
            }

            // Payment method - 채널 예약은 플랫폼, 직접 예약만 실제 결제 방식
            if (channel !== 'DIRECT') {
              dailyStats[day].paymentMethods.platform += revenuePerNight;
            } else {
              const paymentMethod = res.payment_method || 'card';
              if (dailyStats[day].paymentMethods[paymentMethod] !== undefined) {
                dailyStats[day].paymentMethods[paymentMethod] += revenuePerNight;
              } else {
                dailyStats[day].paymentMethods.card += revenuePerNight;
              }
            }
          }
        }
      }
    });

    // Create revenue sheet data
    const revenueData = [
      ['날짜', '도미토리', '일반객실', '부킹닷컴', '야놀자', '에어비앤비', '직접예약', '플랫폼', '카드', '계좌이체', '현금', '페이팔', '토스', '일일 합계', '도미 예약율(%)', '일반 예약율(%)']
    ];

    let totalRevenue = 0;
    dates.forEach(day => {
      const stats = dailyStats[day];
      const dailyTotal = stats.dormRevenue + stats.nonDormRevenue;
      totalRevenue += dailyTotal;

      const dormOccupancy = dormRoomCount > 0 ? ((stats.dormOccupied / dormRoomCount) * 100) : 0;
      const nonDormOccupancy = nonDormRoomCount > 0 ? ((stats.nonDormOccupied / nonDormRoomCount) * 100) : 0;

      revenueData.push([
        `${year}-${month}-${String(day).padStart(2, '0')}`,
        Math.round(stats.dormRevenue),
        Math.round(stats.nonDormRevenue),
        Math.round(stats.channels.BOOKING_COM),
        Math.round(stats.channels.YANOLJA),
        Math.round(stats.channels.AIRBNB),
        Math.round(stats.channels.DIRECT),
        Math.round(stats.paymentMethods.platform),
        Math.round(stats.paymentMethods.card),
        Math.round(stats.paymentMethods.transfer),
        Math.round(stats.paymentMethods.cash),
        Math.round(stats.paymentMethods.paypal),
        Math.round(stats.paymentMethods.toss),
        Math.round(dailyTotal),
        dormOccupancy.toFixed(1),
        nonDormOccupancy.toFixed(1)
      ]);
    });

    // Add total row
    revenueData.push([
      '월 합계',
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].dormRevenue, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].nonDormRevenue, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].channels.BOOKING_COM, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].channels.YANOLJA, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].channels.AIRBNB, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].channels.DIRECT, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].paymentMethods.platform, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].paymentMethods.card, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].paymentMethods.transfer, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].paymentMethods.cash, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].paymentMethods.paypal, 0)),
      Math.round(dates.reduce((sum, day) => sum + dailyStats[day].paymentMethods.toss, 0)),
      Math.round(totalRevenue),
      '',
      ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(revenueData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // 날짜
      { wch: 12 }, // 도미토리
      { wch: 12 }, // 일반객실
      { wch: 12 }, // 부킹닷컴
      { wch: 10 }, // 야놀자
      { wch: 12 }, // 에어비앤비
      { wch: 12 }, // 직접예약
      { wch: 10 }, // 플랫폼
      { wch: 10 }, // 카드
      { wch: 12 }, // 계좌이체
      { wch: 10 }, // 현금
      { wch: 10 }, // 페이팔
      { wch: 10 }, // 토스
      { wch: 12 }, // 일일 합계
      { wch: 15 }, // 도미 예약율
      { wch: 15 }  // 일반 예약율
    ];

    XLSX.utils.book_append_sheet(wb, ws, '매출현황');

    // Create reservations detail sheet
    const reservationData = [
      ['예약번호', '채널', '숙소', '객실', '고객명', '체크인', '체크아웃', '박수', '인원', '금액', '결제방법', '상태']
    ];

    const activeReservations = reservations.filter(res => res.status !== 'CANCELLED');
    activeReservations.forEach(res => {
      const checkIn = new Date(res.check_in);
      const checkOut = new Date(res.check_out);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const room = roomMap[res.room_id];

      reservationData.push([
        res.channel_reservation_id || res.id,
        getChannelNameForExport(res.channel),
        room?.properties?.name || '-',
        room?.name || '-',
        res.guest_name,
        res.check_in.split('T')[0],
        res.check_out.split('T')[0],
        nights,
        res.number_of_guests || 1,
        parseFloat(res.total_price || 0),
        res.payment_method || '카드',
        getStatusTextForExport(res.status)
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(reservationData);
    ws2['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws2, '예약상세');

    // Save file
    const filename = `장부_${year}년_${month}월_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    showToast('엑셀 파일이 다운로드되었습니다.', 'success');
  } catch (error) {
    console.error('Excel export failed:', error);
    showToast('엑셀 내보내기 실패: ' + error.message, 'error');
  }
}

function loadSheetJSForExport() {
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

function getChannelNameForExport(channel) {
  const names = {
    'BOOKING_COM': '부킹닷컴',
    'YANOLJA': '야놀자',
    'AIRBNB': '에어비앤비',
    'WEBSITE': '웹사이트',
    'DIRECT': '직접예약'
  };
  return names[channel] || channel;
}

function getStatusTextForExport(status) {
  const texts = {
    'CONFIRMED': '확정',
    'CANCELLED': '취소',
    'CHECKED_IN': '체크인',
    'CHECKED_OUT': '체크아웃',
    'NO_SHOW': '노쇼'
  };
  return texts[status] || status;
}

router.register('ledger', loadLedger);
