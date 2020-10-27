const { response } = require("express");

const insertSensor = (db, options) => {
  return db.query(`
  SELECT * FROM users
  WHERE email = $1;
  `, [options.email])
  .then((res) => {
    //Email already exists
    if(res.rows[0]){
      db.query(`
      INSERT INTO sensors(name, url, latitude, longitude, users_id, safe)
      VALUES ($1, $2, $3, $4, $5, true);
      `, [options.name, options.url, options.latitude, options.longitude, res.rows[0].id])
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
          INSERT INTO sensors(name, url, latitude, longitude, users_id, safe)
          VALUES ($1, $2, $3, $4, $5, true);
          `, [options.name, options.url, options.latitude, options.longitude, res.rows[0].id])
          .then((res)=> res.rows );
        })
      });

    }
  })
};

module.exports = insertSensor;