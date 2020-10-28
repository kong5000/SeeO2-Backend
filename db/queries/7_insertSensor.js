const { response } = require("express");

const insertSensor = (db, options) => {
  return db.query(`
  SELECT * FROM users
  WHERE email = $1;
  `, [options.email])
  .then((res) => {
    //Email already exists
    if(res.rows[0]){
      const users_id = res.rows[0].id
      return db.query(`
      INSERT INTO sensors(name, url, latitude, longitude, users_id, safe)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING ${'id'};
      `, [options.name, options.url, options.latitude, options.longitude, res.rows[0].id])
      .then((res)=> {
        return { sensors_id: res.rows[0].id, users_id}
      } );
    } else {
      //New email
      return db.query(`
      INSERT INTO users(email)
      VALUES ($1);
      `, [options.email])
      .then(()=> {

        return db.query(`
        SELECT * FROM users
        WHERE email = $1;
        `, [options.email])
        .then((response) =>{
          const users_id = response.rows[0].id

          return db.query(`
          INSERT INTO sensors(name, url, latitude, longitude, users_id, safe)
          VALUES ($1, $2, $3, $4, $5, true)
          RETURNING ${'id'};
          `, [options.name, options.url, options.latitude, options.longitude, response.rows[0].id])
          .then((res)=> {
            return { sensors_id: res.rows[0].id, users_id}
          } );
        })
      });

    }
  })
};

module.exports = insertSensor;