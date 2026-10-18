/**
 * reportService - admin analytics.
 *
 * All heavy aggregation lives in donationModel / claimModel / feedbackModel as
 * SQL; this service shapes the result for Recharts (line, bar and pie) and
 * fills the gaps so a 6-month series always has 6 points even when some months
 * had no donations.
 */
const donationModel = require('../models/donationModel');
const claimModel = require('../models/claimModel');
const userModel = require('../models/userModel');
const verificationModel = require('../models/verificationModel');
const feedbackModel = require('../models/feedbackModel');
const { numericRow } = require('../utils/serializers');

/** Build the last `count` month labels as 'YYYY-MM' (oldest first). */
function lastMonths(count = 6) {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/** Merge sparse SQL rows onto a continuous month axis. */
function fillMonths(rows, months, keys) {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map((month) => {
    const row = byMonth.get(month) || {};
    const point = { month };
    for (const key of keys) point[key] = Number(row[key] || 0);
    return point;
  });
}

/**
 * Admin dashboard + reports payload.
 * @param {object} options { months }
 */
async function getAdminReports({ months = 6 } = {}) {
  const window = Math.min(24, Math.max(3, Number(months) || 6));
  const monthAxis = lastMonths(window);

  const [
    totals, claimTotals, userCounts, pendingVerifications, expiredCount,
    cityTrendRows, cityRows, categoryRows, monthlyRows, topDonors, ratingDistribution,
  ] = await Promise.all([
    donationModel.platformTotals(),
    claimModel.claimTotals(),
    userModel.countsByRole(),
    verificationModel.countPending(),
    donationModel.countExpired(),
    donationModel.cityTrends(window),
    donationModel.citySummary(),
    donationModel.categoryBreakdown(),
    donationModel.monthlyTrends(window),
    donationModel.topDonors(5),
    feedbackModel.globalRatingDistribution(),
  ]);

  const platform = numericRow(totals, [
    'total_donations', 'delivered_donations', 'active_donations', 'total_kg', 'meals_saved',
  ]);
  const claims = numericRow(claimTotals, [
    'total_claims', 'active_claims', 'delivered_claims', 'cancelled_claims',
  ]);

  // City x month matrix for the stacked line chart.
  const cities = [...new Set(cityTrendRows.map((row) => row.city))];
  const cityTrends = monthAxis.map((month) => {
    const point = { month };
    for (const city of cities) {
      const match = cityTrendRows.find((row) => row.month === month && row.city === city);
      point[city] = match ? Number(match.donations) : 0;
    }
    point.total = cities.reduce((sum, city) => sum + (point[city] || 0), 0);
    return point;
  });

  const averageRating = ratingDistribution.length
    ? Number(
      (
        ratingDistribution.reduce((sum, row) => sum + Number(row.rating) * Number(row.total), 0) /
        ratingDistribution.reduce((sum, row) => sum + Number(row.total), 0)
      ).toFixed(2),
    )
    : null;

  return {
    headline: {
      totalDonations: platform.total_donations,
      deliveredDonations: platform.delivered_donations,
      activeDonations: platform.active_donations,
      totalKg: platform.total_kg,
      mealsSaved: platform.meals_saved,
      totalClaims: claims.total_claims,
      activeClaims: claims.active_claims,
      deliveredClaims: claims.delivered_claims,
      cancelledClaims: claims.cancelled_claims,
      pendingVerifications,
      expiredListings: expiredCount,
      averageRating,
      users: userCounts,
    },
    // Line chart: donations + meals saved per month.
    monthlyTrend: fillMonths(monthlyRows, monthAxis, ['donations', 'delivered', 'meals_saved']),
    // Stacked line/area chart: donations per city per month.
    cityTrends: {
      cities,
      series: cityTrends,
    },
    // Bar chart: totals per city.
    citySummary: cityRows.map((row) => ({
      city: row.city,
      donations: Number(row.donations),
      delivered: Number(row.delivered),
      mealsSaved: Number(row.meals_saved),
    })),
    // Pie chart: category share.
    categoryBreakdown: categoryRows.map((row) => ({
      id: row.id,
      category: row.category,
      type: row.type,
      donations: Number(row.donations),
      quantityKg: Number(row.quantity_kg),
    })),
    // Leaderboard table.
    topDonors: topDonors.map((row) => ({
      id: row.id,
      name: row.full_name,
      orgType: row.org_type,
      city: row.city,
      donations: Number(row.donations),
      delivered: Number(row.delivered),
      mealsSaved: Number(row.meals_saved),
      averageRating: row.average_rating === null || row.average_rating === undefined
        ? null
        : Number(row.average_rating),
    })),
    // Rating distribution for the feedback chart.
    ratingDistribution: [5, 4, 3, 2, 1].map((star) => ({
      stars: `${star} star`,
      rating: star,
      count: Number((ratingDistribution.find((row) => Number(row.rating) === star) || {}).total || 0),
    })),
  };
}

module.exports = { getAdminReports, lastMonths, fillMonths };
