const { response } = require("express");

const insertAlert = (db, options) => {
  return db.query(`
  SELECT * FROM users
  WHERE email = $1;
  `, [options.email])
  .then((res) => {
    //Email already exists
    if(res.rows[0]){
      db.query(`
      INSERT INTO alerts(sensors_id, users_id)
      VALUES ($1, $2);
      `, [options.sensors_id, res.rows[0].id])
      .then((res)=> {
        console.log(options)
        return res.rows
      } );
    } else {
      //New email
      db.query(`
      INSERT INTO users(email)
      VALUES ($1);
      `, [options.email])
      .then(()=> {

        db.query(`
        SELECT * FROM users
        WHERE email = $1;
        `, [options.email])
        .then((response) =>{

          db.query(`
          INSERT INTO alerts(sensors_id, users_id)
          VALUES ($1, $2);
        `, [options.sensors_id, response.rows[0].id])
          .then((res)=> res.rows );
        })
      });

    }
  })
};

module.exports = insertAlert;