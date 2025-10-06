// 스태프 관리 페이지
async function loadAdminStaff() {
  const container = document.getElementById('mainContent');

  container.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">스태프 관리</h1>
      <p class="text-gray-600">숙소별 스태프 배정 및 권한 관리</p>
    </div>

    <!-- 승인 대기 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-bold mb-4">승인 대기 중인 사용자</h2>
      <div id="pendingUsersList">
        <div class="text-center py-4 text-gray-500">로딩중...</div>
      </div>
    </div>

    <!-- 스태프 목록 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-bold mb-4">활성 스태프 목록</h2>
      <p class="text-sm text-gray-600 mb-4">각 숙소의 초대 코드는 '숙소 관리' 페이지에서 확인할 수 있습니다.</p>
      <div id="staffList">
        <div class="text-center py-4 text-gray-500">로딩중...</div>
      </div>
    </div>
  `;

  await new Promise(resolve => setTimeout(resolve, 100));
  await loadPendingUsers();
  await loadStaffList();
}

async function loadInviteCode() {
  try {
    const organizationId = localStorage.getItem('organization_id');
    const displayEl = document.getElementById('inviteCodeDisplay');

    if (!organizationId) {
      displayEl.textContent = '조직 ID를 찾을 수 없습니다';
      displayEl.classList.add('text-red-600');
      return;
    }

    // Fetch organization to get invite_code
    const org = await apiCall(`/admin/organization-info`);

    if (org && org.invite_code) {
      displayEl.textContent = org.invite_code;
      displayEl.classList.remove('text-red-600');
    } else {
      displayEl.textContent = '초대 코드 없음';
      displayEl.classList.add('text-red-600');
    }
  } catch (error) {
    console.error('Failed to load invite code:', error);
    const displayEl = document.getElementById('inviteCodeDisplay');
    if (displayEl) {
      displayEl.textContent = '로딩 실패';
      displayEl.classList.add('text-red-600');
    }
  }
}

function copyInviteCode() {
  const inviteCode = document.getElementById('inviteCodeDisplay').textContent;

  if (!inviteCode || inviteCode === '로딩중...' || inviteCode.includes('실패')) {
    showToast('초대 코드를 복사할 수 없습니다', 'error');
    return;
  }

  navigator.clipboard.writeText(inviteCode).then(() => {
    showToast('초대 코드가 클립보드에 복사되었습니다', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('복사 실패', 'error');
  });
}

async function loadPendingUsers() {
  try {
    const users = await apiCall('/admin/pending-users');
    renderPendingUsers(users);
  } catch (error) {
    console.error('Failed to load pending users:', error);

    const container = document.getElementById('pendingUsersList');
    if (container) {
      if (error.message.includes('Forbidden') || error.message.includes('403')) {
        container.innerHTML = `
          <div class="text-center py-8 text-red-500">
            관리자 권한이 필요합니다
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            데이터 로딩 실패
          </div>
        `;
      }
    }
  }
}

async function loadStaffList() {
  try {
    const staff = await apiCall('/admin/staff-list');
    renderStaffList(staff);
  } catch (error) {
    console.error('Failed to load staff list:', error);

    const container = document.getElementById('staffList');
    if (container) {
      if (error.message.includes('Forbidden') || error.message.includes('403')) {
        container.innerHTML = `
          <div class="text-center py-8 text-red-500">
            관리자 권한이 필요합니다
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            데이터 로딩 실패
          </div>
        `;
      }
    }
  }
}

function renderPendingUsers(users) {
  const container = document.getElementById('pendingUsersList');

  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>승인 대기 중인 사용자가 없습니다</p>
        <p class="text-xs mt-2">초대 코드로 가입한 스태프는 자동으로 승인됩니다</p>
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
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">가입일</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${users.map(user => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">${user.email}</td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${new Date(user.created_at).toLocaleDateString('ko-KR')}
              </td>
              <td class="px-4 py-3 text-center">
                <button onclick="approveUser('${user.user_id}', 'STAFF')"
                  class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mr-2">
                  스태프 승인
                </button>
                <button onclick="approveUser('${user.user_id}', 'ADMIN')"
                  class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                  관리자 승인
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderStaffList(staff) {
  const container = document.getElementById('staffList');

  if (!container) return;

  if (staff.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">스태프가 없습니다</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">이메일</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">숙소</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">역할</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">승인일</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${staff.map(user => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">${user.email}</td>
              <td class="px-4 py-3 text-sm text-gray-700">
                <span class="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                  ${user.property_name || '-'}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded ${
                  user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }">
                  ${user.role === 'ADMIN' ? '관리자' : '스태프'}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded ${
                  user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                  ${user.status === 'ACTIVE' ? '활성' : '비활성'}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                ${user.approved_at ? new Date(user.approved_at).toLocaleDateString('ko-KR') : '-'}
              </td>
              <td class="px-4 py-3 text-center">
                ${user.status === 'ACTIVE' ? `
                  <button onclick="revokeStaff('${user.property_id}', '${user.user_id}', '${user.email}')"
                    class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                    권한 철회
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

async function approveUser(userId, role) {
  if (!confirm(`이 사용자를 ${role === 'ADMIN' ? '관리자' : '스태프'}로 승인하시겠습니까?`)) {
    return;
  }

  try {
    await apiCall('/admin/approve-staff', {
      method: 'POST',
      body: JSON.stringify({ userId, role })
    });

    showToast(`사용자가 ${role === 'ADMIN' ? '관리자' : '스태프'}로 승인되었습니다.`, 'success');

    // Reload lists
    await loadPendingUsers();
    await loadStaffList();
  } catch (error) {
    console.error('Failed to approve user:', error);
    showToast('승인 처리 실패', 'error');
  }
}

async function revokeStaff(propertyId, userId, email) {
  if (!confirm(`${email}의 권한을 철회하시겠습니까?`)) {
    return;
  }

  try {
    await apiCall(`/properties/staff?propertyId=${propertyId}&userId=${userId}`, {
      method: 'DELETE'
    });

    showToast('권한이 철회되었습니다.', 'success');

    // Reload list
    await loadStaffList();
  } catch (error) {
    console.error('Failed to revoke staff:', error);
    showToast('권한 철회 실패', 'error');
  }
}

router.register('admin-staff', loadAdminStaff);
