/**
 * Booking.com Scraper
 * Logs into Booking.com extranet and fetches reservation data
 */

const puppeteer = require('puppeteer');
const { saveSessionCookies, loadSessionCookies } = require('./session-manager');

/**
 * Login to Booking.com extranet
 * @param {Page} page - Puppeteer page
 * @param {string} username - Booking.com username
 * @param {string} password - Booking.com password
 */
async function loginToBooking(page, username, password) {
  try {
    // Navigate to login page
    await page.goto('https://admin.booking.com/hotel/hoteladmin/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Navigated to login page');

    // Wait for username field and enter credentials
    await page.waitForSelector('input[name="loginname"]', { timeout: 15000 });
    const usernameField = await page.$('input[name="loginname"]');
    await usernameField.click({ clickCount: 3 }); // Select all
    await usernameField.type(username, { delay: 50 });
    console.log('Entered username');

    // Click "다음" button and wait for navigation
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);
    console.log('Clicked submit button and navigated to password page');

    // Wait for password field on next page
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    const passwordField = await page.$('input[type="password"]');
    await passwordField.click({ clickCount: 3 }); // Select all
    await passwordField.type(password, { delay: 50 });
    console.log('Entered password');

    // Submit login
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);
    console.log('Submitted login form');

    // Check if logged in
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
      throw new Error('Login failed - still on login page');
    }

    return true;
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * Fetch reservations from Booking.com extranet
 * @param {string} username - Booking.com username
 * @param {string} password - Booking.com password
 * @param {Object} options - Scraping options
 * @param {Function} options.onWeekComplete - Callback when each week is scraped: (weekReservations, weekNumber, totalWeeks) => void
 * @returns {Array} - Array of reservation objects
 */
