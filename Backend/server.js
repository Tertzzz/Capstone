const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'soloparent',
});

const queryDatabase = (sql, params) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, result) => {
    if (err) return reject(err);
    resolve(result);
  });
});

app.post('/users', async (req, res) => {
  const { email, password, name, barangay, role, status } = req.body;
  try {
    await queryDatabase('INSERT INTO users (email, password, name, barangay, role,  status) VALUES (?, ?, ?, ?, ?,?)', 
      [email, password, name, barangay, role, status]);
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error inserting user into database' });
  }
});

app.get('/pendingUsers', async (req, res) => {
  try {
    // First, get all pending users with their basic information
    const users = await queryDatabase(`
      SELECT u.id AS userId, u.email, u.name, u.status, u.barangay,
             s1.first_name, s1.middle_name, s1.last_name, s1.age, s1.gender, 
             s1.date_of_birth, s1.place_of_birth, s1.address, s1.education, 
             s1.civil_status, s1.occupation, s1.religion, s1.company, 
             s1.income, s1.employment_status, s1.contact_number, s1.email, 
             s1.pantawid_beneficiary, s1.indigenous, s1.code_id,

             -- Step 3: Classification
             s3.classification,

             -- Step 4: Needs/Problems
             s4.needs_problems,

             -- Step 5: Emergency Contact
             s5.emergency_name, s5.emergency_relationship, 
             s5.emergency_address, s5.emergency_contact

      FROM users u
      JOIN user_details_step1 s1 ON u.id = s1.user_id
      LEFT JOIN user_details_step3 s3 ON u.id = s3.user_id
      LEFT JOIN user_details_step4 s4 ON u.id = s4.user_id
      LEFT JOIN user_details_step5 s5 ON u.id = s5.user_id
      WHERE u.status = 'pending'
    `);

    // For each user, get their children
    const usersWithChildren = await Promise.all(users.map(async (user) => {
      const children = await queryDatabase(`
        SELECT first_name, middle_name, last_name, birthdate, age, educational_attainment
        FROM user_details_step2
        WHERE user_id = ?
      `, [user.userId]);

      return {
        ...user,
        children: children
      };
    }));

    res.status(200).json(usersWithChildren);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching pending users' });
  }
});

