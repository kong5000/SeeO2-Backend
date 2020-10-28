const updateSensorInfo = (db, options) => {
  let queryOptions = [];
  let queryString = `
  UPDATE sensors
  SET`;

  if(options.name){
    queryOptions.push(options.name)
    queryString += `
    name = $${queryOptions.length},
    `
  }
  if(options.url){
    queryOptions.push(options.url)
    queryString += `
    url = $${queryOptions.length},
    `
  }
  if(options.latitude){
    queryOptions.push(options.latitude)
    queryString += `
    latitude = $${queryOptions.length},
    `
  }
  if(options.longitude){
    queryOptions.push(options.longitude)
    queryString += `
    longitude = $${queryOptions.length},
    `
  }

  queryString = queryString.slice(0, queryString.length-6)

  queryOptions.push(options.id)
  queryString += `
  WHERE sensors.id = $${queryOptions.length}
  `

  return db.query(queryString, queryOptions)
  .then((res) => res.rows)
};

module.exports = updateSensorInfo;