async function fetchBookingReservations(username, password, options = {}) {
  const {
    startDate = null,
    endDate = null,
    headless = true,
    onWeekComplete = null
  } = options;

  let browser;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Try to load saved session cookies
    const savedCookies = await loadSessionCookies();

    if (savedCookies && savedCookies.length > 0) {
      console.log('Loading saved session cookies...');
      await page.setCookie(...savedCookies);

      // Try to access admin page with saved session
      await page.goto('https://admin.booking.com/hotel/hoteladmin/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Check if still logged in
      const currentUrl = page.url();
      if (!currentUrl.includes('sign-in') && !currentUrl.includes('login')) {
        console.log('✅ Session still valid, skipping login');
      } else {
        console.log('⚠️ Session expired, need to login');
        await loginToBooking(page, username, password);

        // Save new session cookies
        const cookies = await page.cookies();
        await saveSessionCookies(cookies);
        console.log('💾 Saved new session cookies');
      }
    } else {
      console.log('No saved session, performing login...');
      await loginToBooking(page, username, password);

      // Save session cookies after successful login
      const cookies = await page.cookies();
      await saveSessionCookies(cookies);
      console.log('💾 Saved session cookies');
    }

    console.log('Successfully logged in to Booking.com');

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Navigate to reservations page
    const hotelId = process.env.BOOKING_COM_HOTEL_ID || '4036399';
    await page.goto(`https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/search_reservations.html?hotel_id=${hotelId}&lang=ko`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('On reservations page, will search in 1-week intervals...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Function to search for a specific date range
    const searchDateRange = async (fromDate, toDate) => {
      const fromStr = formatDate(fromDate);
      const toStr = formatDate(toDate);

      console.log(`\n📅 Searching: ${fromStr} ~ ${toStr}`);

      // Get current table state before search
      const beforeSearch = await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody.bui-table__body tr.bui-table__row');
        const firstResNumber = rows[0]?.querySelector('td[data-heading="예약 번호"] a span')?.textContent?.trim();
        return {
          rowCount: rows.length,
          firstResNumber
        };
      });

      console.log(`📊 Current table: ${beforeSearch.rowCount} rows, first: ${beforeSearch.firstResNumber}`);

      // Set dates
      await page.evaluate((from, to) => {
        const dateFromInput = document.querySelector('#date_from');
        const dateToInput = document.querySelector('#date_to');

        if (dateFromInput && dateToInput) {
          dateFromInput.value = from;
          dateToInput.value = to;
          dateFromInput.dispatchEvent(new Event('input', { bubbles: true }));
          dateFromInput.dispatchEvent(new Event('change', { bubbles: true }));
          dateToInput.dispatchEvent(new Event('input', { bubbles: true }));
          dateToInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, fromStr, toStr);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Click "표시" button
      await page.evaluate(() => {
        const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]'))
          .find(btn => btn.textContent.includes('표시'));
        if (submitBtn) submitBtn.click();
      });

      console.log('⏳ Waiting for search results to update...');

      // Wait for table to update by checking if content changed
      let tableUpdated = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (!tableUpdated && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const afterSearch = await page.evaluate(() => {
          const rows = document.querySelectorAll('tbody.bui-table__body tr.bui-table__row');
          const firstResNumber = rows[0]?.querySelector('td[data-heading="예약 번호"] a span')?.textContent?.trim();
          return {
            rowCount: rows.length,
            firstResNumber
          };
        });

        // Check if table updated (different first reservation or different count)
        if (afterSearch.firstResNumber !== beforeSearch.firstResNumber ||
            afterSearch.rowCount !== beforeSearch.rowCount) {
          tableUpdated = true;
          console.log(`✅ Table updated! Now ${afterSearch.rowCount} rows, first: ${afterSearch.firstResNumber}`);
        } else {
          process.stdout.write('.');
        }
      }

      if (!tableUpdated) {
        console.log(`\n⚠️  Table may not have updated after ${attempts} seconds`);
      }

      // Additional wait for any animations/rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Extract reservations from current page
      const reservations = await page.evaluate(() => {
        // Parse multiple rooms function (must be defined inside evaluate)
        function parseMultipleRooms(roomTypeStr) {
          if (!roomTypeStr) return [{ count: 1, roomType: '' }];

          const parts = roomTypeStr.split(',').map(s => s.trim());
          const rooms = [];

          for (const part of parts) {
            const match = part.match(/^(\d+)\s*x\s*(.+)$/i);
            if (match) {
              const count = parseInt(match[1], 10);
              const roomType = match[2].trim();
              rooms.push({ count, roomType });
            } else {
              rooms.push({ count: 1, roomType: part });
            }
          }

          return rooms.length > 0 ? rooms : [{ count: 1, roomType: roomTypeStr }];
        }

        const results = [];
        const rows = document.querySelectorAll('tbody.bui-table__body tr.bui-table__row');

        rows.forEach(row => {
          try {
            const guestName = row.querySelector('th.bui-table__cell--row-head a span')?.textContent?.trim();
            const checkIn = row.querySelector('td[data-heading="체크인"] span')?.textContent?.trim();
            const checkOut = row.querySelector('td[data-heading="체크아웃"] span')?.textContent?.trim();
            const roomType = row.querySelector('td[data-heading="객실"]')?.textContent?.trim().split('\n')[0]?.trim();

            const statusCell = row.querySelector('td[data-heading="예약 상태"]');
            let status = 'CONFIRMED';
            if (statusCell) {
              const statusText = statusCell.textContent.toLowerCase();
              if (statusText.includes('취소') || statusText.includes('cancel')) {
                status = 'CANCELLED';
              } else if (statusText.includes('노쇼') || statusText.includes('no')) {
                status = 'NO_SHOW';
              } else if (statusText.includes('ok')) {
                status = 'OK';
              }
              // Debug: log status for first few rows
              if (results.length < 3) {
                console.log(`[DEBUG] Status text: "${statusCell.textContent.trim()}" → status: "${status}"`);
              }
            }

            const priceText = row.querySelector('td[data-heading="요금"] span')?.textContent?.trim();

            // Get full reservation number including OTA prefix (아고다, 씨트립, etc.)
            const resNumberCell = row.querySelector('td[data-heading="예약 번호"]');
            let resNumber = resNumberCell?.textContent?.trim();

            // Clean up whitespace and newlines
            if (resNumber) {
              resNumber = resNumber.replace(/\s+/g, ' ').trim();
            }

            // Debug: log first reservation number to check format
            if (resNumber && results.length === 0) {
              console.log(`📝 First reservation number format: "${resNumber}"`);
            }

            if (resNumber) {
              // Parse multiple rooms from format like "1 x 디럭스 트리플룸, 2 x 여성 전용 도미토리"
              const rooms = parseMultipleRooms(roomType);
              const totalRooms = rooms.reduce((sum, r) => sum + r.count, 0);

              if (totalRooms > 1) {
                // Multiple rooms - create separate reservation for each room
                let roomIndex = 0;
                rooms.forEach(room => {
                  for (let i = 0; i < room.count; i++) {
                    roomIndex++;
                    results.push({
                      reservationNumber: `${resNumber} (${roomIndex}/${totalRooms} 객실)`,
                      guestName,
                      checkIn,
                      checkOut,
                      roomType: room.roomType,
                      status,
                      price: priceText,
                      channel: 'BOOKING_COM'
                    });
                  }
                });
              } else {
                // Single room - keep as is
                results.push({
                  reservationNumber: resNumber,
                  guestName,
                  checkIn,
                  checkOut,
                  roomType: rooms[0]?.roomType || roomType,
                  status,
                  price: priceText,
                  channel: 'BOOKING_COM'
                });
              }
            }
          } catch (err) {
            console.error('Error parsing row:', err);
          }
        });

        return results;
      });

      console.log(`✅ Found ${reservations.length} reservations for this period`);
      return reservations;
    };

    // Search in 1-week intervals (8 weeks = 56 days)
    const allReservations = [];
    const today = new Date();

    console.log(`\n🔄 Starting 8-week search (${formatDate(today)} ~ ${formatDate(new Date(today.getTime() + 56 * 24 * 60 * 60 * 1000))})\n`);

    // Helper to convert Korean dates
    const convertKoreanDate = (koreanDate) => {
      if (!koreanDate) return null;
      const match = koreanDate.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (!match) return koreanDate;
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    const totalWeeks = 8;

    for (let week = 0; week < totalWeeks; week++) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📅 Week ${week + 1} of ${totalWeeks}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() + (week * 7));

      const toDate = new Date(today);
      toDate.setDate(today.getDate() + (week * 7) + 6);

      try {
        const weekReservations = await searchDateRange(fromDate, toDate);

        // Process dates for this week's reservations
        const processedReservations = weekReservations.map(res => ({
          ...res,
          checkIn: convertKoreanDate(res.checkIn),
          checkOut: convertKoreanDate(res.checkOut)
        }));

        allReservations.push(...processedReservations);

        console.log(`✅ Week ${week + 1} scraped: ${processedReservations.length} reservations`);

        // Call callback if provided (for immediate processing)
        if (onWeekComplete && typeof onWeekComplete === 'function') {
          await onWeekComplete(processedReservations, week + 1, totalWeeks);
        }

        // Wait between searches to avoid overwhelming the server
        if (week < totalWeeks - 1) {
          console.log('⏸️  Waiting 2 seconds before next search...\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Error searching week ${week + 1}:`, error.message);
        console.log('Continuing to next week...\n');
      }
    }

    // Remove duplicates based on reservation number
    const uniqueReservations = Array.from(
      new Map(allReservations.map(r => [r.reservationNumber, r])).values()
    );

    console.log(`\n📊 Total unique reservations: ${uniqueReservations.length}`);

    await browser.close();
    return uniqueReservations;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

/**
 * Fetch details for a specific reservation
 * @param {string} username - Booking.com username
 * @param {string} password - Booking.com password
 * @param {string} reservationId - Reservation ID
 * @param {string} hotelId - Hotel ID
 * @returns {Object} - Detailed reservation data
 */
async function fetchReservationDetails(username, password, reservationId, hotelId) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Login
    await loginToBooking(page, username, password);

    // Navigate to specific reservation
    const url = `https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html?res_id=${reservationId}&hotel_id=${hotelId}`;
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Extract detailed information
    const details = await page.evaluate(() => {
      return {
        // These selectors need to be adjusted based on actual page structure
        guestName: document.querySelector('[data-testid="guest-name"]')?.textContent?.trim(),
        email: document.querySelector('[data-testid="guest-email"]')?.textContent?.trim(),
        phone: document.querySelector('[data-testid="guest-phone"]')?.textContent?.trim(),
        checkIn: document.querySelector('[data-testid="check-in-date"]')?.textContent?.trim(),
        checkOut: document.querySelector('[data-testid="check-out-date"]')?.textContent?.trim(),
        roomType: document.querySelector('[data-testid="room-type"]')?.textContent?.trim(),
        numberOfGuests: document.querySelector('[data-testid="guests"]')?.textContent?.trim(),
        totalPrice: document.querySelector('[data-testid="total-price"]')?.textContent?.trim(),
        status: document.querySelector('[data-testid="reservation-status"]')?.textContent?.trim(),
        paymentMethod: document.querySelector('[data-testid="payment-method"]')?.textContent?.trim()
      };
    });

    await browser.close();
    return details;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

module.exports = {
  fetchBookingReservations,
  fetchReservationDetails,
  loginToBooking
};