app.get('/verified-users', async (req, res) => {
  try {
    const query = `
      SELECT * FROM users 
      WHERE status = 'Verified' 
      ORDER BY created_at DESC
    `;
    const users = await queryDatabase(query);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching verified users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // First check users table
    let results = await queryDatabase('SELECT *, "user" as role FROM users WHERE email = ? AND password = ?', [email, password]);
    
    // If not found in users, check admin table
    if (results.length === 0) {
      results = await queryDatabase('SELECT *, "admin" as role FROM admin WHERE email = ? AND password = ?', [email, password]);
    }
    
    // If not found in admin, check superadmin table
    if (results.length === 0) {
      results = await queryDatabase('SELECT *, "superadmin" as role FROM superadmin WHERE email = ? AND password = ?', [email, password]);
    }

    if (results.length > 0) {
      const user = results[0];
      res.status(200).json({ 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name || null,
          status: user.status || 'active'
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/getUserDetails', async (req, res) => {
  const { userId } = req.body;
  try {
    // Fetch user details
    const userResults = await queryDatabase('SELECT * FROM users WHERE id = ?', [userId]);

    if (userResults.length > 0) {
      const user = userResults[0];
      
      // If the user is verified, fetch all related details
      if (user.status === 'Verified') {
        // Get user's personal details from step1
        const detailsResults = await queryDatabase('SELECT * FROM user_details_step1 WHERE user_id = ?', [userId]);
        
        // Get all children from step2 where the parent_id matches the logged-in user's ID
        const childrenResults = await queryDatabase(`
          SELECT s2.first_name, s2.middle_name, s2.last_name, s2.birthdate, s2.age, 
                 s2.educational_attainment, s2.user_id as parent_id
          FROM user_details_step2 s2
          WHERE s2.user_id = ?
        `, [userId]);
        
        if (detailsResults.length > 0) {
          // Merge user details with personal info and children data
          const userDetails = { 
            ...user, 
            ...detailsResults[0],
            children: childrenResults || [] 
          };
          
          // Log the found children for debugging
          console.log('Found children for user', userId, ':', childrenResults.length);
          
          return res.status(200).json(userDetails); 
        } else {
          return res.status(404).json({ error: 'User details not found' });
        }
      } else {
        return res.status(200).json(user); // Just return basic user info if not verified
      }
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error fetching user details:', err);
    res.status(500).json({ error: 'Error fetching user details' });
  }
});

app.get('/users', async (req, res) => {
  try {
    const users = await queryDatabase('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.get('/admin', async (req, res) => {
  try {
    const adminData = await queryDatabase('SELECT * FROM admin');
    res.json(adminData);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching admin data' });
  }
});

app.get('/superadmin', async (req, res) => {
  try {
    const superadminData = await queryDatabase('SELECT * FROM superadmin');
    res.json(superadminData);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching superadmin data' });
  }
});

app.post('/userDetailsStep1', async (req, res) => {
  const {
    userId, firstName, middleName, lastName, age, gender, dateOfBirth,
    placeOfBirth, address, education, civilStatus, occupation, religion,
    company, income, employmentStatus, contactNumber, email, pantawidBeneficiary,
    indigenous
  } = req.body;

  const createDate = new Date();
  const year = createDate.getFullYear();
  const month = (createDate.getMonth() + 1).toString().padStart(2, '0');  // Format month as 2 digits

  try {
    // Get the highest codeId for the current month
    const result = await queryDatabase(`
      SELECT codeId FROM user_details_step1 
      WHERE codeId LIKE ? 
      ORDER BY codeId DESC LIMIT 1
    `, [`${year}-${month}-%`]);

    // Generate the new codeId based on a random number (6 digits)
    let newId = Math.floor(Math.random() * 1000000); // Random number between 0 and 999999
    newId = newId.toString().padStart(6, '0'); // Pad with leading zeros if necessary

    const codeId = `${year}-${month}-${newId}`;

    // Insert the new record with the generated `codeId`
    await queryDatabase(`
      INSERT INTO user_details_step1 (
        userId, firstName, middleName, lastName, age, gender, dateOfBirth,
        placeOfBirth, address, education, civilStatus, occupation, religion,
        company, income, employmentStatus, contactNumber, email, pantawidBeneficiary,
        indigenous, codeId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, firstName, middleName, lastName, age, gender, dateOfBirth,
      placeOfBirth, address, education, civilStatus, occupation, religion,
      company, income, employmentStatus, contactNumber, email, pantawidBeneficiary,
      indigenous, codeId
    ]);

    res.status(201).json({ message: 'Data inserted successfully with random codeId value' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error inserting data into user_details_step1' });
  }
});

app.post('/userDetailsStep2', async (req, res) => {
  const { userId, numberOfChildren, children } = req.body;

  try {
    // Insert each child as a new row
    for (let i = 0; i < numberOfChildren; i++) {
      const child = children[i];
      await queryDatabase(`
        INSERT INTO user_details_step2(user_id, first_name, middle_name, last_name, birthdate, age, educational_attainment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        child.Firstname,
        child.Middlename,
        child.Lastname,
        child.Birthdate,
        child.Age,
        child.EducationalAttainment
      ]);
    }

    res.status(201).json({ message: 'Family and occupation data saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving family and occupation data', details: err.message });
  }
});

// Save Classification Data
app.post('/userDetailsStep3', async (req, res) => {
  const { userId, classification } = req.body;

  try {
    // Check if userId and classification are being passed correctly
    if (!userId || !classification) {
      return res.status(400).json({ error: 'Missing required fields: userId or classification' });
    }

    // Insert the classification data into the database
    await queryDatabase(`
      INSERT INTO user_details_step3 (userId, classification) 
      VALUES (?, ?)
    `, [userId, classification]);

    res.status(201).json({ message: 'Classification data saved successfully' });
  } catch (err) {
    console.error(err);  // Log the error to server console
    res.status(500).json({ error: 'Error saving classification data', details: err.message });
  }
});

app.post('/userDetailsStep4', async (req, res) => {
  const { userId, needsProblems } = req.body;

  try {
    // Check if both userId and needsProblems are present
    if (!userId || !needsProblems) {
      return res.status(400).json({ error: 'Missing required fields: userId or needsProblems' });
    }

    // Insert the needs/problems data into the database
    await queryDatabase(`
      INSERT INTO user_details_step4 (userId, needsProblems) 
      VALUES (?, ?)
    `, [userId, needsProblems]);

    res.status(201).json({ message: 'Needs/problems data saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving needs/problems data', details: err.message });
  }
});

app.post('/userDetailsStep5', async (req, res) => {
  const {
    userId,
    emergencyName,
    emergencyRelationship,
    emergencyAddress,
    emergencyContact
  } = req.body;

  try {
    // Check if the required fields are present
    if (!userId || !emergencyName || !emergencyRelationship || !emergencyAddress || !emergencyContact) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert the emergency contact data into the database
    await queryDatabase(`
      INSERT INTO user_details_step5 (user_id, emergency_name, emergency_relationship, emergency_address, emergency_contact)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, emergencyName, emergencyRelationship, emergencyAddress, emergencyContact]);

    res.status(201).json({ message: 'Emergency contact data saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving emergency contact data', details: err.message });
  }
});

app.post('/updateUserStatus', async (req, res) => {
  const { userId, status, remarks } = req.body;

  try {
    await queryDatabase('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

    if (status === "Declined" && remarks) {
      await queryDatabase(
        'INSERT INTO declined_users (user_id, remarks, declined_at) VALUES (?, ?, NOW())', 
        [userId, remarks]
      );
    }

    if (status === "Verified") {
      await queryDatabase(
        'INSERT INTO accepted_users (user_id, accepted_at, message) VALUES (?, NOW(), ?)', 
        [userId, 'Your application has been accepted.']
      );
    }

    res.status(200).json({ message: 'User status updated successfully' });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: 'Database error while updating user status' });
  }
});

app.post('/submitAllSteps', async (req, res) => {
  const { userId, formData } = req.body;

  try {
    // Check user status
    const user = await queryDatabase('SELECT status FROM users WHERE id = ?', [userId]);
    if (user[0].status === 'pending') {
      return res.status(400).json({ error: 'Your verification form is pending. Please wait for approval before submitting again.' });
    }

    // Generate unique code ID
    const createDate = new Date();
    const year = createDate.getFullYear();
    const month = (createDate.getMonth() + 1).toString().padStart(2, '0');
    const newId = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const codeId = `${year}-${month}-${newId}`;

    await queryDatabase('START TRANSACTION');

    // Update user status to pending
    await queryDatabase('UPDATE users SET status = ? WHERE id = ?', ['pending', userId]);

    // Step 1: Personal Information
    await queryDatabase(`
      INSERT INTO user_details_step1 (
        user_id, first_name, middle_name, last_name, age, gender, date_of_birth,
        place_of_birth, address, education, civil_status, occupation, religion,
        company, income, employment_status, contact_number, email, pantawid_beneficiary,
        indigenous, code_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, 
      formData.firstName || "", 
      formData.middleName || "", 
      formData.lastName || "", 
      formData.age || "", 
      formData.gender || "", 
      formData.dateOfBirth || "", 
      formData.placeOfBirth || "", 
      formData.address || "", 
      formData.education || "", 
      formData.civilStatus || "", 
      formData.occupation || "", 
      formData.religion || "", 
      formData.company || "", 
      formData.income || "", 
      formData.employmentStatus || "", 
      formData.contactNumber || "", 
      formData.email || "", 
      formData.pantawidBeneficiary || "",
      formData.indigenous || "", 
      codeId
    ]);

    // Step 2: Children
    if (formData.children && formData.children.length > 0) {
      console.log("Processing children:", JSON.stringify(formData.children, null, 2));
      for (const child of formData.children) {
        await queryDatabase(
          'INSERT INTO user_details_step2 (user_id, first_name, middle_name, last_name, birthdate, age, educational_attainment, code_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId, 
            child.firstName || "", 
            child.middleName || "", 
            child.lastName || "", 
            child.birthdate || "", 
            child.age || "", 
            child.educationalAttainment || "", 
            codeId
          ]
        );
      }
    }

    // Step 3: Classification
    console.log("Classification value:", formData.Classification);
    await queryDatabase(
      'INSERT INTO user_details_step3 (user_id, classification, code_id) VALUES (?, ?, ?)',
      [userId, formData.Classification || "", codeId]
    );

    // Step 4: Needs/Problems
    await queryDatabase(
      'INSERT INTO user_details_step4 (user_id, needs_problems, code_id) VALUES (?, ?, ?)',
      [userId, formData.needsProblems || "", codeId]
    );

    // Step 5: Emergency Contact
    await queryDatabase(
      'INSERT INTO user_details_step5 (user_id, emergency_name, emergency_address, emergency_relationship, emergency_contact, code_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userId,
        formData.emergencyContact?.emergencyName || "",
        formData.emergencyContact?.emergencyAddress || "",
        formData.emergencyContact?.emergencyRelationship || "",
        formData.emergencyContact?.emergencyContact || "",
        codeId
      ]
    );

    await queryDatabase('COMMIT');
    res.status(201).json({ message: 'Form submitted successfully. Your verification is now pending.', codeId });

  } catch (err) {
    await queryDatabase('ROLLBACK');
    console.error('Error saving form data:', err);
    res.status(500).json({ error: 'Error saving form data: ' + err.message });
  }
});

// Debug endpoint to check user_details_step2 relationships
app.get('/debug/user-children', async (req, res) => {
  try {
    const results = await queryDatabase(`
      SELECT 
        u.id as user_id,
        u.name as parent_name,
        u.email as parent_email,
        s2.first_name,
        s2.middle_name,
        s2.last_name,
        s2.birthdate,
        s2.age,
        s2.educational_attainment
      FROM users u
      LEFT JOIN user_details_step2 s2 ON u.id = s2.user_id
      ORDER BY u.id, s2.first_name
    `);
    
    // Group children by parent
    const userChildren = {};
    results.forEach(row => {
      if (!userChildren[row.user_id]) {
        userChildren[row.user_id] = {
          parent_name: row.parent_name,
          parent_email: row.parent_email,
          children: []
        };
      }
      if (row.first_name) { // Only add if there's actually a child
        userChildren[row.user_id].children.push({
          first_name: row.first_name,
          middle_name: row.middle_name,
          last_name: row.last_name,
          birthdate: row.birthdate,
          age: row.age,
          educational_attainment: row.educational_attainment
        });
      }
    });
    
    res.status(200).json(userChildren);
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: 'Error fetching user-children relationships' });
  }
});

app.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const accepted = await queryDatabase(
      'SELECT accepted_at, COALESCE(is_read, 0) AS is_read, message FROM accepted_users WHERE user_id = ?', 
      [userId]
    );
    
    const declined = await queryDatabase(
      'SELECT declined_at, remarks, COALESCE(is_read, 0) AS is_read FROM declined_users WHERE user_id = ?', 
      [userId]
    );
    

    let notifications = [];

    if (accepted.length > 0) {
      notifications.push({
        id: `accepted-${userId}`,
        type: 'application_accepted',
        message: accepted[0].message,
        read: accepted[0].is_read,
        created_at: accepted[0].accepted_at,
      });
    }

    if (declined.length > 0) {
      notifications.push({
        id: `declined-${userId}`,
        type: 'application_declined',
        message: `Your application has been declined. Remarks: ${declined[0].remarks}`,
        read: declined[0].is_read,
        created_at: declined[0].declined_at,
      });
    }

    res.status(200).json(Array.isArray(notifications) ? notifications : []); // Ensure an array
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Database error while fetching notifications' });
  }
});

app.put('/notifications/mark-as-read/:userId/:type', async (req, res) => {
  const { userId, type } = req.params;

  try {
    let result = {};

    if (type === 'application_accepted') {
      result = await queryDatabase(
        'UPDATE accepted_users SET is_read = TRUE WHERE user_id = ?',
        [userId]
      );
    } else if (type === 'application_declined') {
      result = await queryDatabase(
        'UPDATE declined_users SET is_read = TRUE WHERE user_id = ?',
        [userId]
      );
    }

    if (result && result.affectedRows !== undefined) {
      console.log("Updated Rows:", result.affectedRows);
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.json({ success: true, message: 'No notifications to update' });
    }
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ error: 'Database error while updating notifications' });
  }
});

app.put('/notifications/mark-all-as-read/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    await queryDatabase(
      'UPDATE accepted_users SET is_read = TRUE WHERE user_id = ?',
      [userId]
    );

    await queryDatabase(
      'UPDATE declined_users SET is_read = TRUE WHERE user_id = ?',
      [userId]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error updating notifications:', err);
    res.status(500).json({ error: 'Database error while updating notifications' });
  }
});

app.listen(8081, () => {
  console.log('Server is running on port 8081');
}); 
