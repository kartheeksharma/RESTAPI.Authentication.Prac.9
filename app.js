const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//1.Register API
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body; //Destructuring the data from the API call
  const hashedPassword = await bcrypt.hash(password, 10); //Hashing the given password

  const checkUsername = `SELECT * FROM user WHERE username = '${username}'`;
  let userData = await db.get(checkUsername); //Getting the user details from the database
  if (userData === undefined) {
    //checks if user is already registered or not
    //creating new user
    let newUserQuery = `INSERT INTO
                         user (username,name,password,gender,location)
                         VALUES (
                        '${username}',
                        '${name}',
                        '${hashedPassword}',
                        '${gender}',
                        '${location}');`;
    if (password.length < 5) {
      //checking the length of the password
      response.status(400);
      response.send("Password is too short");
    } else {
      let newUserDetails = await db.run(newUserQuery); //Updating new user data to the database
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400); //If the userData is already registered in the database
    response.send("User already exists");
  }
});

//2.Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400); //invalidUser
    response.send("Invalid user");
  } else {
    //comparing password with entered password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//3.change password API
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400); //invalidUser
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      //update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatePassQuery = `UPDATE user 
                                SET password= '${hashedPassword}'
                                WHERE username= '${username}';`;

      if (newPassword.length < 5) {
        //length <5
        response.status(400);
        response.send("Password is too short");
      } else {
        //Updating newPassword to the database
        const updateUserResp = await db.run(updatePassQuery);
        //response.status(200);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
