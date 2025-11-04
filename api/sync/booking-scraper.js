/**
 * Booking.com Scraper
 * Logs into Booking.com extranet and fetches reservation data
 */

const puppeteer = require('puppeteer');

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
    await page.type('input[name="loginname"]', username);
    console.log('Entered username');

    // Click "다음" button and wait for navigation
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);
    console.log('Clicked submit button and navigated to password page');

    // Wait for password field on next page
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.type('input[type="password"]', password);
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
 * @returns {Array} - Array of reservation objects
 */
async function fetchBookingReservations(username, password, options = {}) {
  const {
    startDate = null,
    endDate = null,
    headless = true
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

    // Login
    await loginToBooking(page, username, password);

    console.log('Successfully logged in to Booking.com');

    // Navigate to reservations page
    await page.goto('https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/search_reservations.html', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for reservation list to load
    await page.waitForSelector('.reservations-list, [data-testid="reservation-row"], table', {
      timeout: 15000
    });

    // Extract reservation data
    const reservations = await page.evaluate(() => {
      const results = [];

      // This selector will need to be adjusted based on actual Booking.com structure
      // Try multiple possible selectors
      const rows = document.querySelectorAll(
        '[data-testid="reservation-row"], .reservation-row, table tbody tr'
      );

      rows.forEach(row => {
        try {
          // Extract data from row
          // These selectors are examples and will need to be adjusted
          const resNumber = row.querySelector('[data-testid="reservation-number"], .reservation-number')?.textContent?.trim();
          const guestName = row.querySelector('[data-testid="guest-name"], .guest-name')?.textContent?.trim();
          const checkIn = row.querySelector('[data-testid="check-in"], .check-in')?.textContent?.trim();
          const checkOut = row.querySelector('[data-testid="check-out"], .check-out')?.textContent?.trim();
          const status = row.querySelector('[data-testid="status"], .status')?.textContent?.trim();
          const price = row.querySelector('[data-testid="price"], .price')?.textContent?.trim();

          if (resNumber) {
            results.push({
              reservationNumber: resNumber,
              guestName,
              checkIn,
              checkOut,
              status,
              price,
              channel: 'BOOKING_COM'
            });
          }
        } catch (err) {
          console.error('Error parsing row:', err);
        }
      });

      return results;
    });

    console.log(`Found ${reservations.length} reservations`);

    await browser.close();
    return reservations;

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
