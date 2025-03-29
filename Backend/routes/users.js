const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../database');

// User registration route
router.post('/register', async (req, res) => {
  const { email, firstName, lastName, password } = req.body;
  try {
    const insertQuery = 'INSERT INTO users (email, first_name, last_name, password) VALUES (?, ?, ?, ?)';
    const result = await queryDatabase(insertQuery, [email, firstName, lastName, password]);
    res.json({ success: true, userId: result.insertId });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user', details: error.message });
  }
});

// Add route for changing password
router.post('/change-password', async (req, res) => {
  let { userId, email, currentPassword, newPassword } = req.body;
  console.log('Received change password request for userId:', userId, 'email:', email);

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Ensure userId is treated as a number if it's a numeric string
  if (userId) {
    userId = Number(userId) || userId;
    console.log('Processed userId (after conversion):', userId, 'Type:', typeof userId);
  }

  try {
    let userResults = [];
    
    // First try to find user by ID
    if (userId) {
      console.log('Trying to find user by ID:', userId);
      const userByIdQuery = 'SELECT id, email, password FROM users WHERE id = ?';
      console.log('SQL Query (by ID):', userByIdQuery, 'Params:', [userId]);
      
      userResults = await queryDatabase(userByIdQuery, [userId]);
      console.log('Query results by ID:', JSON.stringify(userResults, null, 2));
    }
    
    // If not found by ID and email is provided, try to find by email
    if ((!userResults || userResults.length === 0) && email) {
      console.log('User not found by ID, trying email:', email);
      const userByEmailQuery = 'SELECT id, email, password FROM users WHERE email = ?';
      console.log('SQL Query (by email):', userByEmailQuery, 'Params:', [email]);
      
      userResults = await queryDatabase(userByEmailQuery, [email]);
      console.log('Query results by email:', JSON.stringify(userResults, null, 2));
    }
    
    // Still not found
    if (!userResults || userResults.length === 0) {
      console.log('User not found with ID:', userId, 'or email:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResults[0];
    console.log('Found user:', JSON.stringify(user, null, 2));
    const storedPassword = user.password;
    console.log('Current password in DB:', storedPassword);
    console.log('Provided current password:', currentPassword);

    // Compare current password (simple string comparison)
    if (storedPassword !== currentPassword) {
      console.log('Password mismatch for user:', user.id);
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Prevent using the same password
    if (currentPassword === newPassword) {
      console.log('User attempted to reuse the same password:', user.id);
      return res.status(400).json({ message: 'New password must be different from your current password' });
    }

    // Set userId to the one we found in the database
    userId = user.id;

    // Update the password
    console.log('Updating password for user:', userId);
    const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
    console.log('Update SQL Query:', updateQuery, 'Params:', [newPassword, userId]);
    
    const updateResult = await queryDatabase(updateQuery, [newPassword, userId]);
    
    console.log('Password update result:', JSON.stringify(updateResult, null, 2));
    
    if (updateResult && updateResult.affectedRows > 0) {
      console.log('Password successfully updated for user:', userId);
      return res.status(200).json({ message: 'Password updated successfully' });
    } else {
      console.log('No rows affected when updating password for user:', userId);
      return res.status(500).json({ message: 'Failed to update password' });
    }
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Get unique barangays
router.get('/step1_identifying_information/barangay', async (req, res) => {
  try {
    const query = 'SELECT DISTINCT barangay FROM step1_identifying_information WHERE barangay IS NOT NULL';
    const results = await queryDatabase(query);
    const barangays = results.map(row => row.barangay);
    res.json(barangays);
  } catch (error) {
    console.error('Error fetching barangays:', error);
    res.status(500).json({ error: 'Failed to fetch barangays' });
  }
});

// Get all step1_identifying_information data
router.get('/step1_identifying_information', async (req, res) => {
  try {
    const { barangay } = req.query;

    // Add barangay condition to all queries
    const barangayCondition = barangay && barangay !== 'All' ? `WHERE barangay = '${barangay}'` : '';

    const barangayQuery = `
      SELECT barangay, COUNT(*) as count 
      FROM step1_identifying_information 
      ${barangay && barangay !== 'All' ? `WHERE barangay = '${barangay}'` : ''}
      GROUP BY barangay
    `;

    const educationQuery = `
      SELECT education, COUNT(*) as count 
      FROM step1_identifying_information 
      ${barangay && barangay !== 'All' ? `WHERE barangay = '${barangay}'` : ''}
      GROUP BY education
    `;

    const incomeQuery = `
      SELECT 
        CASE 
          WHEN income < 10000 THEN 'Below ₱10,000'
          WHEN income BETWEEN 11000 AND 20000 THEN '₱11,000-₱20,000'
          WHEN income BETWEEN 21000 AND 43000 THEN '₱21,000-₱43,000'
          ELSE '₱44,000 and above'
        END as income_range,
        COUNT(*) as count
      FROM step1_identifying_information 
      WHERE income IS NOT NULL
      ${barangay && barangay !== 'All' ? `AND barangay = '${barangay}'` : ''}
      GROUP BY 
        CASE 
          WHEN income < 10000 THEN 'Below ₱10,000'
          WHEN income BETWEEN 11000 AND 20000 THEN '₱11,000-₱20,000'
          WHEN income BETWEEN 21000 AND 43000 THEN '₱21,000-₱43,000'
          ELSE '₱44,000 and above'
        END
      ORDER BY 
        CASE income_range
          WHEN 'Below ₱10,000' THEN 1
          WHEN '₱11,000-₱20,000' THEN 2
          WHEN '₱21,000-₱43,000' THEN 3
          ELSE 4
        END
    `;

    const employmentQuery = `
      SELECT employment_status, COUNT(*) as count 
      FROM step1_identifying_information 
      ${barangay && barangay !== 'All' ? `WHERE barangay = '${barangay}'` : ''}
      GROUP BY employment_status
    `;

    const civilStatusQuery = `
      SELECT civil_status, COUNT(*) as count 
      FROM step1_identifying_information 
      ${barangay && barangay !== 'All' ? `WHERE barangay = '${barangay}'` : ''}
      GROUP BY civil_status
    `;

    const genderQuery = `
      SELECT gender, COUNT(*) as count 
      FROM step1_identifying_information 
      ${barangay && barangay !== 'All' ? `WHERE barangay = '${barangay}'` : ''}
      GROUP BY gender
    `;

    const monthlyTrendQuery = `
      SELECT 
        MONTH(created_at) as month,
        COUNT(*) as count 
      FROM step1_identifying_information 
      ${barangay && barangay !== 'All' ? `WHERE barangay = '${barangay}'` : ''}
      GROUP BY MONTH(created_at)
      ORDER BY month
    `;

    const [
      barangayResults,
      educationResults,
      incomeResults,
      employmentResults,
      civilStatusResults,
      genderResults,
      monthlyResults
    ] = await Promise.all([
      queryDatabase(barangayQuery),
      queryDatabase(educationQuery),
      queryDatabase(incomeQuery),
      queryDatabase(employmentQuery),
      queryDatabase(civilStatusQuery),
      queryDatabase(genderQuery),
      queryDatabase(monthlyTrendQuery)
    ]);

    const monthlyData = Array(12).fill(0);
    monthlyResults.forEach(row => {
      monthlyData[row.month - 1] = row.count;
    });

    res.json({
      barangayData: barangayResults,
      educationData: educationResults,
      incomeData: incomeResults,
      employmentData: employmentResults,
      civilStatusData: civilStatusResults,
      genderData: genderResults,
      monthlyData: monthlyData
    });
  } catch (error) {
    console.error('Error fetching step1_identifying_information:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get formatted income data
router.get('/step1_identifying_information/income', async (req, res) => {
  try {
    const { barangay } = req.query;
    const barangayCondition = barangay && barangay !== 'All' ? `AND barangay = '${barangay}'` : '';

    const query = `
      SELECT 
        id,
        barangay,
        CONCAT('₱', FORMAT(monthly_income, 2)) as formatted_income,
        monthly_income
      FROM step1_identifying_information
      WHERE monthly_income IS NOT NULL
      ${barangayCondition}
      ORDER BY monthly_income DESC
    `;

    const results = await queryDatabase(query);
    res.json({
      success: true,
      data: results,
      count: results.length,
      total: `₱${results.reduce((sum, row) => sum + row.monthly_income, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    });
  } catch (error) {
    console.error('Error fetching income data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch income data' 
    });
  }
});

// Get dashboard statistics
router.get('/step1_identifying_information/dashboard', async (req, res) => {
  try {
    const { barangay, year } = req.query;
    let whereClause = year ? `YEAR(created_at) = ${year}` : '1=1';
    if (barangay && barangay !== 'All') {
      whereClause += ` AND barangay = '${barangay}'`;
    }

    // Get age range first
    const ageRangeQuery = `
      SELECT 
        MIN(age) as min_age,
        MAX(age) as max_age
      FROM step1_identifying_information 
      WHERE ${whereClause} AND age IS NOT NULL`;

    const ageRangeResult = await queryDatabase(ageRangeQuery);
    const minAge = ageRangeResult[0].min_age || 0;
    const maxAge = ageRangeResult[0].max_age || 0;
    
    // Calculate age ranges (divide into 5 groups)
    const ageSpan = maxAge - minAge;
    const groupSize = Math.ceil(ageSpan / 5);
    
    // Get age distribution with dynamic ranges
    const ageQuery = `
      SELECT 
        SUM(CASE WHEN age BETWEEN ${minAge} AND ${minAge + groupSize} THEN 1 ELSE 0 END) as age_group_1,
        SUM(CASE WHEN age BETWEEN ${minAge + groupSize + 1} AND ${minAge + (groupSize * 2)} THEN 1 ELSE 0 END) as age_group_2,
        SUM(CASE WHEN age BETWEEN ${minAge + (groupSize * 2) + 1} AND ${minAge + (groupSize * 3)} THEN 1 ELSE 0 END) as age_group_3,
        SUM(CASE WHEN age BETWEEN ${minAge + (groupSize * 3) + 1} AND ${minAge + (groupSize * 4)} THEN 1 ELSE 0 END) as age_group_4,
        SUM(CASE WHEN age >= ${minAge + (groupSize * 4) + 1} THEN 1 ELSE 0 END) as age_group_5
      FROM step1_identifying_information 
      WHERE ${whereClause}`;

    // Get population by month
    const populationQuery = `
      SELECT MONTH(created_at) as month, COUNT(*) as count 
      FROM step1_identifying_information 
      WHERE ${whereClause}
      GROUP BY MONTH(created_at)
      ORDER BY month`;

    // Get gender distribution
    const genderQuery = `
      SELECT gender, COUNT(*) as count 
      FROM step1_identifying_information 
      WHERE ${whereClause}
      GROUP BY gender`;

    // Get civil status distribution
    const civilStatusQuery = `
      SELECT civil_status, COUNT(*) as count 
      FROM step1_identifying_information 
      WHERE ${whereClause}
      GROUP BY civil_status`;

    const [populationResults, ageResults, genderResults, civilStatusResults] = await Promise.all([
      queryDatabase(populationQuery),
      queryDatabase(ageQuery),
      queryDatabase(genderQuery),
      queryDatabase(civilStatusQuery)
    ]);

    // Process population data (fill missing months with 0)
    const population = Array(12).fill(0);
    populationResults.forEach(row => {
      population[row.month - 1] = row.count;
    });

    // Process age groups with dynamic ranges
    const ageGroups = [
      ageResults[0].age_group_1 || 0,
      ageResults[0].age_group_2 || 0,
      ageResults[0].age_group_3 || 0,
      ageResults[0].age_group_4 || 0,
      ageResults[0].age_group_5 || 0
    ];

    // Create age range labels
    const ageRangeLabels = [
      `${minAge}-${minAge + groupSize}`,
      `${minAge + groupSize + 1}-${minAge + (groupSize * 2)}`,
      `${minAge + (groupSize * 2) + 1}-${minAge + (groupSize * 3)}`,
      `${minAge + (groupSize * 3) + 1}-${minAge + (groupSize * 4)}`,
      `${minAge + (groupSize * 4) + 1}+`
    ];

    // Process gender distribution
    const genderDistribution = [0, 0]; // [male, female]
    genderResults.forEach(row => {
      if (row.gender?.toLowerCase() === 'male') genderDistribution[0] = row.count;
      if (row.gender?.toLowerCase() === 'female') genderDistribution[1] = row.count;
    });

    // Process civil status
    const civilStatus = [0, 0, 0, 0]; // [single, married, widowed, separated]
    civilStatusResults.forEach(row => {
      switch(row.civil_status?.toLowerCase()) {
        case 'single': civilStatus[0] = row.count; break;
        case 'married': civilStatus[1] = row.count; break;
        case 'widowed': civilStatus[2] = row.count; break;
        case 'separated': civilStatus[3] = row.count; break;
      }
    });

    res.json({
      population,
      ageGroups,
      ageRangeLabels, // Added this to show the dynamic ranges
      genderDistribution,
      civilStatus
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});
module.exports = router;