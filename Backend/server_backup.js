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
  const { email, password, name, role, status } = req.body;
  try {
    await queryDatabase('INSERT INTO users (email, password, name, role, status) VALUES (?, ?, ?, ?, ?)', 
      [email, password, name, role, status]);
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error inserting user into database' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const results = await queryDatabase('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (results.length > 0) {
      res.status(200).json({ user: results[0] }); 
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/getUserDetails', async (req, res) => {
  const { userId } = req.body;
  try {
    const results = await queryDatabase('SELECT * FROM users WHERE id = ?', [userId]);
    if (results.length > 0) {
      res.status(200).json(results[0]); 
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
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

// Handle final form submission with transaction support
app.post('/submitAllSteps', async (req, res) => {
  const { userId, formData } = req.body;
  console.log("Received form data:", JSON.stringify(formData, null, 2));

  try {
    // Generate unique code ID
    const createDate = new Date();
    const year = createDate.getFullYear();
    const month = (createDate.getMonth() + 1).toString().padStart(2, '0');
    const newId = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const codeId = `${year}-${month}-${newId}`;

    await queryDatabase('START TRANSACTION');

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
    res.status(201).json({ message: 'All form data saved successfully', codeId });

  } catch (err) {
    await queryDatabase('ROLLBACK');
    console.error('Error saving form data:', err);
    res.status(500).json({ error: 'Error saving form data: ' + err.message });
  }
});

app.listen(8081, () => {
  console.log('Server is running on port 8081');
});
