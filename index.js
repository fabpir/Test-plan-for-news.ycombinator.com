
// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1

const { chromium } = require("playwright");
const { DateTime } = require("luxon");

// Set the default number of articles to check
const DEFAULT_ARTICLES_TO_CHECK = 100;

// Get the number of articles to check from command line argument, or use default
const ARTICLES_TO_CHECK = parseInt(process.argv[2]) || DEFAULT_ARTICLES_TO_CHECK;

async function sortHackerNewsArticles(articlesToCheck) {
  // Launch browser in non-headless mode for visibility
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to Hacker News 'newest' page
  await page.goto("https://news.ycombinator.com/newest");

  let timestamps = [];
  let articlesChecked = 0;
  let isValidSort = true;

  // Check up to the specified number of articles or until we run out of articles
  while (articlesChecked < articlesToCheck) {
    // Construct selector for the current article (accounts for Hacker News' HTML structure)
    const articleSelector = `.athing:nth-child(${3 * (articlesChecked % 30) + 1})`;
    try {
      // Wait for the article to be visible
      await page.waitForSelector(articleSelector, { timeout: 5000 });
    } catch (error) {
      console.log(`Could only check ${articlesChecked} articles. No more articles found.`);
      break;
    }

    // Extract the timestamp from the article
    const timeStr = await page.$eval(`${articleSelector} + tr .age`, el => el.getAttribute('title'));
    const currentTime = DateTime.fromISO(timeStr, { zone: 'utc' });

    // Check if the current article is newer than the previous one (which would be incorrect)
    if (timestamps.length > 0 && currentTime > timestamps[timestamps.length - 1]) {
      console.log(`Sorting error at article ${articlesChecked + 1}: ${currentTime.toISO()} is newer than ${timestamps[timestamps.length - 1].toISO()}`);
      isValidSort = false;
    }

    timestamps.push(currentTime);
    articlesChecked++;

    // If we've checked all articles on the current page, navigate to the next page
    if (articlesChecked % 30 === 0 && articlesChecked < articlesToCheck) {
      try {
        await Promise.all([
          page.waitForNavigation({ timeout: 5000 }),
          page.click('.morelink')
        ]);
      } catch (error) {
        console.log(`Could only check ${articlesChecked} articles. Couldn't load more.`);
        break;
      }
    }
  }

  // Close the browser
  await browser.close();

  // Log a warning if we couldn't check all requested articles
  if (articlesChecked < articlesToCheck) {
    console.log(`Warning: Only ${articlesChecked} articles were available to check.`);
  }

  // Output the final result
  console.log(isValidSort
    ? `The first ${articlesChecked} articles are sorted from newest to oldest.`
    : `The sorting of the first ${articlesChecked} articles is not valid.`);
}

// Self-executing async function to run our main function
(async () => {
  console.log(`Checking ${ARTICLES_TO_CHECK} articles...`);
  await sortHackerNewsArticles(ARTICLES_TO_CHECK);
})();