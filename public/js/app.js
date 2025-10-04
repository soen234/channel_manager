const API_BASE = '/api';

// 인증 체크
function checkAuth() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// 로그아웃
function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// 라우팅 시스템
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    if (this.routes[path]) {
      this.currentRoute = path;
      this.routes[path]();
      // 네비게이션 활성화 상태 업데이트
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-route') === path) {
          link.classList.add('active');
        }
      });
    }
  }

  init() {
    // 네비게이션 링크 이벤트 리스너
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        this.navigate(route);
      });
    });

    // 초기 페이지 로드
    this.navigate('dashboard');
  }
}

const router = new Router();

// API 호출 헬퍼
async function apiCall(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    showToast('오류가 발생했습니다: ' + error.message, 'error');
    throw error;
  }
}

// 토스트 알림
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } z-50 animate-slide-in`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 대시보드
async function loadDashboard() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">대시보드</h1>
      <p class="text-gray-600">채널매니저 통합 관리 시스템</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">오늘 체크인</p>
            <p class="text-3xl font-bold text-blue-600" id="todayCheckIns">-</p>
          </div>
          <div class="text-blue-600">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">오늘 체크아웃</p>
            <p class="text-3xl font-bold text-green-600" id="todayCheckOuts">-</p>
          </div>
          <div class="text-green-600">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">다음달 예약</p>
            <p class="text-3xl font-bold text-purple-600" id="upcomingReservations">-</p>
          </div>
          <div class="text-purple-600">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">전체 숙소</p>
            <p class="text-3xl font-bold text-orange-600" id="totalProperties">-</p>
          </div>
          <div class="text-orange-600">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Reservations -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-bold mb-4">최근 예약</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2 px-4 text-sm font-semibold text-gray-600">채널</th>
                <th class="text-left py-2 px-4 text-sm font-semibold text-gray-600">고객명</th>
                <th class="text-left py-2 px-4 text-sm font-semibold text-gray-600">체크인</th>
                <th class="text-left py-2 px-4 text-sm font-semibold text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody id="reservationsBody">
              <tr>
                <td colspan="4" class="text-center py-4 text-gray-500">로딩중...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Channel Stats -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-bold mb-4">채널별 예약 현황</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-blue-50 rounded">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold">B</div>
              <span class="ml-3 font-semibold">Booking.com</span>
            </div>
            <span class="text-2xl font-bold text-blue-600" id="bookingCount">0</span>
          </div>

          <div class="flex items-center justify-between p-4 bg-green-50 rounded">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-green-600 rounded flex items-center justify-center text-white font-bold">Y</div>
              <span class="ml-3 font-semibold">야놀자</span>
            </div>
            <span class="text-2xl font-bold text-green-600" id="yanoljaCount">0</span>
          </div>

          <div class="flex items-center justify-between p-4 bg-red-50 rounded">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-red-600 rounded flex items-center justify-center text-white font-bold">A</div>
              <span class="ml-3 font-semibold">Airbnb</span>
            </div>
            <span class="text-2xl font-bold text-red-600" id="airbnbCount">0</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mt-6 bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-bold mb-4">빠른 작업</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button onclick="syncAll()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
          전체 동기화
        </button>
        <button onclick="router.navigate('properties')" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">
          숙소 관리
        </button>
        <button onclick="router.navigate('reservations')" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition">
          예약 관리
        </button>
        <button onclick="router.navigate('inventory')" class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition">
          재고/요금 관리
        </button>
      </div>
    </div>
  `;

  // 데이터 로드
  await refreshDashboard();
}

async function refreshDashboard() {
  try {
    const [dashboardData, properties, reservations] = await Promise.all([
      apiCall('/dashboard'),
      apiCall('/properties'),
      apiCall('/reservations?limit=5')
    ]);

    document.getElementById('todayCheckIns').textContent = dashboardData.todayCheckIns || 0;
    document.getElementById('todayCheckOuts').textContent = dashboardData.todayCheckOuts || 0;
    document.getElementById('upcomingReservations').textContent = dashboardData.nextMonthReservations || 0;
    document.getElementById('totalProperties').textContent = dashboardData.totalProperties || 0;

    // 채널별 통계
    const channelData = dashboardData.channelStats || [];
    channelData.forEach(item => {
      if (item.channel === 'BOOKING_COM') {
        document.getElementById('bookingCount').textContent = item._count || 0;
      } else if (item.channel === 'YANOLJA') {
        document.getElementById('yanoljaCount').textContent = item._count || 0;
      } else if (item.channel === 'AIRBNB') {
        document.getElementById('airbnbCount').textContent = item._count || 0;
      }
    });

    // 최근 예약
    const tbody = document.getElementById('reservationsBody');
    const recentReservations = dashboardData.recentReservations || [];
    if (recentReservations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">예약이 없습니다</td></tr>';
    } else {
      tbody.innerHTML = recentReservations.map(res => `
        <tr class="border-b hover:bg-gray-50">
          <td class="py-3 px-4">
            <span class="inline-block px-2 py-1 text-xs rounded ${getChannelColor(res.channel)}">
              ${getChannelName(res.channel)}
            </span>
          </td>
          <td class="py-3 px-4">${res.guest_name}</td>
          <td class="py-3 px-4 text-sm">${new Date(res.check_in).toLocaleDateString('ko-KR')}</td>
          <td class="py-3 px-4">
            <span class="inline-block px-2 py-1 text-xs rounded ${getStatusColor(res.status)}">
              ${getStatusText(res.status)}
            </span>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Dashboard refresh failed:', error);
  }
}

function getChannelName(channel) {
  const names = {
    'BOOKING_COM': 'Booking',
    'YANOLJA': '야놀자',
    'AIRBNB': 'Airbnb'
  };
  return names[channel] || channel;
}

function getChannelColor(channel) {
  const colors = {
    'BOOKING_COM': 'bg-blue-100 text-blue-800',
    'YANOLJA': 'bg-green-100 text-green-800',
    'AIRBNB': 'bg-red-100 text-red-800'
  };
  return colors[channel] || 'bg-gray-100 text-gray-800';
}

function getStatusText(status) {
  const texts = {
    'CONFIRMED': '확정',
    'CANCELLED': '취소',
    'CHECKED_IN': '체크인',
    'CHECKED_OUT': '체크아웃',
    'NO_SHOW': '노쇼'
  };
  return texts[status] || status;
}

function getStatusColor(status) {
  const colors = {
    'CONFIRMED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'CHECKED_IN': 'bg-blue-100 text-blue-800',
    'CHECKED_OUT': 'bg-gray-100 text-gray-800',
    'NO_SHOW': 'bg-orange-100 text-orange-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

async function syncAll() {
  showToast('전체 동기화 기능은 준비 중입니다.', 'error');
}

// 페이지 로드시 라우터 초기화
document.addEventListener('DOMContentLoaded', () => {
  router.register('dashboard', loadDashboard);
  router.init();
});
