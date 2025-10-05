// 장부 페이지
async function loadLedger() {
  const container = document.getElementById('mainContent');

  const currentMonth = getCurrentYearMonth();

  container.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">장부</h1>
      <p class="text-gray-600">월별 매출 및 예약율 현황</p>
    </div>

    <!-- 월 선택 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex items-center gap-4">
        <label class="text-gray-700 font-semibold">조회 월:</label>
        <input type="month" id="ledgerMonth" value="${currentMonth}"
          onchange="loadLedgerData()"
          class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
        <button onclick="exportLedger()" class="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          엑셀 내보내기
        </button>
      </div>
    </div>

    <!-- 장부 테이블 -->
    <div id="ledgerContent" class="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
      <div class="text-center py-8 text-gray-500">
        조회 월을 선택하세요
      </div>
    </div>
  `;

  await new Promise(resolve => setTimeout(resolve, 50));
  await loadLedgerData();
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

  try {
    // Fetch all reservations for the month
    const reservations = await apiCall(`/reservations?startDate=${startDate}&endDate=${endDate}`);

    // Fetch properties and rooms to get room types
    const properties = await apiCall('/properties');

    renderLedgerTable(reservations, properties, year, month);
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

  // Process reservations
  reservations.forEach(res => {
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

function exportLedger() {
  showToast('엑셀 내보내기 기능은 준비 중입니다.', 'error');
}

router.register('ledger', loadLedger);
